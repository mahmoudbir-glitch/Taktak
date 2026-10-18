/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ChevronLeft, Cpu, Moon } from 'lucide-react';
import type { SmartessDevice, SmartessSession, SmartessSnapshot } from '../services/smartessClient';
import type { AppSettings } from '../lib/settings';
import { DASH, backupHours, formatHours, num } from '../lib/format';
import { Card } from './ui';
import { LoginForm } from './LoginForm';
import { EnergyFlow } from './EnergyFlow';

interface HomeViewProps {
  snapshot: SmartessSnapshot | null;
  readingAt: number | null;
  isLive: boolean;
  error: string | null;
  needsLogin: boolean;
  settings: AppSettings;
  onLoggedIn: (session: SmartessSession, devices: SmartessDevice[]) => void;
  onOpenBattery: () => void;
  onOpenForecast: () => void;
}

const Stat: React.FC<{ label: string; value: string; unit?: string; tone: string; bg: string }> = ({ label, value, unit, tone, bg }) => (
  <div className={`rounded-2xl p-4 ${bg}`}>
    <span className="block text-xs font-bold text-slate-500">{label}</span>
    <strong className={`mt-1.5 block text-2xl font-black leading-8 ${tone}`}>
      <bdi dir="ltr">{value}{unit && <small className="text-sm"> {unit}</small>}</bdi>
    </strong>
  </div>
);

export const HomeView: React.FC<HomeViewProps> = ({
  snapshot: s, readingAt, isLive, error, needsLogin, settings, onLoggedIn, onOpenBattery, onOpenForecast,
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
    ? `بالحمل الحالي (${Math.round(s.loadPowerW ?? 0)} واط) تكفي ${hours >= 24 ? 'أكثر من 24 ساعة' : `نحو ${formatHours(hours)}`}.`
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

      <section className="energy-card grid grid-cols-2 gap-2.5 p-3">
        <Stat label="إنتاج اليوم" value={s?.energyTodayKwh != null ? s.energyTodayKwh.toFixed(1) : DASH} unit="kWh" tone="text-amber-700" bg="bg-amber-50" />
        <Stat label="الشمس تغطي" value={solarShare != null ? `${solarShare}` : DASH} unit="%" tone="text-emerald-700" bg="bg-emerald-50" />
      </section>

      {/* Tonight: a direct answer from the current reading */}
      <button type="button" onClick={onOpenBattery} className="energy-card flex w-full items-center gap-3 p-4 text-start">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500"><Moon className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black text-slate-900">الليلة: هل تكفي البطارية؟</span>
          <span className="block text-xs font-semibold leading-5 text-slate-500">{nightText}</span>
        </span>
        <ChevronLeft className="h-5 w-5 shrink-0 text-slate-400" />
      </button>

      {/* Inverter status as it reports it */}
      {s && (
        <section className="energy-card p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 ring-1 ring-sky-100"><Cpu className="h-5 w-5" /></span>
            <div className="min-w-0">
              <h2 className="text-sm font-black text-slate-900">حالة المحول</h2>
              <p className="truncate text-[11px] font-bold text-slate-500">{s.workingState ?? (s.online ? 'متصل' : 'غير متصل')}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-slate-50 p-3">
              <span className="text-[11px] font-bold text-slate-500">الحمل من قدرته</span>
              <strong className="mt-0.5 block text-lg font-black text-sky-700"><bdi dir="ltr">{s.loadPercent != null ? `${Math.round(s.loadPercent)}%` : DASH}</bdi></strong>
              {s.loadPercent != null && (
                <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-slate-200"><span className="block h-full rounded-full bg-sky-500" style={{ width: `${Math.min(100, Math.max(2, s.loadPercent))}%` }} /></span>
              )}
            </div>
            <div className={`rounded-2xl p-3 ${(s.inverterTemp ?? 0) >= 60 ? 'bg-rose-50' : 'bg-slate-50'}`}>
              <span className="text-[11px] font-bold text-slate-500">الحرارة</span>
              <strong className={`mt-0.5 block text-lg font-black ${(s.inverterTemp ?? 0) >= 60 ? 'text-rose-600' : 'text-amber-600'}`}><bdi dir="ltr">{s.inverterTemp != null ? `${Math.round(s.inverterTemp)} °C` : DASH}</bdi></strong>
            </div>
          </div>
          <dl className="mt-3 divide-y divide-slate-100 text-[13px]">
            {[
              ['جهد الشبكة', s.gridVoltage != null ? `${Math.round(s.gridVoltage)} V` : DASH],
              ['جهد الألواح', s.pvVoltage != null ? `${num(s.pvVoltage, 1)} V` : DASH],
              ['جهد البطارية', s.batteryVoltage != null ? `${num(s.batteryVoltage, 1)} V` : DASH],
              ['الجهاز', s.deviceName],
            ].map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-3 py-2">
                <dt className="shrink-0 font-bold text-slate-500">{label}</dt>
                <dd className="text-left font-black text-indigo-700"><bdi>{value}</bdi></dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
};
