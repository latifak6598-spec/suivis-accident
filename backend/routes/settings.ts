import express from 'express';
import { requireAuth, requireAdmin, AuthRequest, getClientIp } from '../middleware/auth.js';
import { expirySchema, resetDbSchema } from '../utils/validation.js';
import { getAppExpiryDate, setAppExpiryDate } from '../services/settings.service.js';
import { resetApplicationData } from '../services/reset.service.js';
import { findUserByUsername, verifyPassword } from '../services/auth.service.js';
import { logActivity } from '../services/audit.service.js';
import {
  createEncryptedBackup,
  deleteBackup,
  listBackups,
  restoreFromEncryptedBackup,
} from '../services/backup.service.js';

const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get('/', (_req, res) => {
  res.json({ appExpiryDate: getAppExpiryDate() });
});

router.patch('/expiry', (req: AuthRequest, res) => {
  const parsed = expirySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid date' });

  setAppExpiryDate(parsed.data.expiryDate);
  logActivity(req.user!.id, 'Mise à jour expiration', parsed.data.expiryDate, getClientIp(req));
  res.json({ success: true, appExpiryDate: parsed.data.expiryDate });
});

router.post('/reset-database', (req: AuthRequest, res) => {
  const parsed = resetDbSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid request' });

  const user = findUserByUsername(req.user!.username);
  if (!user || !verifyPassword(parsed.data.adminPassword, user.passwordHash)) {
    return res.status(403).json({ error: 'Invalid admin password' });
  }

  try {
    resetApplicationData(parsed.data.adminPassword);
    logActivity(req.user!.id, 'Réinitialisation base', 'vehicles/accidents/files', getClientIp(req));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Reset failed' });
  }
});

router.get('/backups', (_req, res) => {
  res.json(listBackups());
});

router.post('/backups', (req: AuthRequest, res) => {
  const parsed = resetDbSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Backup password required' });

  try {
    const backup = createEncryptedBackup(parsed.data.adminPassword);
    logActivity(req.user!.id, 'Sauvegarde chiffrée', backup.filename, getClientIp(req));
    res.json({ success: true, filename: backup.filename });
  } catch {
    res.status(500).json({ error: 'Backup failed' });
  }
});

router.post('/backups/:name/restore', (req: AuthRequest, res) => {
  const parsed = resetDbSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Admin password required' });

  const user = findUserByUsername(req.user!.username);
  if (!user || !verifyPassword(parsed.data.adminPassword, user.passwordHash)) {
    return res.status(403).json({ error: 'Invalid admin password' });
  }

  try {
    restoreFromEncryptedBackup(req.params.name, parsed.data.adminPassword);
    logActivity(req.user!.id, 'Restauration sauvegarde', req.params.name, getClientIp(req));
    res.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Restore failed';
    res.status(400).json({ error: msg });
  }
});

router.delete('/backups/:name', (req: AuthRequest, res) => {
  try {
    deleteBackup(req.params.name);
    logActivity(req.user!.id, 'Suppression sauvegarde', req.params.name, getClientIp(req));
    res.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Delete failed';
    res.status(400).json({ error: msg });
  }
});

export default router;
