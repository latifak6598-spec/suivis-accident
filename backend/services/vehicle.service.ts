import db from '../db.js';

export function getAllVehicles() {
  return db.prepare('SELECT * FROM vehicles ORDER BY CODE').all();
}

export function upsertVehicle(vehicle: Record<string, unknown>): void {
  if (!vehicle.CODE || typeof vehicle.CODE !== 'string') {
    throw new Error('Missing CODE');
  }

  const allowed = new Set([
    'CODE', 'NEW_CODE', 'DESIGNATION', 'MARQUE', 'MATRICULE', 'CAPACITE',
    'CAPACITE_INDIVIDUELLE', 'TYPE', 'REGION', 'NUM_SERIE', 'ETAT',
    'AFFECTATION', 'LIBELLE_AFFECTATION', 'DATE_AFFECTATION', 'DATE_ACHAT',
    'AGE_ANNEE_', 'AGE_MOIS_', 'PRIX_ACHAT', 'DUREE_VIE',
  ]);

  const filtered: Record<string, string> = { CODE: String(vehicle.CODE) };
  for (const [key, val] of Object.entries(vehicle)) {
    if (allowed.has(key) && val != null) {
      filtered[key] = String(val);
    }
  }

  const columns = Object.keys(filtered);
  const placeholders = columns.map(() => '?').join(',');
  const values = Object.values(filtered);

  db.prepare(`
    INSERT INTO vehicles (${columns.join(',')}) VALUES (${placeholders})
    ON CONFLICT(CODE) DO UPDATE SET ${columns.filter(c => c !== 'CODE').map(c => `${c}=excluded.${c}`).join(',')}
  `).run(...values);
}

export function normalizeVehicleCode(code: string): string {
  const s = String(code).trim();
  if (/^\d+$/.test(s) && s.length < 7) return s.padStart(7, '0');
  return s;
}
