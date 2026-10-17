/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Serves POST /api/smartess from the Vite dev and preview servers,
 * so `npm run dev` works without a separate backend.
 */

import type { Connect, Plugin } from 'vite';
import { handleSmartess } from './smartessApi.js';

function readJson(req: Connect.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 64 * 1024) reject(new Error('Body too large'));
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

const middleware: Connect.NextHandleFunction = async (req, res, next) => {
  if (req.url?.split('?')[0] !== '/api/smartess') return next();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }
  try {
    const result = await handleSmartess(await readJson(req));
    res.statusCode = result.status;
    res.end(JSON.stringify(result.body));
  } catch {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'Invalid JSON body' }));
  }
};

export function smartessApiPlugin(): Plugin {
  return {
    name: 'smartess-api',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
