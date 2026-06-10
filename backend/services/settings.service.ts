import db from '../db.js';

export function getSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, value);
}

export function getAppExpiryDate(): string {
  return getSetting('app_expiry_date') ?? '2099-12-31';
}

export function isAppExpired(): boolean {
  const expiry = getAppExpiryDate();
  const today = new Date().toISOString().split('T')[0];
  return today > expiry;
}

export function setAppExpiryDate(date: string): void {
  setSetting('app_expiry_date', date);
}
