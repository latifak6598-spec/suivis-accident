import express from 'express';
import { requireAuth, requireAdmin, AuthRequest, getClientIp } from '../middleware/auth.js';
import { statusSchema } from '../utils/validation.js';
import {
  deleteUser,
  listUsers,
  resetUserPassword,
  updateUserStatus,
} from '../services/user.service.js';
import { logActivity } from '../services/audit.service.js';

const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get('/', (_req, res) => {
  res.json(listUsers());
});

router.patch('/:id/status', (req: AuthRequest, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id' });

  try {
    updateUserStatus(id, parsed.data.status);
    logActivity(
      req.user!.id,
      parsed.data.status === 'approved' ? 'Approbation utilisateur' : 'Blocage utilisateur',
      `userId=${id}`,
      getClientIp(req)
    );
    res.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'PROTECTED_USER') return res.status(403).json({ error: 'Protected user' });
    if (msg === 'USER_NOT_FOUND') return res.status(404).json({ error: 'User not found' });
    return res.status(500).json({ error: 'Update failed' });
  }
});

router.post('/:id/reset-password', (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id' });

  try {
    const tempPassword = resetUserPassword(id);
    logActivity(req.user!.id, 'Réinitialisation mot de passe', `userId=${id}`, getClientIp(req));
    res.json({ tempPassword });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'USER_NOT_FOUND') return res.status(404).json({ error: 'User not found' });
    return res.status(500).json({ error: 'Reset failed' });
  }
});

router.delete('/:id', (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id' });

  try {
    deleteUser(id);
    logActivity(req.user!.id, 'Suppression utilisateur', `userId=${id}`, getClientIp(req));
    res.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'PROTECTED_USER') return res.status(403).json({ error: 'Protected user' });
    if (msg === 'USER_NOT_FOUND') return res.status(404).json({ error: 'User not found' });
    return res.status(500).json({ error: 'Delete failed' });
  }
});

export default router;
