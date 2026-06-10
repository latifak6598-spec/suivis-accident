import db from '../db.js';
import { PROTECTED_ADMIN_USERNAME } from '../constants.js';
import { generateTempPassword } from '../utils/crypto.js';
import { deleteAllUserSessions, hashPassword } from './auth.service.js';

export function listUsers() {
  return db
    .prepare(`
      SELECT id, username, firstName, lastName, role, status, createdAt, lastLogin
      FROM users ORDER BY username
    `)
    .all();
}

export function updateUserStatus(userId: number, status: 'approved' | 'pending' | 'blocked'): void {
  const user = db.prepare('SELECT username, role FROM users WHERE id = ?').get(userId) as
    | { username: string; role: string }
    | undefined;
  if (!user) throw new Error('USER_NOT_FOUND');
  if (user.username.toUpperCase() === PROTECTED_ADMIN_USERNAME && status !== 'approved') {
    throw new Error('PROTECTED_USER');
  }

  db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, userId);
  if (status === 'blocked') {
    deleteAllUserSessions(userId);
  }
}

export function deleteUser(userId: number): void {
  const user = db.prepare('SELECT username FROM users WHERE id = ?').get(userId) as
    | { username: string }
    | undefined;
  if (!user) throw new Error('USER_NOT_FOUND');
  if (user.username.toUpperCase() === PROTECTED_ADMIN_USERNAME) {
    throw new Error('PROTECTED_USER');
  }
  deleteAllUserSessions(userId);
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
}

export function resetUserPassword(userId: number): string {
  const user = db.prepare('SELECT username FROM users WHERE id = ?').get(userId) as
    | { username: string }
    | undefined;
  if (!user) throw new Error('USER_NOT_FOUND');

  const tempPassword = generateTempPassword();
  const hash = hashPassword(tempPassword);
  db.prepare('UPDATE users SET passwordHash = ? WHERE id = ?').run(hash, userId);
  deleteAllUserSessions(userId);
  return tempPassword;
}
