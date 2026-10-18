/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vercel serverless function: POST /api/smartess
 */

import { handleSmartess } from '../server/smartessApi.js';

/** GET /api/smartess → reachability check (no credentials involved) */
export async function GET(): Promise<Response> {
  const result = await handleSmartess({ op: 'diag' });
  return Response.json(result.body, { status: result.status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const result = await handleSmartess(body);
  return Response.json(result.body, { status: result.status, headers: { 'Cache-Control': 'no-store' } });
}
