/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { BatteryFull, Bell, Download, Info, SunMedium, UserRound } from 'lucide-react';
import type { SmartessDevice, SmartessSession } from '../services/smartessClient';
import type { AppSettings } from '../lib/settings';
import { askNotifyPermission, notifyPermission } from '../services/notify';
import { Button, Collapsible, InfoList, inputClass } from './ui';
import { LoginForm } from './LoginForm';
import { ltr } from '../lib/format';

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

const fieldClass =
  'h-10 w-20 rounded-xl border border-slate-200 bg-slate-50 px-2 text-center text-sm font-black text-slate-900 tabular-nums focus:border-indigo-400 focus:outline-none';

const NumberField: React.FC<{
  label: string;
  hint?: string;
  unit: string;
  value: number;
  step: number;
  min: number;
  onChange: (v: number) => void;
}> = ({ label, hint, unit, value, step, min, onChange }) => {
  // Keep the typed text so the field can be cleared while editing
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  return (
    <label className="flex items-center justify-between gap-3 py-2.5">
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-bold text-slate-700">{label}</span>
        {hint && <span className="block text-[11px] font-semibold text-slate-400">{hint}</span>}
      </span>
      <span className="flex shrink-0 items-center gap-2" dir="ltr">
        <input
          type="number"
          inputMode="decimal"
          lang="en"
          step={step}
          min={min}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            const v = Number(e.target.value);
            if (e.target.value !== '' && Number.isFinite(v) && v >= min) onChange(v);
          }}
          onBlur={() => setText(String(value))}
          className={fieldClass}
        />
        <span className="w-9 text-start text-xs font-bold text-slate-500">{unit}</span>
      </span>
    </label>
  );
};

const Toggle: React.FC<{ label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }> = ({ label, hint, checked, onChange }) => (
  <label className="flex cursor-pointer items-center justify-between gap-3 py-2.5">
    <span className="min-w-0 flex-1">
      <span className="block text-[13px] font-bold text-slate-700">{label}</span>
      {hint && <span className="block text-[11px] font-semibold text-slate-400">{hint}</span>}
    </span>
    <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <span className="relative h-7 w-12 shrink-0 rounded-full bg-slate-200 transition-colors peer-checked:bg-indigo-500 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-300 after:absolute after:start-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:-translate-x-5" />
  </label>
);

/** The browser's "install app" prompt, when it offers one */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function useInstallPrompt() {
  const [event, setEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches,
  );
  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setEvent(e as InstallPromptEvent); };
    const onInstalled = () => { setInstalled(true); setEvent(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);
  const install = async () => {
    if (!event) return;
    await event.prompt();
    await event.userChoice.catch(() => null);
    setEvent(null);
  };
  return { canInstall: Boolean(event), installed, install };
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  session, serverCredentials, devices, settings, onSettingsChange, onLoggedIn, onDeviceChange, onLogout,
}) => {
  const set = (patch: Partial<AppSettings>) => onSettingsChange({ ...settings, ...patch });
  const [permission, setPermission] = useState(notifyPermission);
  const { canInstall, installed, install } = useInstallPrompt();

  const toggleNotify = async (on: boolean) => {
    if (!on) return set({ notify: false });
    const ok = await askNotifyPermission();
    setPermission(notifyPermission());
    set({ notify: ok });
  };

  return (
    <div className="space-y-3">
      <Collapsible icon={<UserRound className="h-5 w-5" />} title="حساب SmartESS" subtitle={session ? session.usr : serverCredentials ? 'مضبوط على الخادم' : 'غير مربوط'} tone="home" defaultOpen={!session && !serverCredentials}>
        {session ? (
          <div className="space-y-2">
            <InfoList
              rows={[
                ['الحساب', session.usr],
                ...(session.device ? ([['الجهاز', session.device.name], ['الرقم التسلسلي', <bdi dir="ltr">{session.device.sn}</bdi>]] as [string, React.ReactNode][]) : []),
              ]}
            />
            {devices.length > 1 && (
              <select
                className={inputClass}
                value={session.device?.sn ?? ''}
                onChange={(e) => {
                  const d = devices.find((x) => x.sn === e.target.value);
                  if (d) onDeviceChange(d);
                }}
              >
                {devices.map((d) => <option key={d.sn} value={d.sn}>{d.name} — {d.sn}</option>)}
              </select>
            )}
            <Button variant="plain" onClick={onLogout} className="w-full">تسجيل الخروج</Button>
          </div>
        ) : serverCredentials ? (
          <p className="py-3 text-sm font-semibold text-slate-600">الحساب مضبوط على الخادم، ولا حاجة لتسجيل الدخول.</p>
        ) : (
          <div className="pt-2"><LoginForm onLoggedIn={onLoggedIn} /></div>
        )}
      </Collapsible>

      <Collapsible icon={<SunMedium className="h-5 w-5" />} title="الألواح والتوفير" subtitle={`${ltr(`${settings.pvCapacityKw} kW`)} · ${ltr(`${settings.pricePerKwh} ${settings.currency}/kWh`)}`} tone="sun">
        <div className="divide-y divide-slate-100">
          <NumberField label="قدرة الألواح" hint="مجموع قدرة الألواح، للتوقعات" unit="kW" step={0.1} min={0.1} value={settings.pvCapacityKw} onChange={(v) => set({ pvCapacityKw: v })} />
          <NumberField label="سعر الكيلوواط الساعي" hint="ما تدفعه للشبكة أو المولد" unit={settings.currency} step={0.01} min={0} value={settings.pricePerKwh} onChange={(v) => set({ pricePerKwh: v })} />
          <NumberField label="كلفة المنظومة" hint="اختياري، لحساب مدة الاسترداد" unit={settings.currency} step={100} min={0} value={settings.systemCost} onChange={(v) => set({ systemCost: v })} />
          <label className="flex items-center justify-between gap-3 py-2.5">
            <span className="flex-1 text-[13px] font-bold text-slate-700">العملة</span>
            <span className="flex items-center gap-2" dir="ltr">
              <input value={settings.currency} maxLength={6} onChange={(e) => set({ currency: e.target.value })} className={fieldClass} />
              <span className="w-9" />
            </span>
          </label>
        </div>
      </Collapsible>

      <Collapsible icon={<BatteryFull className="h-5 w-5" />} title="البطارية" subtitle={ltr(`${settings.batteryCapacityKwh} kWh`)} tone="battery">
        <div className="divide-y divide-slate-100">
          <NumberField label="سعة البطارية القابلة للاستخدام" hint="لحساب المدة المتبقية" unit="kWh" step={0.1} min={0.5} value={settings.batteryCapacityKwh} onChange={(v) => set({ batteryCapacityKwh: v })} />
        </div>
      </Collapsible>

      <Collapsible icon={<Bell className="h-5 w-5" />} title="التنبيهات" subtitle={`البطارية ≤ ${ltr(`${settings.lowBatteryPercent}%`)} · الحمل ≥ ${ltr(`${settings.highLoadKw} kW`)}`} tone="neutral">
        <div className="divide-y divide-slate-100">
          <NumberField label="انخفاض البطارية إلى" unit="%" step={5} min={5} value={settings.lowBatteryPercent} onChange={(v) => set({ lowBatteryPercent: v })} />
          <NumberField label="استهلاك يتجاوز" unit="kW" step={0.5} min={0.5} value={settings.highLoadKw} onChange={(v) => set({ highLoadKw: v })} />
          <Toggle label="صوت مع التنبيهات" checked={settings.sound} onChange={(v) => set({ sound: v })} />
          <Toggle
            label="إشعارات الهاتف"
            hint={
              permission === 'unsupported' ? 'المتصفح لا يدعم الإشعارات'
              : permission === 'denied' ? 'الإشعارات محظورة من إعدادات المتصفح'
              : 'تصل والتطبيق مفتوح أو في الخلفية'
            }
            checked={settings.notify && permission === 'granted'}
            onChange={(v) => void toggleNotify(v)}
          />
        </div>
      </Collapsible>

      <Collapsible icon={<Info className="h-5 w-5" />} title="حول التطبيق" subtitle="Taktak · تثبيت على الشاشة الرئيسية" tone="grid">
        <div className="space-y-3 pt-2">
          {installed ? (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">التطبيق مثبّت على هذا الجهاز.</p>
          ) : canInstall ? (
            <Button onClick={() => void install()} className="w-full"><Download className="h-4 w-4" /> تثبيت Taktak</Button>
          ) : (
            <p className="text-xs font-semibold leading-5 text-slate-500">
              للتثبيت: من قائمة المتصفح اختر «إضافة إلى الشاشة الرئيسية» (في iPhone من زر المشاركة).
            </p>
          )}
          <InfoList
            rows={[
              ['مصدر القراءات', 'SmartESS'],
              ['التحديث', 'كل دقيقة والتطبيق مفتوح'],
              ['التوقعات', 'Open-Meteo'],
              ['الخصوصية', 'كلمة المرور لا تُحفظ'],
            ]}
          />
        </div>
      </Collapsible>
    </div>
  );
};
