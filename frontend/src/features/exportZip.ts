/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { Vehicle, AccidentData } from '../db/schema';
import { logAction } from './activityLog';
import { getStatus, getMissing, DOCS } from './status';
import { filterVehiclesForExport, sanitizeFolder } from './exportUtils';
import { fetchFileBlob } from './files';

async function buildExportRows(filtered: Vehicle[], accMap: Record<string, AccidentData>) {
  const stLbl: Record<string, string> = { c: 'Classé', i: 'Incomplet', a: "Besoin d'attention" };
  return filtered.map(v => {
    const a = (accMap[v.CODE]?.current || {}) as any;
    const docs = (a.docs || {}) as any;
    return {
      'Code'                : v.CODE || '',
      'Nouveau Code'        : v.NEW_CODE || '',
      'Désignation'         : v.DESIGNATION || '',
      'Marque'              : v.MARQUE || '',
      'Immatricule'         : v.MATRICULE || '',
      'Type'                : v.TYPE || '',
      'Région'              : v.REGION || '',
      'Affectation'         : v.LIBELLE_AFFECTATION || v.AFFECTATION || '',
      'Statut'              : stLbl[getStatus(v.CODE, accMap)],
      'Date accident'       : a.dateAccident || '',
      'Raison dégât'        : a.raisonDegat  || '',
      "Rapport d'accident"  : docs.accidentReport?.uploaded   ? '✓' : '✗',
      "Photo d'accident"    : docs.accidentPhoto?.uploaded     ? '✓' : '✗',
      'Documents accident'  : docs.accidentDocs?.uploaded ? '✓' : '✗',
      'Rapport CAAR/CASH'   : docs.caarCashReport?.uploaded  ? '✓' : '✗',
      "PV d'expertise"      : docs.expertiseReport?.uploaded       ? '✓' : '✗',
      'Demande de travail'  : docs.workRequest?.uploaded     ? '✓' : '✗',
      'Docs manquants'      : getMissing(v.CODE, accMap).join(', '),
      'Note'                : a.note || '',
      'Nb archives'         : (accMap[v.CODE]?.archived || []).length,
    };
  });
}

export async function buildZipForVehicles(
  filtered: Vehicle[],
  accMap: Record<string, AccidentData>,
  opts: { currentOnly: boolean },
  setZipProgress: (pct: number, msg: string) => void
) {
  const zip = new JSZip();
  const total = filtered.length;
  let done = 0;

  setZipProgress(0, `Préparation de ${total} véhicule(s)…`);

  for (const v of filtered) {
    const code = v.CODE;
    const rec = accMap[code];

    const folderName = sanitizeFolder(code + (v.MATRICULE ? '_' + v.MATRICULE : ''));
    const vFolder = zip.folder(folderName);
    if (!vFolder) continue;

    // INFO.txt
    const infoLines = [
      `=== VÉHICULE: ${code} ===`,
      `Immatricule   : ${v.MATRICULE  || '—'}`,
      `Désignation   : ${v.DESIGNATION || '—'}`,
      `Marque        : ${v.MARQUE     || '—'}`,
      `Statut        : ${{ c: 'Classé', i: 'Incomplet', a: "Besoin d'attention" }[getStatus(code, accMap)]}`,
    ];

    if (rec?.current) {
      infoLines.push('');
      infoLines.push('=== ACCIDENT EN COURS ===');
      infoLines.push(`Date   : ${rec.current.dateAccident || '—'}`);
      infoLines.push(`Raison : ${rec.current.raisonDegat  || '—'}`);
      infoLines.push(`Note   : ${rec.current.note         || '—'}`);
      infoLines.push('Documents :');
      for (const d of DOCS) {
        const dd = rec.current.docs?.[d.key];
        infoLines.push(`  ${d.label}: ${dd?.uploaded ? '✓ ' + dd.fileName : '✗'}`);
      }
    }

    const missing = getMissing(code, accMap);
    if (missing.length) {
      missing.forEach(m => infoLines.push(`MANQUANT: ${m}`));
    }

    vFolder.file('INFO.txt', infoLines.join('\n'));

    // accident_actuel/ folder
    if (rec?.current) {
      const accFolder = vFolder.folder('accident_actuel');
      if (accFolder) {
        for (const d of DOCS) {
          const dd = rec.current.docs?.[d.key];
          if (dd?.uploaded && dd.fileId) {
            try {
              const blob = await fetchFileBlob(dd.fileId);
              const arrayBuffer = await blob.arrayBuffer();
              const filename = dd.fileName || `${d.label} - ${code}`;
              accFolder.file(filename, arrayBuffer);
            } catch (e) {}
          }
        }
      }
    }

    // archive_N_DATE/ folders
    if (!opts.currentOnly && rec?.archived?.length) {
      for (let i = 0; i < rec.archived.length; i++) {
        const ar = rec.archived[i];
        const arcFolderName = `archive_${i + 1}_${ar.dateAccident || ar.archivedAt || 'inconnu'}`;
        const arcFolder = vFolder.folder(arcFolderName);
        if (!arcFolder) continue;

        arcFolder.file('info.txt', [
          `Date accident  : ${ar.dateAccident || '—'}`,
          `Date archivage : ${ar.archivedAt   || '—'}`,
          `Raison         : ${ar.raisonDegat  || '—'}`,
          `Note           : ${ar.note         || '—'}`,
        ].join('\n'));

        for (const d of DOCS) {
          const dd = ar.docs?.[d.key];
          if (dd?.uploaded && dd.fileId) {
            try {
              const blob = await fetchFileBlob(dd.fileId);
              const arrayBuffer = await blob.arrayBuffer();
              const filename = dd.fileName || `${d.label} - ${code}`;
              arcFolder.file(filename, arrayBuffer);
            } catch (e) {}
          }
        }
      }
    }

    done++;
    setZipProgress(Math.round(done / total * 85), `${done}/${total} — ${code}`);
    await new Promise(r => setTimeout(r, 0));
  }

  return zip;
}

export async function doGlobalZip(
  vehicles: Vehicle[],
  accMap: Record<string, AccidentData>,
  options: {
    incC: boolean;
    incI: boolean;
    incA: boolean;
    dfrom: string;
    dto: string;
    currentOnly: boolean;
    includeExcelInside: boolean;
  },
  setZipProgress: (pct: number, msg: string) => void
) {
  const filtered = filterVehiclesForExport(
    vehicles,
    accMap,
    options.incC,
    options.incI,
    options.incA,
    options.dfrom,
    options.dto,
    '',
    ''
  );

  if (!filtered.length) {
    return 0;
  }

  try {
    const zip = await buildZipForVehicles(filtered, accMap, { currentOnly: options.currentOnly }, setZipProgress);

    if (options.includeExcelInside) {
      setZipProgress(86, 'Génération résumé Excel…');
      await new Promise(r => setTimeout(r, 0));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(await buildExportRows(filtered, accMap)),
        'Suivi Accidents'
      );
      const xlsxBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      zip.file('RECAP_' + new Date().toISOString().split('T')[0] + '.xlsx', xlsxBuffer);
    }

    setZipProgress(90, 'Export base de données SQLite…');
    await new Promise(r => setTimeout(r, 0));
    try {
      const dbRes = await fetch('/api/export/database', { credentials: 'include' });
      if (dbRes.ok) {
        const dbBuffer = await dbRes.arrayBuffer();
        const dateStr = new Date().toISOString().split('T')[0];
        zip.file(`suivi_accidents_${dateStr}.db`, dbBuffer);
        zip.file(
          'README_EXPORT.txt',
          [
            '=== EXPORT COMPLET SUIVI ACCIDENTS ===',
            `Date: ${new Date().toLocaleString('fr-FR')}`,
            '',
            'Contenu:',
            '- suivi_accidents_*.db : base SQLite complète (véhicules, accidents, utilisateurs, métadonnées)',
            '- Dossiers par véhicule : documents déchiffrés exportés',
            '- RECAP_*.xlsx : résumé Excel (si inclus)',
            '',
            'Les fichiers originaux sur le serveur restent chiffrés.',
          ].join('\n')
        );
      }
    } catch (e) {
      console.warn('DB export skipped', e);
    }

    setZipProgress(93, 'Compression…');
    await new Promise(r => setTimeout(r, 0));

    const blob = await zip.generateAsync(
      { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
      meta => setZipProgress(93 + Math.round(meta.percent * 0.07), 'Compression…')
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `suivi_accidents_ZIP_${new Date().toISOString().split('T')[0]}.zip`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);

    await logAction('Export ZIP global', `${filtered.length} véhicule(s)`);
    return filtered.length;
  } catch (err) {
    console.error('ZIP error:', err);
    throw err;
  }
}

export async function doVehicleZip(
  v: Vehicle,
  accMap: Record<string, AccidentData>,
  setZipProgress: (pct: number, msg: string) => void
) {
  try {
    const zip = await buildZipForVehicles([v], accMap, { currentOnly: false }, setZipProgress);

    setZipProgress(90, 'Compression…');
    await new Promise(r => setTimeout(r, 0));

    const blob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accident_${sanitizeFolder(v.CODE)}_${new Date().toISOString().split('T')[0]}.zip`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);

    await logAction('Export ZIP véhicule', `Code: ${v.CODE}`);
  } catch (err) {
    console.error('ZIP error:', err);
    throw err;
  }
}
