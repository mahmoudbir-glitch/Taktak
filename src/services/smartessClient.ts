/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Browser side of the SmartESS integration. Talks only to our own
 * /api/smartess endpoint; the SmartESS password is never stored here.
 */

import type { SmartessAuth, SmartessDevice, SmartessSnapshot } from '../../server/smartess';
import type { SolarTelemetry } from '../types/solar';

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

// ── mapping to the app's telemetry model ──────────────────────────────────

const kw = (w: number | null) => (w === null ? null : Number((w / 1000).toFixed(2)));
const pick = <T>(v: T | null | undefined, fallback: T): T => (v === null || v === undefined ? fallback : v);

/**
 * Merge a SmartESS reading into the previous telemetry. Fields the inverter
 * does not report keep their previous value; daily counters are integrated
 * from power × elapsed time when the cloud does not provide them.
 */
export function snapshotToTelemetry(
  s: SmartessSnapshot,
  prev: SolarTelemetry,
  batteryCapacityKwh: number,
): SolarTelemetry {
  const now = new Date();
  const prevTime = new Date(prev.timestamp);
  const sameDay = prevTime.toDateString() === now.toDateString();
  const dtHours = sameDay ? Math.min(1, Math.max(0, (now.getTime() - prevTime.getTime()) / 3_600_000)) : 0;

  const pvPower = pick(kw(s.pvPowerW), 0);
  const loadPower = pick(kw(s.loadPowerW), prev.loadPower);
  const batteryPower = pick(kw(s.batteryPowerW), 0);
  const gridConnected = s.gridConnected ?? true;
  // Whatever PV + battery discharge doesn't cover comes from the grid. Most SmartESS
  // (Voltronic-based) hybrids don't export, so a negative balance is treated as 0.
  const gridPower = gridConnected ? Math.max(0, Number((loadPower + batteryPower - pvPower).toFixed(2))) : 0;
  const batterySoc = pick(s.batterySoc, prev.batterySoc);

  const base = (key: 'pvTodayKwh' | 'loadTodayKwh' | 'gridTodayImportKwh' | 'gridTodayExportKwh') =>
    sameDay ? prev[key] : 0;
  const round2 = (n: number) => Number(n.toFixed(2));

  // Readings this inverter doesn't report are shown as "—" (and zeroed so no stale
  // simulator value or false alarm survives)
  const unavailable: (keyof SolarTelemetry)[] = ['pvVoltage2', 'pvCurrent2', 'batteryHealth', 'batteryTemp', 'inverterEfficiency'];
  if (s.pvVoltage === null) unavailable.push('pvVoltage1');
  if (s.pvCurrent === null && !s.pvVoltage) unavailable.push('pvCurrent1');
  if (s.gridVoltage === null) unavailable.push('gridVoltage');
  if (s.gridFrequency === null) unavailable.push('gridFrequency');
  if (s.inverterTemp === null) unavailable.push('inverterTemp');

  const remainingHours = batteryPower < -0.05
    ? Number((((batterySoc / 100) * batteryCapacityKwh) / Math.abs(batteryPower)).toFixed(1))
    : 24;

  return {
    ...prev,
    timestamp: now.toISOString(),
    pvPower,
    pvTodayKwh: s.energyTodayKwh ?? round2(base('pvTodayKwh') + pvPower * dtHours),
    pvVoltage1: pick(s.pvVoltage, 0),
    // No current reading: derive it from PV power and voltage when possible
    pvCurrent1: pick(s.pvCurrent, s.pvVoltage ? Number(((pvPower * 1000) / s.pvVoltage).toFixed(1)) : 0),
    pvVoltage2: 0,
    pvCurrent2: 0,
    pvPeakTodayKw: sameDay ? Math.max(prev.pvPeakTodayKw, pvPower) : pvPower,

    batterySoc,
    batteryPower,
    batteryVoltage: pick(s.batteryVoltage, prev.batteryVoltage),
    batteryCurrent: pick(s.batteryCurrentA, 0),
    batteryRemainingHours: remainingHours,
    batteryCapacityKwh,

    loadPower,
    loadTodayKwh: round2(base('loadTodayKwh') + loadPower * dtHours),
    essentialLoadPower: loadPower,
    heavyLoadPower: 0,

    gridPower,
    gridStatus: gridConnected ? 'connected' : 'blackout',
    gridVoltage: pick(s.gridVoltage, 0),
    gridFrequency: pick(s.gridFrequency, 0),
    gridTodayImportKwh: round2(base('gridTodayImportKwh') + Math.max(0, gridPower) * dtHours),
    gridTodayExportKwh: round2(base('gridTodayExportKwh') + Math.max(0, -gridPower) * dtHours),

    inverterTemp: pick(s.inverterTemp, 0),
    batteryTemp: 0,
    batteryHealth: 0,
    fanSpeedPercent: 0,
    unavailable,
    inverterStatus: s.faulted ? 'fault' : !s.online ? 'offline' : gridConnected ? 'normal' : 'islanding',
    inverterRatedPowerKw: pick(kw(s.ratedPowerW), prev.inverterRatedPowerKw),
  };
}
