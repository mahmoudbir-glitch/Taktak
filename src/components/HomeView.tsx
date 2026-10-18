/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BatteryMedium, ChevronLeft, Clock, Home, Sun, UtilityPole } from 'lucide-react';
import type { SmartessDevice, SmartessSession, SmartessSnapshot } from '../services/smartessClient';
import type { AppSettings } from '../lib/settings';
import { DASH, backupHours, formatHours, kw, num } from '../lib/format';
import { Card, Chip, Row, Tile, cardClass } from './ui';
import { LoginForm } from './LoginForm';

interface HomeViewProps {
  snapshot: SmartessSnapshot | null;
  error: string | null;
  needsLogin: boolean;
  settings: AppSettings;
  onLoggedIn: (session: SmartessSession, devices: SmartessDevice[]) => void;
  onOpenBattery: () => void;
  onOpenForecast: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  snapshot: s, error, needsLogin, settings, onLoggedIn, onOpenBattery, onOpenForecast,
}) => {
  if (needsLogin) {
    return (
      <Card title="اربط محولك">
        <LoginForm onLoggedIn={onLoggedIn} />
      </Card>
    );
  }

  if (!s) {
    return (
      <Card>
        <p className={`p-5 text-sm font-semibold ${error ? 'text-rose-600' : 'text-slate-500'}`}>
          {error ? `تعذر جلب البيانات: ${error}` : 'جاري جلب أول قراءة من المحول…'}
        </p>
      </Card>
    );
  }

  // Battery: + charging, − discharging
  const batteryW = s.batteryPowerW;
  const batteryNote =
    batteryW == null ? undefined
    : batteryW > 50 ? `تشحن ${kw(batteryW)} kW`
    : batteryW < -50 ? `تفرّغ ${kw(-batteryW)} kW`
    : 'مستقرة';
  const hours = backupHours(s, settings.batteryCapacityKwh);
  const lowBattery = s.batterySoc != null && s.batterySoc <= settings.lowBatteryPercent;
  const gridValue = s.gridConnected == null ? DASH : s.gridConnected ? 'متصلة' : 'مقطوعة';

  // Share of the house load covered by the panels right now
  const solarShare =
    s.pvPowerW != null && s.loadPowerW != null && s.loadPowerW > 0
      ? Math.min(100, Math.round((s.pvPowerW / s.loadPowerW) * 100))
      : null;

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-sm font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3">
          تعذر التحديث: {error}. تظهر آخر قراءة ناجحة.
        </p>
      )}

      {/* Hero: solar production now */}
      <button type="button" onClick={onOpenForecast} className={`${cardClass} w-full p-5 text-start`}>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2.5">
            <Chip tone="sun"><Sun className="w-5 h-5" /></Chip>
            <span className="text-sm font-bold text-slate-600">إنتاج الألواح الآن</span>
          </span>
          <ChevronLeft className="w-4 h-4 text-slate-300" />
        </div>
        <p className="mt-4">
          <span className="text-5xl font-black text-slate-900 tabular-nums">{kw(s.pvPowerW)}</span>
          <span className="text-base font-bold text-slate-400 ms-1.5">kW</span>
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold">
          <span className="rounded-xl bg-amber-50 text-amber-700 px-3 py-2">
            اليوم {s.energyTodayKwh != null ? `${s.energyTodayKwh.toFixed(1)} kWh` : DASH}
          </span>
          <span className="rounded-xl bg-slate-50 text-slate-600 px-3 py-2">
            يغطي {solarShare != null ? `${solarShare}%` : DASH} من الاستهلاك
          </span>
        </div>
      </button>

      <div className="grid grid-cols-2 gap-3">
        <Tile
          label="البطارية"
          accentTone="battery"
          icon={<BatteryMedium className="w-5 h-5" />}
          onClick={onOpenBattery}
          value={num(s.batterySoc)}
          unit="%"
          note={batteryNote}
          tone={lowBattery ? 'bad' : batteryW != null && batteryW > 50 ? 'good' : 'neutral'}
        />
        <Tile
          label="المنزل"
          accentTone="home"
          icon={<Home className="w-5 h-5" />}
          value={kw(s.loadPowerW)}
          unit="kW"
          note={s.loadPercent != null ? `حمولة المحول ${Math.round(s.loadPercent)}%` : undefined}
          tone={s.loadPowerW != null && s.loadPowerW / 1000 >= settings.highLoadKw ? 'warn' : 'neutral'}
        />
        <Tile
          label="الشبكة"
          accentTone="grid"
          icon={<UtilityPole className="w-5 h-5" />}
          value={gridValue}
          note={s.gridConnected
            ? [s.gridVoltage ? `${Math.round(s.gridVoltage)} V` : null, s.gridPowerW ? `سحب ${kw(s.gridPowerW)} kW` : null].filter(Boolean).join(' • ') || undefined
            : undefined}
          tone={s.gridConnected === false ? 'bad' : 'neutral'}
        />
        <Tile
          label="الاحتياطي"
          accentTone="neutral"
          icon={<Clock className="w-5 h-5" />}
          onClick={onOpenBattery}
          value={hours != null ? formatHours(hours) : DASH}
          note={hours != null ? 'بمعدل التفريغ الحالي' : 'البطارية لا تفرّغ'}
        />
      </div>

      <Card title="تفاصيل المحول">
        {s.pvVoltage != null && <Row label="جهد الألواح" value={`${num(s.pvVoltage, 1)} V`} />}
        {s.batteryVoltage != null && <Row label="جهد البطارية" value={`${num(s.batteryVoltage, 1)} V`} />}
        {s.inverterTemp != null && <Row label="الحرارة" value={`${num(s.inverterTemp)} °C`} />}
        {s.workingState && <Row label="الوضع" value={s.workingState} />}
        <Row label="الجهاز" value={s.online ? s.deviceName : `${s.deviceName} (غير متصل)`} />
      </Card>
    </div>
  );
};
