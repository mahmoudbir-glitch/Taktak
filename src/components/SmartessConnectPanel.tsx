/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Cloud, Loader2, LogOut, ServerCog, User, Lock, Cpu } from 'lucide-react';
import {
  SmartessDevice, SmartessSession, getServerConfig, smartessLogin,
} from '../services/smartessClient';

interface SmartessConnectPanelProps {
  session: SmartessSession | null;
  onSessionChange: (session: SmartessSession | null) => void;
  batteryCapacityKwh: number;
  onBatteryCapacityChange: (kwh: number) => void;
}

export const SmartessConnectPanel: React.FC<SmartessConnectPanelProps> = ({
  session,
  onSessionChange,
  batteryCapacityKwh,
  onBatteryCapacityChange,
}) => {
  const [usr, setUsr] = useState(session?.usr ?? '');
  const [pwd, setPwd] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<SmartessDevice[]>(session?.device ? [session.device] : []);
  const [serverCredentials, setServerCredentials] = useState<boolean | null>(null);

  useEffect(() => {
    getServerConfig()
      .then(cfg => setServerCredentials(cfg.serverCredentials))
      .catch(() => setServerCredentials(false));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError(null);
    try {
      const res = await smartessLogin(usr.trim(), pwd);
      setDevices(res.devices);
      onSessionChange({ auth: res.auth, device: res.devices[0] ?? null, usr: usr.trim() });
      setPwd(''); // never keep the password around
      if (res.devices.length === 0) setError('تم تسجيل الدخول، لكن لا توجد أجهزة مرتبطة بهذا الحساب.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تسجيل الدخول');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    onSessionChange(null);
    setDevices([]);
  };

  const inputClass =
    'w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500';

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl backdrop-blur-md space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-2xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
          <Cloud className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-100">الربط بسحابة SmartESS</h3>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            استخدم نفس اسم المستخدم وكلمة المرور الخاصة بتطبيق SmartESS. تُرسل كلمة المرور مرة واحدة لخادم التطبيق
            لتسجيل الدخول ولا تُحفظ؛ يُحفظ رمز الجلسة فقط على هذا الجهاز.
          </p>
        </div>
      </div>

      {serverCredentials && !session && (
        <div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs">
          <ServerCog className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>حساب SmartESS مضبوط على الخادم (متغيرات البيئة)، ويمكنك البدء مباشرة دون تسجيل دخول.</span>
        </div>
      )}

      {session ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-xs">
            <span className="flex items-center gap-2 text-emerald-200 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>متصل بحساب {session.usr}</span>
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>تسجيل الخروج</span>
            </button>
          </div>

          {devices.length > 1 && (
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">المحول المراد مراقبته:</label>
              <select
                value={session.device?.sn ?? ''}
                onChange={(e) => {
                  const device = devices.find(d => d.sn === e.target.value) ?? null;
                  onSessionChange({ ...session, device });
                }}
                className={inputClass}
              >
                {devices.map(d => (
                  <option key={d.sn} value={d.sn}>{d.name} • {d.sn} ({d.statusLabel})</option>
                ))}
              </select>
            </div>
          )}

          {session.device && (
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
              <Cpu className="w-3.5 h-3.5 text-amber-400" />
              <span>PN: {session.device.pn} • SN: {session.device.sn} • devcode: {session.device.devcode}</span>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleLogin} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> اسم المستخدم:
            </label>
            <input
              type="text"
              autoComplete="username"
              value={usr}
              onChange={(e) => setUsr(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" /> كلمة المرور:
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLoggingIn || !usr || !pwd}
            className="sm:col-span-2 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
            <span>{isLoggingIn ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول إلى SmartESS'}</span>
          </button>
        </form>
      )}

      {error && (
        <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/50 text-rose-200 text-xs">{error}</div>
      )}

      <div className="pt-3 border-t border-slate-800/80">
        <label className="text-xs font-bold text-slate-300 block mb-1.5">
          سعة البطارية القابلة للاستخدام (kWh) — لحساب وقت التشغيل المتبقي:
        </label>
        <input
          type="number"
          min={0.5}
          step={0.1}
          value={batteryCapacityKwh}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v) && v > 0) onBatteryCapacityChange(v);
          }}
          className={`${inputClass} max-w-[10rem]`}
        />
        <p className="text-[10px] text-slate-500 mt-1">مثال: بطارية 48V × 100Ah ≈ 4.8 kWh</p>
        <p className="text-[10px] text-slate-500 mt-1">
          ملاحظة: سحابة SmartESS تحدّث بياناتها كل بضع دقائق، لذلك يجلب التطبيق القراءات كل 60 ثانية على الأقل مهما كان معدل التحديث المختار.
        </p>
      </div>
    </div>
  );
};
