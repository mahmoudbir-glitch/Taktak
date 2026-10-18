/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BatteryMedium, Home, Sun, UtilityPole } from 'lucide-react';
import type { SmartessDevice, SmartessSession, SmartessSnapshot } from '../services/smartessClient';
import type { AppSettings } from '../lib/settings';
import { DASH, backupHours, formatHours, kw, num } from '../lib/format';
import { Card, Row, Tile } from './ui';
import { LoginForm } from './LoginForm';

interface HomeViewProps {
  snapshot: SmartessSnapshot | null;
  error: string | null;
  needsLogin: boolean;
  settings: AppSettings;
  onLoggedIn: (session: SmartessSession, devices: SmartessDevice[]) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ snapshot: s, error, needsLogin, settings, onLoggedIn }) => {
  if (needsLogin) {
    return (
      <Card title="ربط المحول">
        <LoginForm onLoggedIn={onLoggedIn} />
      </Card>
    );
  }

  if (!s) {
    return (
      <Card>
        <p className={`p-4 text-sm ${error ? 'text-rose-700' : 'text-slate-500'}`}>
          {error ? `تعذر جلب البيانات: ${error}` : 'جاري جلب أول قراءة من المحول…'}
        </p>
      </Card>
    );
  }

  // Battery: + charging, − discharging
  const batteryW = s.batteryPowerW;
  const batteryNote =
    batteryW == null ? undefined
    : batteryW > 50 ? `يشحن ${kw(batteryW)} kW`
    : batteryW < -50 ? `يفرّغ ${kw(-batteryW)} kW`
    : 'مستقرة';
  const hours = backupHours(s, settings.batteryCapacityKwh);
  const lowBattery = s.batterySoc != null && s.batterySoc <= settings.lowBatteryPercent;

  const gridValue = s.gridConnected == null ? DASH : s.gridConnected ? 'متصلة' : 'مقطوعة';

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-sm text-rose-700 bg-white border border-rose-200 rounded-lg px-4 py-2.5">
          تعذر التحديث: {error}. تظهر آخر قراءة ناجحة.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Tile
          label="الألواح"
          icon={<Sun className="w-4 h-4" />}
          value={kw(s.pvPowerW)}
          unit="kW"
          note={s.energyTodayKwh != null ? `اليوم ${s.energyTodayKwh.toFixed(1)} kWh` : undefined}
        />
        <Tile
          label="البطارية"
          icon={<BatteryMedium className="w-4 h-4" />}
          value={num(s.batterySoc)}
          unit="%"
          note={batteryNote}
          tone={lowBattery ? 'bad' : batteryW != null && batteryW > 50 ? 'good' : 'neutral'}
        />
        <Tile
          label="المنزل"
          icon={<Home className="w-4 h-4" />}
          value={kw(s.loadPowerW)}
          unit="kW"
          note={s.loadPercent != null ? `حمولة المحول ${Math.round(s.loadPercent)}%` : undefined}
          tone={s.loadPowerW != null && s.loadPowerW / 1000 >= settings.highLoadKw ? 'warn' : 'neutral'}
        />
        <Tile
          label="الشبكة"
          icon={<UtilityPole className="w-4 h-4" />}
          value={gridValue}
          note={s.gridConnected && s.gridVoltage ? `${Math.round(s.gridVoltage)} V` : undefined}
          tone={s.gridConnected === false ? 'bad' : 'neutral'}
        />
      </div>

      <Card title="تفاصيل">
        {hours != null && <Row label="وقت البطارية المتبقي" value={`~ ${formatHours(hours)}`} />}
        {s.pvVoltage != null && <Row label="جهد الألواح" value={`${num(s.pvVoltage, 1)} V`} />}
        {s.batteryVoltage != null && <Row label="جهد البطارية" value={`${num(s.batteryVoltage, 1)} V`} />}
        {s.inverterTemp != null && <Row label="حرارة المحول" value={`${num(s.inverterTemp)} °C`} />}
        {s.workingState && <Row label="وضع المحول" value={s.workingState} />}
        <Row label="المحول" value={s.online ? s.deviceName : `${s.deviceName} (غير متصل)`} />
      </Card>
    </div>
  );
};
