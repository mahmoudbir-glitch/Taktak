/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SmartessDevice, SmartessSession, smartessLogin } from '../services/smartessClient';
import { Button, inputClass } from './ui';

export const LoginForm: React.FC<{
  onLoggedIn: (session: SmartessSession, devices: SmartessDevice[]) => void;
}> = ({ onLoggedIn }) => {
  const [usr, setUsr] = useState('');
  const [pwd, setPwd] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await smartessLogin(usr.trim(), pwd);
      if (res.devices.length === 0) {
        setError('تم تسجيل الدخول، لكن لا يوجد محول مرتبط بهذا الحساب.');
        return;
      }
      setPwd(''); // the password is never kept
      onLoggedIn({ auth: res.auth, device: res.devices[0], usr: usr.trim() }, res.devices);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تسجيل الدخول');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="p-4 space-y-3">
      <p className="text-sm text-slate-600">سجّل الدخول بحساب تطبيق SmartESS لعرض بيانات محولك.</p>
      <input
        className={inputClass}
        placeholder="اسم المستخدم"
        autoComplete="username"
        value={usr}
        onChange={(e) => setUsr(e.target.value)}
        required
      />
      <input
        className={inputClass}
        type="password"
        placeholder="كلمة المرور"
        autoComplete="current-password"
        value={pwd}
        onChange={(e) => setPwd(e.target.value)}
        required
      />
      {error && <p className="text-sm text-rose-700">{error}</p>}
      <Button type="submit" disabled={busy || !usr || !pwd} className="w-full">
        {busy ? 'جاري تسجيل الدخول…' : 'تسجيل الدخول'}
      </Button>
      <p className="text-xs text-slate-400">كلمة المرور لا تُحفظ؛ يُحفظ رمز الجلسة فقط على هذا الجهاز.</p>
    </form>
  );
};
