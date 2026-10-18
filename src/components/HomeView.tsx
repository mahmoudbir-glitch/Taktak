/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Activity, ChevronLeft, Cpu, Moon } from 'lucide-react';
import type { SmartessDevice, SmartessSession, SmartessSnapshot } from '../services/smartessClient';
import type { AppSettings } from '../lib/settings';
import type { HistoryPoint } from '../lib/history';
import { DASH, backupHours, formatHours, ltr, num } from '../lib/format';
import { Card, Collapsible, InfoList, StatBox } from './ui';
import { LoginForm } from './LoginForm';
import { EnergyFlow } from './EnergyFlow';
import { DayChart } from './DayChart';

interface HomeViewProps {
  snapshot: SmartessSnapshot | null;
  readingAt: number | null;
  isLive: boolean;
  error: string | null;
  needsLogin: boolean;
  settings: AppSettings;
  history: HistoryPoint[];
  onLoggedIn: (session: SmartessSession, devices: SmartessDevice[]) => void;
  onOpenBattery: () => void;
  onOpenForecast: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  snapshot: s, readingAt, isLive, error, needsLogin, settings, history, onLoggedIn, onOpenBattery, onOpenForecast,
}) => {
  if (needsLogin) {
    return (
      <Card title="اربط محولك">
        <LoginForm onLoggedIn={onLoggedIn} />
      </Card>
    );
  }

  const hours = s ? backupHours(s, settings.batteryCapacityKwh) : null;
  const solarShare =
    s?.pvPowerW != null && s.loadPowerW != null && s.loadPowerW > 0
      ? Math.min(100, Math.round((s.pvPowerW / s.loadPowerW) * 100))
      : null;

  const nightText = !s
    ? 'بانتظار أول قراءة من المحول.'
    : (s.pvPowerW ?? 0) > 50 && (s.pvPowerW ?? 0) >= (s.loadPowerW ?? 0)
    ? 'الشمس تغطي الحمل الآن، والبطارية لا تفرّغ.'
    : hours != null
    ? `بالحمل الحالي (${ltr(`${Math.round(s.loadPowerW ?? 0)} W`)}) تكفي ${hours >= 24 ? 'أكثر من 24 ساعة' : `نحو ${formatHours(hours)}`}.`
    : 'البطارية لا تفرّغ الآن.';

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
          تعذر التحديث: {error}. تظهر آخر قراءة ناجحة.
        </p>
      )}

      <EnergyFlow
        snapshot={s}
        readingAt={readingAt}
        isLive={isLive}
        onOpen={(page) => (page === 'battery' ? onOpenBattery() : onOpenForecast())}
      />

      {/* Today in three numbers */}
      <section className="energy-card grid grid-cols-3 gap-2 p-2.5">
        <StatBox label="إنتاج اليوم" value={s?.energyTodayKwh != null ? s.energyTodayKwh.toFixed(1) : DASH} unit="kWh" tone="sun" />
        <StatBox label="الشمس تغطي" value={solarShare != null ? String(solarShare) : DASH} unit="%" tone="battery" />
        <StatBox label="من الشبكة" value={s?.gridPowerW != null ? (s.gridPowerW / 1000).toFixed(2) : DASH} unit="kW" tone="grid" />
      </section>

      {/* Tonight: a direct answer from the current reading */}
      <button type="button" onClick={onOpenBattery} className="energy-card flex w-full items-center gap-3 p-4 text-start">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 ring-1 ring-indigo-100"><Moon className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black text-slate-900">الليلة: هل تكفي البطارية؟</span>
          <span className="block text-xs font-semibold leading-5 text-slate-500">{nightText}</span>
        </span>
        <ChevronLeft className="h-5 w-5 shrink-0 text-slate-400" />
      </button>

      <Collapsible icon={<Activity className="h-5 w-5" />} title="منحنى اليوم" subtitle="الألواح والاستهلاك والبطارية منذ منتصف الليل" tone="sun" defaultOpen>
        <DayChart points={history} />
      </Collapsible>

      {s && (
        <Collapsible icon={<Cpu className="h-5 w-5" />} title="حالة المحول" subtitle={s.workingState ?? (s.online ? 'متصل' : 'غير متصل')} tone="home">
          <div className="mt-3 grid grid-cols-2 gap-2">
            <StatBox
              label="الحمل من قدرته"
              value={s.loadPercent != null ? String(Math.round(s.loadPercent)) : DASH}
              unit="%"
              tone="home"
              foot={s.loadPercent != null && (
                <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-white"><span className="block h-full rounded-full bg-sky-500" style={{ width: `${Math.min(100, Math.max(2, s.loadPercent))}%` }} /></span>
              )}
            />
            <StatBox label="الحرارة" value={s.inverterTemp != null ? String(Math.round(s.inverterTemp)) : DASH} unit="°C" tone={(s.inverterTemp ?? 0) >= 60 ? 'neutral' : 'sun'} />
          </div>
          <div className="mt-2">
            <InfoList
              rows={[
                ['جهد الشبكة', s.gridVoltage != null ? `${Math.round(s.gridVoltage)} V` : DASH],
                ['تردد الشبكة', s.gridFrequency != null ? `${s.gridFrequency.toFixed(2)} Hz` : DASH],
                ['جهد الألواح', s.pvVoltage != null ? `${num(s.pvVoltage, 1)} V` : DASH],
                ['جهد البطارية', s.batteryVoltage != null ? `${num(s.batteryVoltage, 1)} V` : DASH],
                ['الجهاز', s.online ? s.deviceName : `${s.deviceName} (غير متصل)`],
              ]}
            />
          </div>
        </Collapsible>
      )}
    </div>
  );
};
