import db from '../db.js';
import { deleteDocumentsForAccident } from './file.service.js';

function formatDocs(docsForAcc: Array<Record<string, unknown>>) {
  const docsRecord: Record<string, unknown> = {};
  for (const d of docsForAcc) {
    docsRecord[d.docKey as string] = {
      uploaded: true,
      fileName: d.fileName,
      fileId: String(d.id),
      mimeType: d.mimeType,
      size: d.size,
    };
  }
  return docsRecord;
}

function emptyDocs() {
  return {
    accidentReport: { uploaded: false, fileName: null, fileId: null },
    accidentPhoto: { uploaded: false, fileName: null, fileId: null },
    accidentDocs: { uploaded: false, fileName: null, fileId: null },
    caarCashReport: { uploaded: false, fileName: null, fileId: null },
    expertiseReport: { uploaded: false, fileName: null, fileId: null },
    workRequest: { uploaded: false, fileName: null, fileId: null },
  };
}

export function buildAccMap() {
  const accidents = db.prepare('SELECT * FROM accidents').all() as Array<{
    id: number;
    vehicleCode: string;
    isCurrent: number;
    dateAccident: string | null;
    raisonDegat: string | null;
    note: string | null;
    archivedAt: string | null;
  }>;

  const documents = db.prepare('SELECT * FROM documents').all() as Array<Record<string, unknown>>;

  const accMap: Record<string, unknown> = {};

  for (const acc of accidents) {
    if (!accMap[acc.vehicleCode]) {
      accMap[acc.vehicleCode] = { vehicleCode: acc.vehicleCode, current: null, archived: [] };
    }

    const docsForAcc = documents.filter((d) => d.accidentId === acc.id);
    const docsRecord = formatDocs(docsForAcc);

    const formattedAcc = {
      id: acc.id,
      archiveId: String(acc.id),
      dateAccident: acc.dateAccident ?? '',
      raisonDegat: acc.raisonDegat ?? '',
      note: acc.note ?? '',
      docs: docsRecord,
      archivedAt: acc.archivedAt,
    };

    const entry = accMap[acc.vehicleCode] as {
      vehicleCode: string;
      current: unknown;
      archived: unknown[];
    };

    if (acc.isCurrent) {
      entry.current = {
        ...formattedAcc,
        docs: { ...emptyDocs(), ...docsRecord },
      };
    } else {
      entry.archived.push(formattedAcc);
    }
  }

  // Ensure every vehicle has a current accident shell in the map
  const vehicles = db.prepare('SELECT CODE FROM vehicles').all() as Array<{ CODE: string }>;
  for (const v of vehicles) {
    if (!accMap[v.CODE]) {
      accMap[v.CODE] = {
        vehicleCode: v.CODE,
        current: {
          id: null,
          dateAccident: '',
          raisonDegat: '',
          note: '',
          docs: emptyDocs(),
        },
        archived: [],
      };
    } else {
      const entry = accMap[v.CODE] as { current: unknown };
      if (!entry.current) {
        entry.current = {
          id: null,
          dateAccident: '',
          raisonDegat: '',
          note: '',
          docs: emptyDocs(),
        };
      }
    }
  }

  return accMap;
}

export function getOrCreateCurrentAccident(vehicleCode: string): number {
  let current = db
    .prepare('SELECT id FROM accidents WHERE vehicleCode = ? AND isCurrent = 1')
    .get(vehicleCode) as { id: number } | undefined;

  if (!current) {
    const info = db
      .prepare('INSERT INTO accidents (vehicleCode, isCurrent) VALUES (?, 1)')
      .run(vehicleCode);
    return Number(info.lastInsertRowid);
  }
  return current.id;
}

export function upsertCurrentAccident(
  vehicleCode: string,
  data: { dateAccident?: string | null; raisonDegat?: string | null; note?: string | null }
): number {
  const accidentId = getOrCreateCurrentAccident(vehicleCode);
  db.prepare(`
    UPDATE accidents SET dateAccident = ?, raisonDegat = ?, note = ?
    WHERE id = ?
  `).run(data.dateAccident ?? null, data.raisonDegat ?? null, data.note ?? null, accidentId);
  return accidentId;
}

export function archiveCurrentAccident(vehicleCode: string): void {
  const tx = db.transaction(() => {
    const current = db
      .prepare('SELECT id FROM accidents WHERE vehicleCode = ? AND isCurrent = 1')
      .get(vehicleCode) as { id: number } | undefined;

    if (current) {
      db.prepare(`
        UPDATE accidents SET isCurrent = 0, archivedAt = CURRENT_TIMESTAMP WHERE id = ?
      `).run(current.id);
    }

    db.prepare(`
      INSERT INTO accidents (vehicleCode, isCurrent, dateAccident, raisonDegat, note)
      VALUES (?, 1, NULL, NULL, NULL)
    `).run(vehicleCode);
  });
  tx();
}

export function updateArchivedAccident(
  vehicleCode: string,
  archiveId: number,
  data: { dateAccident?: string | null; raisonDegat?: string | null; note?: string | null }
): void {
  const row = db
    .prepare('SELECT id FROM accidents WHERE id = ? AND vehicleCode = ? AND isCurrent = 0')
    .get(archiveId, vehicleCode);
  if (!row) throw new Error('ARCHIVE_NOT_FOUND');

  db.prepare(`
    UPDATE accidents SET dateAccident = ?, raisonDegat = ?, note = ? WHERE id = ?
  `).run(data.dateAccident ?? null, data.raisonDegat ?? null, data.note ?? null, archiveId);
}

export function deleteArchivedAccident(vehicleCode: string, archiveId: number): void {
  const tx = db.transaction(() => {
    const row = db
      .prepare('SELECT id FROM accidents WHERE id = ? AND vehicleCode = ? AND isCurrent = 0')
      .get(archiveId, vehicleCode) as { id: number } | undefined;
    if (!row) throw new Error('ARCHIVE_NOT_FOUND');
    deleteDocumentsForAccident(archiveId);
    db.prepare('DELETE FROM accidents WHERE id = ?').run(archiveId);
  });
  tx();
}

export function restoreArchivedAccident(vehicleCode: string, archiveId: number): void {
  const tx = db.transaction(() => {
    const archive = db
      .prepare('SELECT id FROM accidents WHERE id = ? AND vehicleCode = ? AND isCurrent = 0')
      .get(archiveId, vehicleCode) as { id: number } | undefined;
    if (!archive) throw new Error('ARCHIVE_NOT_FOUND');

    const current = db
      .prepare('SELECT id FROM accidents WHERE vehicleCode = ? AND isCurrent = 1')
      .get(vehicleCode) as { id: number } | undefined;

    if (current) {
      // Move current to archived (if it has any data/docs)
      const hasDocs = db
        .prepare('SELECT count(*) as c FROM documents WHERE accidentId = ?')
        .get(current.id) as { c: number };
      const acc = db
        .prepare('SELECT dateAccident, raisonDegat, note FROM accidents WHERE id = ?')
        .get(current.id) as { dateAccident: string | null; raisonDegat: string | null; note: string | null };

      const isEmpty =
        hasDocs.c === 0 && !acc.dateAccident && !acc.raisonDegat && !acc.note;

      if (isEmpty) {
        deleteDocumentsForAccident(current.id);
        db.prepare('DELETE FROM accidents WHERE id = ?').run(current.id);
      } else {
        db.prepare(`
          UPDATE accidents SET isCurrent = 0, archivedAt = CURRENT_TIMESTAMP WHERE id = ?
        `).run(current.id);
      }
    }

    db.prepare('UPDATE accidents SET isCurrent = 1, archivedAt = NULL WHERE id = ?').run(archiveId);
  });
  tx();
}
