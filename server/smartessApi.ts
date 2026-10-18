/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Framework-agnostic handler for POST /api/smartess.
 *
 * Two ways to authenticate:
 *  1. Server credentials: SMARTESS_USERNAME / SMARTESS_PASSWORD env vars.
 *     The browser never sees them.
 *  2. Per-user login: the browser posts username + password once (op "login"),
 *     gets back a session token/secret, and sends only that afterwards.
 *     The password is never stored by the server or the browser.
 */

import {
  getSnapshot, listDevices, login, SmartessError, SMARTESS_COMPANY_KEY,
  type SmartessAuth, type SmartessDevice,
} from './smartess.js';

export type SmartessRequest =
  | { op: 'config' }
  | { op: 'diag' }
  | { op: 'login'; usr: string; pwd: string; companyKey?: string }
  | { op: 'devices'; auth?: SmartessAuth }
  | { op: 'status'; auth?: SmartessAuth; device?: SmartessDevice };

export interface HandlerResult {
  status: number;
  body: unknown;
}

const env = (k: string) => (process.env[k] ?? '').trim();

let serverAuth: SmartessAuth | null = null;
let serverDevice: SmartessDevice | null = null;

function hasServerCredentials() {
  return Boolean(env('SMARTESS_USERNAME') && env('SMARTESS_PASSWORD'));
}

async function getServerAuth(force = false): Promise<SmartessAuth> {
  if (!force && serverAuth && Date.now() < serverAuth.expiresAt) return serverAuth;
  serverAuth = await login(
    env('SMARTESS_USERNAME'),
    env('SMARTESS_PASSWORD'),
    env('SMARTESS_COMPANY_KEY') || SMARTESS_COMPANY_KEY,
  );
  return serverAuth;
}

function envDevice(): SmartessDevice | null {
  const pn = env('SMARTESS_PN');
  if (!pn || !env('SMARTESS_SN') || !env('SMARTESS_DEVCODE') || !env('SMARTESS_DEVADDR')) return null;
  return {
    name: pn, pn, sn: env('SMARTESS_SN'), devcode: env('SMARTESS_DEVCODE'), devaddr: env('SMARTESS_DEVADDR'),
    status: 0, statusLabel: '',
  };
}

function isAuth(a: unknown): a is SmartessAuth {
  return !!a && typeof (a as SmartessAuth).token === 'string' && typeof (a as SmartessAuth).secret === 'string';
}

function isDevice(d: unknown): d is SmartessDevice {
  const x = d as SmartessDevice;
  return !!x && ['pn', 'sn', 'devcode', 'devaddr'].every((k) => typeof x[k as keyof SmartessDevice] === 'string');
}

/** Runs fn with the caller's session, or with server credentials (re-logging in once on failure). */
async function withAuth<T>(clientAuth: unknown, fn: (auth: SmartessAuth) => Promise<T>): Promise<T> {
  if (isAuth(clientAuth)) return fn(clientAuth);
  if (!hasServerCredentials()) {
    throw new SmartessError('لم يتم تسجيل الدخول إلى SmartESS', 'NO_AUTH');
  }
  try {
    return await fn(await getServerAuth());
  } catch (err) {
    if (err instanceof SmartessError && err.code === 263) throw err; // logger offline: re-login won't help
    return fn(await getServerAuth(true));
  }
}

export async function handleSmartess(body: unknown): Promise<HandlerResult> {
  const started = Date.now();
  const result = await route(body);
  // One log line per request (no credentials or readings) so failures are visible in the host's logs
  const b = result.body as { error?: string; code?: unknown; snapshot?: { online?: boolean; updatedAt?: string | null } };
  console.log(JSON.stringify({
    smartess: (body as { op?: string })?.op ?? 'unknown',
    status: result.status,
    ms: Date.now() - started,
    ...(b?.error ? { error: b.error, code: b.code } : {}),
    ...(b?.snapshot ? { online: b.snapshot.online, readingAt: b.snapshot.updatedAt } : {}),
  }));
  return result;
}

async function route(body: unknown): Promise<HandlerResult> {
  const req = (body ?? {}) as SmartessRequest;
  try {
    switch (req.op) {
      case 'config':
        return { status: 200, body: { serverCredentials: hasServerCredentials() } };

      case 'diag': {
        // Reachability check: log in with a user that doesn't exist; SmartESS must answer "user not found"
        try {
          await login('shamsak-reachability-probe', 'x');
          return { status: 200, body: { reachable: true, answer: 'unexpected login success' } };
        } catch (err) {
          const code = err instanceof SmartessError ? err.code : undefined;
          // A numeric code means SmartESS itself answered (network path OK); HTTP/timeouts are not numeric
          const reachable = typeof code === 'number';
          return {
            status: 200,
            body: { reachable, serverCredentials: hasServerCredentials(), answer: err instanceof Error ? err.message : String(err), code },
          };
        }
      }

      case 'login': {
        const auth = await login(String(req.usr ?? '').trim(), String(req.pwd ?? ''), req.companyKey || undefined);
        const devices = await listDevices(auth);
        return { status: 200, body: { auth, devices } };
      }

      case 'devices': {
        const devices = await withAuth(req.auth, listDevices);
        return { status: 200, body: { devices } };
      }

      case 'status': {
        const snapshot = await withAuth(req.auth, async (auth) => {
          let device = isDevice(req.device) ? req.device : null;
          if (!device && !isAuth(req.auth)) {
            serverDevice ??= envDevice() ?? (await listDevices(auth))[0] ?? null;
            device = serverDevice;
          }
          if (!device) throw new SmartessError('لا يوجد جهاز مرتبط بحساب SmartESS', 'NO_DEVICE');
          return getSnapshot(auth, device);
        });
        return { status: 200, body: { snapshot } };
      }

      default:
        return { status: 400, body: { error: 'Unknown op' } };
    }
  } catch (err) {
    const code = err instanceof SmartessError ? err.code : undefined;
    const message = err instanceof Error ? err.message : 'SmartESS request failed';
    const status = code === 'NO_AUTH' ? 401 : 502;
    return { status, body: { error: message, code } };
  }
}
