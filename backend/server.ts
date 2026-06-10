import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { purgeExpiredSessions } from './db.js';
import { apiRateLimiter } from './middleware/rateLimit.js';
import authRoutes from './routes/auth.js';
import vehicleRoutes from './routes/vehicles.js';
import fileRoutes from './routes/files.js';
import userRoutes from './routes/users.js';
import logRoutes from './routes/logs.js';
import settingsRoutes from './routes/settings.js';
import importRoutes from './routes/import.js';
import exportRoutes from './routes/export.js';

const app = express();
const port = Number(process.env.PORT) || 4000;

const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000').split(',');

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use('/api', apiRateLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/users', userRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/import', importRoutes);
app.use('/api/export', exportRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

setInterval(() => {
  const removed = purgeExpiredSessions();
  if (removed > 0) console.log(`Purged ${removed} expired session(s)`);
}, 60 * 60 * 1000);

app.listen(port, () => {
  console.log(`🚀 Backend running on http://localhost:${port}`);
});
