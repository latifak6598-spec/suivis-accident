import bcrypt from 'bcrypt';
import db from '../db.js';
import { BCRYPT_ROUNDS, SESSION_MAX_AGE_MS } from '../constants.js';
import { generateToken, hashToken } from '../utils/crypto.js';
import { normalizeUsername } from '../utils/validation.js';
import { logActivity } from './audit.service.js';

export interface SessionUser {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user';
  status: string;
}

export function findUserByUsername(username: string) {
  return db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(username) as
    | {
        id: number;
        username: string;
        firstName: string;
        lastName: string;
        passwordHash: string;
        role: string;
        status: string;
      }
    | undefined;
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, BCRYPT_ROUNDS);
}

export function createSession(
  userId: number,
  userAgent?: string,
  ip?: string
): { token: string; expiresAt: string } {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS).toISOString();

  db.prepare(`
    INSERT INTO sessions (tokenHash, userId, expiresAt, userAgent, ip)
    VALUES (?, ?, ?, ?, ?)
  `).run(tokenHash, userId, expiresAt, userAgent ?? null, ip ?? null);

  db.prepare('UPDATE users SET lastLogin = CURRENT_TIMESTAMP WHERE id = ?').run(userId);
  return { token, expiresAt };
}

export function deleteSessionByToken(token: string): void {
  db.prepare('DELETE FROM sessions WHERE tokenHash = ?').run(hashToken(token));
}

export function deleteAllUserSessions(userId: number): void {
  db.prepare('DELETE FROM sessions WHERE userId = ?').run(userId);
}

export function resolveSession(token: string): SessionUser | null {
  const session = db
    .prepare(`
      SELECT users.id, users.username, users.firstName, users.lastName,
             users.role, users.status, sessions.expiresAt
      FROM sessions
      JOIN users ON sessions.userId = users.id
      WHERE sessions.tokenHash = ?
    `)
    .get(hashToken(token)) as SessionUser & { expiresAt: string } | undefined;

  if (!session) return null;
  if (new Date(session.expiresAt) < new Date()) {
    db.prepare('DELETE FROM sessions WHERE tokenHash = ?').run(hashToken(token));
    return null;
  }

  return {
    id: session.id,
    username: session.username,
    firstName: session.firstName,
    lastName: session.lastName,
    role: session.role as 'admin' | 'user',
    status: session.status,
  };
}

export function registerUser(firstName: string, lastName: string, password: string): string {
  const username = normalizeUsername(lastName, firstName);
  const existing = findUserByUsername(username);
  if (existing) throw new Error('USER_EXISTS');

  const normalizedFirstName =
    firstName.trim().charAt(0).toUpperCase() + firstName.trim().slice(1).toLowerCase();
  const normalizedLastName = lastName.trim().toUpperCase();
  const hash = hashPassword(password);

  db.prepare(`
    INSERT INTO users (username, firstName, lastName, passwordHash, role, status)
    VALUES (?, ?, ?, ?, 'user', 'pending')
  `).run(username, normalizedFirstName, normalizedLastName, hash);

  return username;
}

export function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string
): void {
  const user = db.prepare('SELECT passwordHash FROM users WHERE id = ?').get(userId) as
    | { passwordHash: string }
    | undefined;
  if (!user || !verifyPassword(currentPassword, user.passwordHash)) {
    throw new Error('INVALID_PASSWORD');
  }
  const hash = hashPassword(newPassword);
  db.prepare('UPDATE users SET passwordHash = ? WHERE id = ?').run(hash, userId);
  deleteAllUserSessions(userId);
}

export function loginUser(
  username: string,
  password: string,
  userAgent?: string,
  ip?: string
): { token: string; user: Omit<SessionUser, 'id' | 'status'> } {
  const user = findUserByUsername(username);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    logActivity(null, 'Échec connexion', `@${username}`, ip);
    throw new Error('INVALID_CREDENTIALS');
  }
  if (user.status === 'blocked') throw new Error('blocked');
  if (user.status === 'pending') throw new Error('pending');

  const { token } = createSession(user.id, userAgent, ip);
  logActivity(user.id, 'Connexion', '', ip);

  return {
    token,
    user: {
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as 'admin' | 'user',
    },
  };
}
