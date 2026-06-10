import express from 'express';
import { requireAuth, requireAdmin, AuthRequest, getClientIp } from '../middleware/auth.js';
import { requireAppNotExpired } from '../middleware/expiry.js';
import { accidentCurrentSchema, archiveUpdateSchema } from '../utils/validation.js';
import { getAllVehicles, upsertVehicle } from '../services/vehicle.service.js';
import {
  archiveCurrentAccident,
  buildAccMap,
  deleteArchivedAccident,
  restoreArchivedAccident,
  updateArchivedAccident,
  upsertCurrentAccident,
} from '../services/accident.service.js';
import { logActivity } from '../services/audit.service.js';

const router = express.Router();
router.use(requireAuth, requireAppNotExpired);

router.get('/', (_req, res) => {
  res.json({ vehicles: getAllVehicles(), accMap: buildAccMap() });
});

router.post('/', (req: AuthRequest, res) => {
  try {
    upsertVehicle(req.body);
    logActivity(req.user!.id, 'Mise à jour véhicule', String(req.body.CODE ?? ''), getClientIp(req));
    res.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed';
    res.status(400).json({ error: msg });
  }
});

router.post('/:code/accidents/current', (req: AuthRequest, res) => {
  const parsed = accidentCurrentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid data' });

  try {
    const accidentId = upsertCurrentAccident(req.params.code, parsed.data);
    res.json({ success: true, accidentId });
  } catch {
    res.status(400).json({ error: 'Update failed' });
  }
});

router.post('/:code/accidents/archive', (req: AuthRequest, res) => {
  try {
    archiveCurrentAccident(req.params.code);
    logActivity(
      req.user!.id,
      'Archivage accident',
      `véhicule ${req.params.code}`,
      getClientIp(req)
    );
    res.json({ success: true, accMap: buildAccMap() });
  } catch {
    res.status(400).json({ error: 'Archive failed' });
  }
});

router.patch('/:code/archives/:archiveId', (req: AuthRequest, res) => {
  const parsed = archiveUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid data' });

  const archiveId = Number(req.params.archiveId);
  if (!Number.isInteger(archiveId)) return res.status(400).json({ error: 'Invalid archive id' });

  try {
    updateArchivedAccident(req.params.code, archiveId, parsed.data);
    res.json({ success: true, accMap: buildAccMap() });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'ARCHIVE_NOT_FOUND') return res.status(404).json({ error: 'Archive not found' });
    res.status(400).json({ error: 'Update failed' });
  }
});

router.delete('/:code/archives/:archiveId', requireAdmin, (req: AuthRequest, res) => {
  const archiveId = Number(req.params.archiveId);
  if (!Number.isInteger(archiveId)) return res.status(400).json({ error: 'Invalid archive id' });

  try {
    deleteArchivedAccident(req.params.code, archiveId);
    logActivity(
      req.user!.id,
      'Suppression archive',
      `véhicule ${req.params.code}`,
      getClientIp(req)
    );
    res.json({ success: true, accMap: buildAccMap() });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'ARCHIVE_NOT_FOUND') return res.status(404).json({ error: 'Archive not found' });
    res.status(400).json({ error: 'Delete failed' });
  }
});

router.post('/:code/archives/:archiveId/restore', requireAdmin, (req: AuthRequest, res) => {
  const archiveId = Number(req.params.archiveId);
  if (!Number.isInteger(archiveId)) return res.status(400).json({ error: 'Invalid archive id' });

  try {
    restoreArchivedAccident(req.params.code, archiveId);
    logActivity(
      req.user!.id,
      'Restauration archive',
      `véhicule ${req.params.code}`,
      getClientIp(req)
    );
    res.json({ success: true, accMap: buildAccMap() });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'ARCHIVE_NOT_FOUND') return res.status(404).json({ error: 'Archive not found' });
    res.status(400).json({ error: 'Restore failed' });
  }
});

export default router;
