/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Calculator, Coins, Leaf } from 'lucide-react';
import type { SmartessSnapshot } from '../services/smartessClient';
import type { Forecast } from '../services/weather';
import type { AppSettings } from '../lib/settings';
import { Card, Collapsible, InfoList, StatBox } from './ui';

const money = (v: number) => (v >= 100 ? Math.round(v).toLocaleString('en-US') : v.toFixed(2));

/** kg of CO₂ avoided per kWh from solar instead of a diesel generator / grid mix */
const CO2_KG_PER_KWH = 0.7;

export const SavingsView: React.FC<{
  snapshot: SmartessSnapshot | null;
  forecast: Forecast | null;
  settings: AppSettings;
}> = ({ snapshot: s, forecast, settings }) => {
  const today = s?.energyTodayKwh ?? null;
  if (today == null) {
    return <Card><p className="p-5 text-sm font-semibold text-slate-500">لا يوجد إنتاج اليوم من المحول بعد.</p></Card>;
  }

  const price = settings.pricePerKwh;
  const cur = settings.currency;
  const dayKwh = today + (forecast?.todayRemainingKwh ?? 0);
  const monthSaving = dayKwh * 30 * price;
  const yearSaving = dayKwh * 365 * price;
  const paybackYears = settings.systemCost > 0 && yearSaving > 0 ? settings.systemCost / yearSaving : null;

  return (
    <div className="space-y-3">
      <section className="energy-card relative overflow-hidden p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(20,184,166,0.12),transparent_45%)]" />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-slate-500">وفّرت اليوم حتى الآن</span>
            <p className="mt-1 leading-none">
              <bdi dir="ltr"><span className="text-5xl font-black text-teal-700">{money(today * price)}</span><span className="text-lg font-black text-teal-600"> {cur}</span></bdi>
            </p>
            <p className="mt-2 text-xs font-semibold text-slate-500"><bdi dir="ltr">{today.toFixed(1)} kWh × {price} {cur}</bdi></p>
          </div>
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 ring-1 ring-teal-100"><Coins className="h-5 w-5" /></span>
        </div>
      </section>

      <section className="energy-card grid grid-cols-3 gap-2 p-2.5">
        <StatBox label="اليوم كاملاً" value={money(dayKwh * price)} unit={cur} tone="money" />
        <StatBox label="الشهر" value={money(monthSaving)} unit={cur} tone="money" />
        <StatBox label="السنة" value={money(yearSaving)} unit={cur} tone="money" />
      </section>

      <section className="energy-card grid grid-cols-2 gap-2 p-2.5">
        <StatBox label="استرداد الكلفة" value={paybackYears != null ? paybackYears.toFixed(1) : '—'} unit={paybackYears != null ? 'سنة' : undefined} tone="neutral"
          foot={paybackYears == null ? 'أدخل كلفة المنظومة في الإعدادات' : undefined} />
        <StatBox label="كربون تجنّبته اليوم" value={(today * CO2_KG_PER_KWH).toFixed(1)} unit="kg" tone="battery" foot={<span className="inline-flex items-center gap-1"><Leaf className="h-3 w-3" />CO₂</span>} />
      </section>

      <Collapsible icon={<Calculator className="h-5 w-5" />} title="كيف يُحسب التوفير؟" tone="neutral">
        <InfoList
          rows={[
            ['إنتاج اليوم حتى الآن', `${today.toFixed(1)} kWh`],
            ['متوقع لباقي اليوم', `${(forecast?.todayRemainingKwh ?? 0).toFixed(1)} kWh`],
            ['تقدير اليوم الكامل', `${dayKwh.toFixed(1)} kWh`],
            ['سعر الكيلوواط', `${price} ${cur}`],
          ]}
        />
        <p className="mt-2 text-[11px] font-semibold leading-5 text-slate-500">
          التوفير = الطاقة التي أنتجتها الألواح × سعر الكيلوواط الذي كنت ستدفعه للشبكة أو المولد. الشهر = اليوم الكامل × 30.
        </p>
      </Collapsible>
    </div>
  );
};
