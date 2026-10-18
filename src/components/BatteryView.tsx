/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { SmartessSnapshot } from '../services/smartessClient';
import type { AppSettings } from '../lib/settings';
import { backupHours, formatHours, kw, num } from '../lib/format';
import { Card, Ring, Row } from './ui';

export const BatteryView: React.FC<{ snapshot: SmartessSnapshot | null; settings: AppSettings }> = ({
  snapshot: s,
  settings,
}) => {
  if (!s) return <Card><p className="p-4 text-sm text-slate-500">لا توجد قراءة بعد.</p></Card>;

  const soc = s.batterySoc;
  const w = s.batteryPowerW;
  const charging = w != null && w > 50;
  const discharging = w != null && w < -50;
  const cap = settings.batteryCapacityKwh;
  const stored = soc != null ? (soc / 100) * cap : null;
  const backup = backupHours(s, cap);
  const toFull = charging && soc != null && soc < 100 ? ((100 - soc) / 100) * cap / (w! / 1000) : null;
  const low = soc != null && soc <= settings.lowBatteryPercent;

  return (
    <div className="space-y-3">
      <Card>
        <div className="p-5 flex flex-col items-center">
          <Ring value={soc} color={low ? '#e11d48' : '#10b981'}>
            <span className={`text-5xl font-black tabular-nums ${low ? 'text-rose-600' : 'text-slate-900'}`}>{num(soc)}</span>
            <span className="text-sm font-bold text-slate-400">%</span>
          </Ring>
          <span className={`mt-4 px-3 py-1 rounded-full text-xs font-extrabold ${
            charging ? 'bg-emerald-50 text-emerald-700' : discharging ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
          }`}>
            {charging ? `تشحن ${kw(w)} kW` : discharging ? `تفرّغ ${kw(-w!)} kW` : 'مستقرة'}
          </span>
        </div>
      </Card>

      <Card title="الآن">
        <Row label={charging ? 'قدرة الشحن' : discharging ? 'قدرة التفريغ' : 'القدرة'} value={`${kw(w == null ? null : Math.abs(w))} kW`} />
        {backup != null && <Row label="تكفي حتى" value={`~ ${formatHours(backup)}`} />}
        {toFull != null && <Row label="تمتلئ خلال" value={`~ ${formatHours(toFull)}`} />}
        {s.batteryVoltage != null && <Row label="الجهد" value={`${num(s.batteryVoltage, 1)} V`} />}
        {s.batteryCurrentA != null && <Row label="التيار" value={`${num(Math.abs(s.batteryCurrentA), 1)} A`} />}
      </Card>

      <Card title="السعة">
        <Row label="الطاقة المخزنة" value={stored != null ? `${stored.toFixed(1)} kWh` : '—'} />
        <Row label="السعة الكلية" value={`${cap} kWh`} />
      </Card>
    </div>
  );
};
