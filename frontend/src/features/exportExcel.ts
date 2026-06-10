/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { Vehicle, AccidentData } from '../db/schema';
import { logAction } from './activityLog';
import { getStatus, getMissing, DOCS } from './status';
import { filterVehiclesForExport } from './exportUtils';

function buildExportRows(filtered: Vehicle[], accMap: Record<string, AccidentData>) {
  const stLbl: Record<string, string> = { c: 'Classé', i: 'Incomplet', a: "Besoin d'attention" };
  return filtered.map(v => {
    const a = (accMap[v.CODE]?.current || {}) as any;
    const docs = (a.docs || {}) as any;
    
    // Mapping existing keys to user's labels
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

export async function doExcelExport(
  vehicles: Vehicle[],
  accMap: Record<string, AccidentData>,
  options: {
    incC: boolean;
    incI: boolean;
    incA: boolean;
    dfrom: string;
    dto: string;
    mon: string;
    yr: string;
    includeArchives: boolean;
  }
) {
  const filtered = filterVehiclesForExport(
    vehicles,
    accMap,
    options.incC,
    options.incI,
    options.incA,
    options.dfrom,
    options.dto,
    options.mon,
    options.yr
  );

  if (!filtered.length) {
    return 0; // Signal to toast
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(buildExportRows(filtered, accMap));

  ws['!cols'] = [
    { wch: 12 }, // Code
    { wch: 13 }, // Nouveau Code
    { wch: 26 }, // Désignation
    { wch: 14 }, // Marque
    { wch: 16 }, // Immatricule
    { wch: 11 }, // Type
    { wch: 11 }, // Région
    { wch: 22 }, // Affectation
    { wch: 16 }, // Statut
    { wch: 14 }, // Date accident
    { wch: 26 }, // Raison dégât
    { wch: 18 }, // Rapport d'accident
    { wch: 18 }, // Photo d'accident
    { wch: 20 }, // Documents accident
    { wch: 18 }, // Rapport CAAR/CASH
    { wch: 14 }, // PV d'expertise
    { wch: 18 }, // Demande de travail
    { wch: 30 }, // Docs manquants
    { wch: 24 }, // Note
    { wch: 10 }, // Nb archives
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Suivi Accidents');

  // Optional archive sheets
  if (options.includeArchives) {
    for (const v of filtered) {
      const arcs = accMap[v.CODE]?.archived || [];
      if (!arcs.length) continue;

      const arcRows = arcs.map((ar, i) => ({
        'Archive #'      : i + 1,
        'Date archivage' : ar.archivedAt  || '',
        'Date accident'  : ar.dateAccident || '',
        'Raison'         : ar.raisonDegat  || '',
        'Note'           : ar.note         || '',
        'Rapport'  : ar.docs?.accidentReport?.uploaded   ? '✓' : '✗',
        'Photo'    : ar.docs?.accidentPhoto?.uploaded     ? '✓' : '✗',
        'Docs'     : ar.docs?.accidentDocs?.uploaded ? '✓' : '✗',
        'CAAR'     : ar.docs?.caarCashReport?.uploaded  ? '✓' : '✗',
        'PV'       : ar.docs?.expertiseReport?.uploaded       ? '✓' : '✗',
        'DT'       : ar.docs?.workRequest?.uploaded     ? '✓' : '✗',
      }));

      const sheetName = ('Arch_' + (v.CODE || ''))
        .replace(/[\\\/\?\*\[\]:]/g, '_')
        .substring(0, 31);

      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(arcRows), sheetName);
    }
  }

  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `suivi_accidents_${dateStr}.xlsx`);
  
  await logAction('Export Excel', `${filtered.length} véhicule(s)`);
  
  return filtered.length;
}
