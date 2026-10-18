/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { SmartessSnapshot } from '../services/smartessClient';
import type { AppSettings } from '../lib/settings';
import { backupHours, formatHours, kw, num } from '../lib/format';
import { Card, Row } from './ui';

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
        <div className="p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-bold text-slate-500">نسبة الشحن</span>
            <span className={`text-xs font-bold ${charging ? 'text-emerald-700' : discharging ? 'text-amber-700' : 'text-slate-500'}`}>
              {charging ? 'تشحن' : discharging ? 'تفرّغ' : 'مستقرة'}
            </span>
          </div>
          <p className="mt-2">
            <span className={`text-5xl font-bold tabular-nums ${low ? 'text-rose-700' : 'text-slate-900'}`}>{num(soc)}</span>
            <span className="text-lg font-semibold text-slate-500 ms-1">%</span>
          </p>
          {/* Level bar: 10 equal segments */}
          <div className="mt-4 grid grid-cols-10 gap-1">
            {Array.from({ length: 10 }, (_, i) => (
              <span
                key={i}
                className={`h-3 rounded-sm ${
                  soc != null && soc >= (i + 1) * 10 - 5
                    ? low ? 'bg-rose-500' : 'bg-slate-900'
                    : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
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
