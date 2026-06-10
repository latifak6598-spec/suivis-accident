import fs from 'fs';
import path from 'path';
import db from '../db.js';
import { UPLOADS_DIR } from '../utils/paths.js';
import { createEncryptedBackup } from './backup.service.js';

export function resetApplicationData(adminPassword: string): void {
  createEncryptedBackup(adminPassword);

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM documents').run();
    db.prepare('DELETE FROM accidents').run();
    db.prepare('DELETE FROM vehicles').run();
    db.prepare('DELETE FROM activity_log').run();
  });
  tx();

  if (fs.existsSync(UPLOADS_DIR)) {
    for (const file of fs.readdirSync(UPLOADS_DIR)) {
      fs.unlinkSync(path.join(UPLOADS_DIR, file));
    }
  }
}
