import express from 'express';
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
} from '../utils/validation.js';
import { SESSION_MAX_AGE_MS } from '../constants.js';
import { requireAuth, AuthRequest, getClientIp } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimit.js';
import {
  changePassword,
  createSession,
  deleteSessionByToken,
  loginUser,
  registerUser,
  findUserByUsername,
} from '../services/auth.service.js';
import { getAppExpiryDate } from '../services/settings.service.js';
import { logActivity } from '../services/audit.service.js';

const router = express.Router();

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: SESSION_MAX_AGE_MS,
  path: '/api',
};

router.post('/login', authRateLimiter, (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid credentials format' });
  }

  try {
    const result = loginUser(
      parsed.data.username,
      parsed.data.password,
      req.headers['user-agent'],
      getClientIp(req)
    );
    res.cookie('session_token', result.token, COOKIE_OPTS);
    res.json({ user: result.user, appExpiryDate: getAppExpiryDate() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'INVALID_CREDENTIALS';
    if (message === 'blocked' || message === 'pending') {
      return res.status(403).json({ error: message });
    }
    return res.status(401).json({ error: 'Invalid credentials' });
  }
});

router.post('/register', authRateLimiter, (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid registration data' });
  }

  try {
    const username = registerUser(
      parsed.data.firstName,
      parsed.data.lastName,
      parsed.data.password
    );
    logActivity(null, 'Inscription', `@${username}`, getClientIp(req));
    res.json({ message: 'Account created, pending approval' });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'USER_EXISTS') {
      return res.status(400).json({ error: 'User exists' });
    }
    return res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/logout', requireAuth, (req: AuthRequest, res) => {
  const token = req.cookies?.session_token;
  if (token) deleteSessionByToken(token);
  if (req.user) {
    logActivity(req.user.id, 'Déconnexion', '', getClientIp(req));
  }
  res.clearCookie('session_token', COOKIE_OPTS);
  res.json({ success: true });
});

router.get('/me', requireAuth, (req: AuthRequest, res) => {
  const user = findUserByUsername(req.user!.username);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  res.json({
    user: {
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
    },
    appExpiryDate: getAppExpiryDate(),
  });
});

router.post('/change-password', requireAuth, (req: AuthRequest, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid password data' });
  }

  try {
    changePassword(req.user!.id, parsed.data.currentPassword, parsed.data.newPassword);
    const { token } = createSession(
      req.user!.id,
      req.headers['user-agent'],
      getClientIp(req)
    );
    res.cookie('session_token', token, COOKIE_OPTS);
    logActivity(req.user!.id, 'Changement mot de passe', '', getClientIp(req));
    res.json({ success: true });
  } catch {
    return res.status(400).json({ error: 'Invalid current password' });
  }
});

export default router;
