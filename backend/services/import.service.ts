import Database from 'better-sqlite3';
import fs from 'fs';
import { upsertVehicle, normalizeVehicleCode } from './vehicle.service.js';

export function importVehiclesFromSqliteFile(filePath: string): { added: number; updated: number } {
  const source = new Database(filePath, { readonly: true });

  try {
    const tables = source
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as Array<{ name: string }>;

    let tableName = '';
    for (const t of tables) {
      const cols = source.prepare(`PRAGMA table_info("${t.name}")`).all() as Array<{ name: string }>;
      const upper = cols.map((c) => c.name.toUpperCase());
      if (upper.includes('CODE') || upper.includes('MATRICULE')) {
        tableName = t.name;
        break;
      }
    }

    if (!tableName) throw new Error('No suitable table found');

    const rows = source.prepare(`SELECT * FROM "${tableName}"`).all() as Array<Record<string, unknown>>;
    let added = 0;
    let updated = 0;

    for (const row of rows) {
      const normalized: Record<string, unknown> = {};
      for (const [col, val] of Object.entries(row)) {
        const safeKey = col.replace(/[\s()\/\\-]+/g, '_').replace(/_+$/, '').toUpperCase();
        normalized[safeKey] = val;
      }

      if (!normalized.CODE) continue;
      normalized.CODE = normalizeVehicleCode(String(normalized.CODE));

      try {
        upsertVehicle(normalized);
        added++;
      } catch {
        updated++;
      }
    }

    return { added, updated };
  } finally {
    source.close();
    fs.unlinkSync(filePath);
  }
}
