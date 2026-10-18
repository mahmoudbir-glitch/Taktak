/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { SmartessSnapshot } from '../services/smartessClient';
import type { Forecast } from '../services/weather';
import type { AppSettings } from '../lib/settings';
import { Card, Row } from './ui';

const money = (v: number, currency: string) =>
  `${v >= 100 ? Math.round(v).toLocaleString('en-US') : v.toFixed(2)} ${currency}`;

export const SavingsView: React.FC<{
  snapshot: SmartessSnapshot | null;
  forecast: Forecast | null;
  settings: AppSettings;
}> = ({ snapshot: s, forecast, settings }) => {
  const today = s?.energyTodayKwh ?? null;
  if (today == null) {
    return <Card><p className="p-4 text-sm text-slate-500">لا يوجد إنتاج اليوم من المحول بعد.</p></Card>;
  }

  const price = settings.pricePerKwh;
  const cur = settings.currency;
  // Full-day estimate: what was produced so far + what the forecast expects for the rest of today
  const dayKwh = today + (forecast?.todayRemainingKwh ?? 0);
  const monthKwh = dayKwh * 30;
  const yearSaving = dayKwh * 365 * price;
  const paybackYears = settings.systemCost > 0 && yearSaving > 0 ? settings.systemCost / yearSaving : null;

  return (
    <div className="space-y-3">
      <Card>
        <div className="p-4">
          <p className="text-xs font-bold text-slate-500">وفّرت اليوم حتى الآن</p>
          <p className="mt-2">
            <span className="text-4xl font-bold tabular-nums text-emerald-700">{money(today * price, cur)}</span>
          </p>
          <p className="text-sm text-slate-500 mt-1">{today.toFixed(1)} kWh من الألواح × {price} {cur}/kWh</p>
        </div>
      </Card>

      <Card title="تقدير">
        <Row label="إنتاج اليوم الكامل" value={`${dayKwh.toFixed(1)} kWh`} />
        <Row label="توفير اليوم الكامل" value={money(dayKwh * price, cur)} />
        <Row label="توفير الشهر" value={money(monthKwh * price, cur)} />
        <Row label="توفير السنة" value={money(yearSaving, cur)} />
        {paybackYears != null && <Row label="استرداد كلفة المنظومة" value={`~ ${paybackYears.toFixed(1)} سنة`} />}
      </Card>

      <p className="text-xs text-slate-400 px-1">
        التقدير = إنتاج اليوم الفعلي + توقع باقي اليوم، مضروباً بسعر الكيلوواط الساعي في الإعدادات.
        {settings.systemCost > 0 ? '' : ' أدخل كلفة المنظومة في الإعدادات لحساب مدة الاسترداد.'}
      </p>
    </div>
  );
};
