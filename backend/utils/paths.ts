import path from 'path';
import fs from 'fs';

export const DATA_DIR = path.join(__dirname, '..', 'data');
export const DB_PATH = path.join(DATA_DIR, 'data.db');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploaded_files');
export const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
export const KEY_PATH = path.join(DATA_DIR, '.app-key');

export function ensureDataDirs(): void {
  for (const dir of [DATA_DIR, UPLOADS_DIR, BACKUPS_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
