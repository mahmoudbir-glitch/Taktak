/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Today's readings, kept in this browser so the day can be drawn as a curve.
 * One point per reading (about one a minute while the app is open); the
 * previous day is kept for comparison, older days are dropped.
 */

import type { SmartessSnapshot } from '../services/smartessClient';

export interface HistoryPoint {
  t: number;      // epoch ms of the reading
  pv: number | null;   // W
  load: number | null; // W
  soc: number | null;  // %
  batt: number | null; // W, + charging
  grid: number | null; // W drawn from the grid
}

const PREFIX = 'taktak.history.';
const MAX_POINTS = 1500;

const dayKey = (ms: number) => {
  const d = new Date(ms);
  return `${PREFIX}${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function loadDay(ms = Date.now()): HistoryPoint[] {
  try {
    const raw = localStorage.getItem(dayKey(ms));
    return raw ? (JSON.parse(raw) as HistoryPoint[]) : [];
  } catch {
    return [];
  }
}

export function addReading(s: SmartessSnapshot, at: number | null): HistoryPoint[] {
  const t = at ?? Date.now();
  const points = loadDay(t);
  const last = points[points.length - 1];
  // Same reading polled again, or too close to the last one: keep the list lean
  if (last && Math.abs(t - last.t) < 50_000) return points;
  points.push({ t, pv: s.pvPowerW, load: s.loadPowerW, soc: s.batterySoc, batt: s.batteryPowerW, grid: s.gridPowerW });
  const trimmed = points.slice(-MAX_POINTS);
  try {
    localStorage.setItem(dayKey(t), JSON.stringify(trimmed));
    // Drop days older than yesterday
    const keep = new Set([dayKey(t), dayKey(t - 86_400_000)]);
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIX) && !keep.has(k)) localStorage.removeItem(k);
    }
  } catch {
    /* storage full or unavailable: the chart just shows this session */
  }
  return trimmed;
}
