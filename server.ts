/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Production server (AI Studio / Cloud Run / any Node host):
 * serves the built app from dist/ and the SmartESS API at POST /api/smartess.
 *   npm run build && npm start
 */

import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleSmartess } from './server/smartessApi.js';

const app = express();
const distDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');

app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));

app.post('/api/smartess', async (req, res) => {
  const result = await handleSmartess(req.body);
  res.status(result.status).set('Cache-Control', 'no-store').json(result.body);
});

app.use(express.static(distDir));
app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));

const port = Number(process.env.PORT) || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Shamsak server listening on http://0.0.0.0:${port}`);
});
