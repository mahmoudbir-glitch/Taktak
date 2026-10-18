/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Browser side of the SmartESS integration. Talks only to our own
 * /api/smartess endpoint; the SmartESS password is never stored here.
 */

import type { SmartessAuth, SmartessDevice, SmartessSnapshot } from '../../server/smartess';

export type { SmartessAuth, SmartessDevice, SmartessSnapshot };

export interface SmartessSession {
  auth: SmartessAuth;
  device: SmartessDevice | null;
  usr: string;
}

const SESSION_KEY = 'shamsak.smartess.session';

export class SmartessClientError extends Error {
  readonly code?: number | string;

  constructor(message: string, code?: number | string) {
    super(message);
    this.code = code;
  }
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  let res: Response;
  try {
    res = await fetch('/api/smartess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new SmartessClientError('تعذر الوصول إلى خادم التطبيق');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new SmartessClientError(data.error ?? `HTTP ${res.status}`, data.code);
  return data as T;
}

// ── session storage (token only, never the password) ──────────────────────

export function loadSession(): SmartessSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as SmartessSession;
    return s?.auth?.token && s.auth.expiresAt > Date.now() ? s : null;
  } catch {
    return null;
  }
}

export function saveSession(session: SmartessSession | null): void {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable (private mode): session lives for this tab only */
  }
}

// ── API ────────────────────────────────────────────────────────────────────

export const getServerConfig = () => call<{ serverCredentials: boolean }>({ op: 'config' });

export async function smartessLogin(usr: string, pwd: string): Promise<{ auth: SmartessAuth; devices: SmartessDevice[] }> {
  return call({ op: 'login', usr, pwd });
}

export async function fetchSnapshot(session: SmartessSession | null): Promise<SmartessSnapshot> {
  const { snapshot } = await call<{ snapshot: SmartessSnapshot }>({
    op: 'status',
    auth: session?.auth,
    device: session?.device ?? undefined,
  });
  return snapshot;
}

/** SmartESS timestamps are Beijing time ("YYYY-MM-DD HH:mm:ss", UTC+8). Returns epoch ms or null. */
export function parseSmartessTime(value: string | null | undefined): number | null {
  if (!value) return null;
  if (/^\d{10,}$/.test(value)) return Number(value);
  const t = Date.parse(`${value.replace(' ', 'T')}+08:00`);
  return Number.isFinite(t) ? t : null;
}
