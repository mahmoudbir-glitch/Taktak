/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { SmartessDevice, SmartessSession } from '../services/smartessClient';
import type { AppSettings } from '../lib/settings';
import { Button, Card, Row, inputClass } from './ui';
import { LoginForm } from './LoginForm';

interface SettingsViewProps {
  session: SmartessSession | null;
  serverCredentials: boolean;
  devices: SmartessDevice[];
  settings: AppSettings;
  onSettingsChange: (s: AppSettings) => void;
  onLoggedIn: (session: SmartessSession, devices: SmartessDevice[]) => void;
  onDeviceChange: (device: SmartessDevice) => void;
  onLogout: () => void;
}

const NumberField: React.FC<{
  label: string;
  unit: string;
  value: number;
  step: number;
  min: number;
  onChange: (v: number) => void;
}> = ({ label, unit, value, step, min, onChange }) => (
  <label className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-slate-100 last:border-b-0">
    <span className="flex-1 text-sm text-slate-600">{label}</span>
    <span className="flex items-center gap-2 shrink-0">
      <input
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v) && v >= min) onChange(v);
        }}
        className="w-20 h-10 px-2 rounded-xl border border-slate-200 bg-slate-50 text-sm text-center text-slate-900 tabular-nums focus:outline-none focus:border-slate-900"
      />
      <span className="text-xs text-slate-500 w-8">{unit}</span>
    </span>
  </label>
);

export const SettingsView: React.FC<SettingsViewProps> = ({
  session,
  serverCredentials,
  devices,
  settings,
  onSettingsChange,
  onLoggedIn,
  onDeviceChange,
  onLogout,
}) => {
  const set = (patch: Partial<AppSettings>) => onSettingsChange({ ...settings, ...patch });

  return (
    <div className="space-y-3">
      <Card title="حساب SmartESS">
        {session ? (
          <>
            <Row label="الحساب" value={session.usr} />
            {session.device && <Row label="الرقم التسلسلي" value={session.device.sn} />}
            {devices.length > 1 && (
              <div className="px-4 py-2.5 border-b border-slate-100">
                <select
                  className={inputClass}
                  value={session.device?.sn ?? ''}
                  onChange={(e) => {
                    const d = devices.find((x) => x.sn === e.target.value);
                    if (d) onDeviceChange(d);
                  }}
                >
                  {devices.map((d) => (
                    <option key={d.sn} value={d.sn}>{d.name} — {d.sn}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="p-3">
              <Button variant="plain" onClick={onLogout} className="w-full">تسجيل الخروج</Button>
            </div>
          </>
        ) : serverCredentials ? (
          <p className="p-4 text-sm text-slate-600">الحساب مضبوط على الخادم، ولا حاجة لتسجيل الدخول.</p>
        ) : (
          <LoginForm onLoggedIn={onLoggedIn} />
        )}
      </Card>

      <Card title="الألواح والتوفير">
        <NumberField
          label="قدرة الألواح"
          unit="kW"
          step={0.1}
          min={0.1}
          value={settings.pvCapacityKw}
          onChange={(v) => set({ pvCapacityKw: v })}
        />
        <NumberField
          label="سعر الكيلوواط الساعي"
          unit={settings.currency}
          step={0.01}
          min={0}
          value={settings.pricePerKwh}
          onChange={(v) => set({ pricePerKwh: v })}
        />
        <NumberField
          label="كلفة المنظومة (اختياري)"
          unit={settings.currency}
          step={100}
          min={0}
          value={settings.systemCost}
          onChange={(v) => set({ systemCost: v })}
        />
        <label className="flex items-center justify-between gap-3 px-4 py-2.5">
          <span className="flex-1 text-sm text-slate-600">العملة</span>
          <input
            value={settings.currency}
            maxLength={6}
            onChange={(e) => set({ currency: e.target.value })}
            className="w-20 h-10 px-2 rounded-xl border border-slate-200 bg-slate-50 text-sm text-center text-slate-900 focus:outline-none focus:border-slate-900"
          />
          <span className="w-8" />
        </label>
      </Card>

      <Card title="البطارية والتنبيهات">
        <NumberField
          label="سعة البطارية"
          unit="kWh"
          step={0.1}
          min={0.5}
          value={settings.batteryCapacityKwh}
          onChange={(v) => set({ batteryCapacityKwh: v })}
        />
        <NumberField
          label="تنبيه عند انخفاض البطارية إلى"
          unit="%"
          step={5}
          min={5}
          value={settings.lowBatteryPercent}
          onChange={(v) => set({ lowBatteryPercent: v })}
        />
        <NumberField
          label="تنبيه عند استهلاك يتجاوز"
          unit="kW"
          step={0.5}
          min={0.5}
          value={settings.highLoadKw}
          onChange={(v) => set({ highLoadKw: v })}
        />
        <label className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-slate-600">صوت مع التنبيهات</span>
          <input
            type="checkbox"
            checked={settings.sound}
            onChange={(e) => set({ sound: e.target.checked })}
            className="w-5 h-5 accent-teal-700"
          />
        </label>
      </Card>
    </div>
  );
};
