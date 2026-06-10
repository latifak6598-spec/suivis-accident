import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { BCRYPT_ROUNDS, DEFAULT_EXPIRY_DAYS, PROTECTED_ADMIN_USERNAME } from './constants.js';
import { ensureDataDirs, DB_PATH } from './utils/paths.js';

dotenv.config();
ensureDataDirs();

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL COLLATE NOCASE,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    passwordHash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('approved', 'pending', 'blocked')),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    lastLogin DATETIME
  );

  CREATE TABLE IF NOT EXISTS sessions (
    tokenHash TEXT PRIMARY KEY,
    userId INTEGER NOT NULL,
    expiresAt DATETIME NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    userAgent TEXT,
    ip TEXT,
    FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS vehicles (
    CODE TEXT PRIMARY KEY,
    NEW_CODE TEXT,
    DESIGNATION TEXT,
    MARQUE TEXT,
    MATRICULE TEXT,
    CAPACITE TEXT,
    CAPACITE_INDIVIDUELLE TEXT,
    TYPE TEXT,
    REGION TEXT,
    NUM_SERIE TEXT,
    ETAT TEXT,
    AFFECTATION TEXT,
    LIBELLE_AFFECTATION TEXT,
    DATE_AFFECTATION TEXT,
    DATE_ACHAT TEXT,
    AGE_ANNEE_ TEXT,
    AGE_MOIS_ TEXT,
    PRIX_ACHAT TEXT,
    DUREE_VIE TEXT
  );

  CREATE TABLE IF NOT EXISTS accidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicleCode TEXT NOT NULL,
    isCurrent INTEGER NOT NULL DEFAULT 1 CHECK(isCurrent IN (0, 1)),
    dateAccident TEXT,
    raisonDegat TEXT,
    note TEXT,
    archivedAt TEXT,
    FOREIGN KEY(vehicleCode) REFERENCES vehicles(CODE) ON DELETE CASCADE
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_accidents_current
    ON accidents(vehicleCode) WHERE isCurrent = 1;

  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    accidentId INTEGER NOT NULL,
    docKey TEXT NOT NULL,
    fileName TEXT NOT NULL,
    storedName TEXT NOT NULL,
    mimeType TEXT NOT NULL,
    size INTEGER NOT NULL DEFAULT 0,
    uploadedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(accidentId) REFERENCES accidents(id) ON DELETE CASCADE,
    UNIQUE(accidentId, docKey)
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    action TEXT NOT NULL,
    details TEXT,
    ip TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(userId) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

function seedAdmin(): void {
  const adminCount = db
    .prepare("SELECT count(*) as count FROM users WHERE role = 'admin'")
    .get() as { count: number };

  if (adminCount.count > 0) return;

  const defaultPassword = process.env.ADMIN_PASSWORD;
  if (!defaultPassword || defaultPassword.length < 8) {
    throw new Error(
      'ADMIN_PASSWORD must be set in .env (min 8 chars) before first run to create the admin account.'
    );
  }

  const hash = bcrypt.hashSync(defaultPassword, BCRYPT_ROUNDS);
  db.prepare(`
    INSERT INTO users (username, firstName, lastName, passwordHash, role, status)
    VALUES (?, ?, ?, ?, 'admin', 'approved')
  `).run(PROTECTED_ADMIN_USERNAME, 'Abdallah', 'AMROUS', hash);

  console.log(`✅ Admin created: "${PROTECTED_ADMIN_USERNAME}"`);
}

function seedExpiry(): void {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'app_expiry_date'").get();
  if (row) return;

  const expiry = new Date();
  expiry.setDate(expiry.getDate() + DEFAULT_EXPIRY_DAYS);
  const iso = expiry.toISOString().split('T')[0];
  db.prepare("INSERT INTO settings (key, value) VALUES ('app_expiry_date', ?)").run(iso);
}

export function purgeExpiredSessions(): number {
  const result = db.prepare("DELETE FROM sessions WHERE expiresAt < datetime('now')").run();
  return result.changes;
}

seedAdmin();
seedExpiry();
purgeExpiredSessions();

export default db;
