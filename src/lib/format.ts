/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SmartessSnapshot } from '../services/smartessClient';

export const DASH = '—';

/** Watts → "1.25" kW, or "—" when not reported */
export const kw = (w: number | null | undefined) => (w == null ? DASH : (w / 1000).toFixed(2));

export const num = (v: number | null | undefined, digits = 0) => (v == null ? DASH : v.toFixed(digits));

export const timeOf = (ms: number) =>
  new Date(ms).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

/** Hours of backup at the current discharge rate, or null when not discharging */
export function backupHours(s: SmartessSnapshot, capacityKwh: number): number | null {
  if (s.batterySoc == null || s.batteryPowerW == null || s.batteryPowerW > -50) return null;
  return ((s.batterySoc / 100) * capacityKwh) / (Math.abs(s.batteryPowerW) / 1000);
}

export function formatHours(h: number): string {
  if (h >= 24) return 'أكثر من 24 ساعة';
  const hours = Math.floor(h);
  const minutes = Math.round((h - hours) * 60);
  return hours > 0 ? `${hours} س ${minutes} د` : `${minutes} دقيقة`;
}
