/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Alerts from real readings. Each condition fires once when it starts and
 * re-arms only after it clears (with a small margin, so values hovering
 * around a threshold don't repeat the alert).
 */

import type { SmartessSnapshot } from '../services/smartessClient';
import type { AppSettings } from './settings';

export type Severity = 'critical' | 'warning' | 'info';

export interface AppAlert {
  id: string;
  title: string;
  detail: string;
  severity: Severity;
  at: number;
}

export interface AlertState {
  active: Set<string>;
  gridWasConnected: boolean | null;
}

export const newAlertState = (): AlertState => ({ active: new Set(), gridWasConnected: null });

const STALE_MS = 30 * 60 * 1000;

export function evaluateAlerts(
  s: SmartessSnapshot,
  readingAt: number | null,
  settings: AppSettings,
  state: AlertState,
): AppAlert[] {
  const out: AppAlert[] = [];
  const now = Date.now();
  const push = (key: string, severity: Severity, title: string, detail: string) =>
    out.push({ id: `${key}-${now}`, severity, title, detail, at: now });

  const edge = (key: string, active: boolean, cleared: boolean, fire: () => void) => {
    if (active && !state.active.has(key)) {
      state.active.add(key);
      fire();
    } else if (!active && cleared) {
      state.active.delete(key);
    }
  };

  edge('offline', !s.online, s.online, () =>
    push('offline', 'warning', 'المحول غير متصل', 'جهاز جمع البيانات لا يرسل قراءات إلى SmartESS.'));

  const stale = readingAt != null && now - readingAt > STALE_MS;
  edge('stale', stale, !stale, () =>
    push('stale', 'warning', 'لا توجد قراءات جديدة', 'آخر قراءة من المحول أقدم من 30 دقيقة.'));

  edge('fault', s.faulted, !s.faulted, () =>
    push('fault', 'critical', 'عطل في المحول', s.workingState ?? 'المحول أبلغ عن عطل.'));

  if (s.gridConnected !== null) {
    edge('grid', !s.gridConnected, s.gridConnected, () =>
      push('grid', 'critical', 'انقطعت كهرباء الشبكة', 'المنزل يعمل الآن على البطارية والألواح.'));
    if (state.gridWasConnected === false && s.gridConnected) {
      push('grid-back', 'info', 'عادت كهرباء الشبكة', 'المحول متصل بالشبكة من جديد.');
    }
    state.gridWasConnected = s.gridConnected;
  }

  if (s.batterySoc !== null) {
    const soc = s.batterySoc;
    edge('battery', soc <= settings.lowBatteryPercent, soc > settings.lowBatteryPercent + 2, () =>
      push('battery', soc <= 10 ? 'critical' : 'warning', 'البطارية منخفضة',
        `نسبة الشحن ${Math.round(soc)}% (الحد ${settings.lowBatteryPercent}%).`));
  }

  if (s.loadPowerW !== null) {
    const load = s.loadPowerW / 1000;
    edge('load', load >= settings.highLoadKw, load < settings.highLoadKw - 0.3, () =>
      push('load', 'warning', 'استهلاك مرتفع', `المنزل يستهلك ${load.toFixed(2)} kW.`));
  }

  return out;
}
