import db from '../db.js';

export function logActivity(
  userId: number | null,
  action: string,
  details: string = '',
  ip?: string
): void {
  db.prepare(`
    INSERT INTO activity_log (userId, action, details, ip)
    VALUES (?, ?, ?, ?)
  `).run(userId, action, details, ip ?? null);
}
