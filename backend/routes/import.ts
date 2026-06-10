import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { requireAuth, AuthRequest, getClientIp } from '../middleware/auth.js';
import { requireAppNotExpired } from '../middleware/expiry.js';
import { importVehiclesFromSqliteFile } from '../services/import.service.js';
import { buildAccMap } from '../services/accident.service.js';
import { getAllVehicles } from '../services/vehicle.service.js';
import { logActivity } from '../services/audit.service.js';

const router = express.Router();
const upload = multer({
  dest: path.join(os.tmpdir(), 'suivi-import'),
  limits: { fileSize: 100 * 1024 * 1024 },
});

router.use(requireAuth, requireAppNotExpired);

router.post('/vehicles', upload.single('file'), (req: AuthRequest, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const result = importVehiclesFromSqliteFile(req.file.path);
    logActivity(
      req.user!.id,
      'Import base de données',
      `${req.file.originalname}: ${result.added + result.updated} véhicules`,
      getClientIp(req)
    );
    res.json({
      success: true,
      ...result,
      vehicles: getAllVehicles(),
      accMap: buildAccMap(),
    });
  } catch (err: unknown) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    const msg = err instanceof Error ? err.message : 'Import failed';
    res.status(400).json({ error: msg });
  }
});

export default router;
