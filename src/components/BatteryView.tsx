/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Activity, Info } from 'lucide-react';
import type { SmartessSnapshot } from '../services/smartessClient';
import type { AppSettings } from '../lib/settings';
import type { HistoryPoint } from '../lib/history';
import { DASH, backupHours, formatHours, num } from '../lib/format';
import { Card, Collapsible, InfoList, StatBox } from './ui';
import { BatteryGraphic, levelColor } from './BatteryGraphic';
import { DayChart } from './DayChart';

export const BatteryView: React.FC<{ snapshot: SmartessSnapshot | null; settings: AppSettings; history: HistoryPoint[] }> = ({
  snapshot: s,
  settings,
  history,
}) => {
  if (!s) return <Card><p className="p-5 text-sm font-semibold text-slate-500">لا توجد قراءة بعد.</p></Card>;

  const soc = s.batterySoc;
  const w = s.batteryPowerW;
  const charging = w != null && w > 50;
  const discharging = w != null && w < -50;
  const cap = settings.batteryCapacityKwh;
  const stored = soc != null ? (soc / 100) * cap : null;
  const backup = backupHours(s, cap);
  const toFull = charging && soc != null && soc < 100 ? (((100 - soc) / 100) * cap) / (w! / 1000) : null;
  const low = soc != null && soc <= settings.lowBatteryPercent;

  const stateText = charging ? 'تشحن' : discharging ? 'تفرّغ' : 'مستقرة';
  const statePill = charging
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    : discharging
    ? 'bg-amber-50 text-amber-700 ring-amber-200'
    : 'bg-slate-50 text-slate-600 ring-slate-200';

  // Today's battery charge only (no kW lines)
  const socOnly = history.map((p) => ({ ...p, pv: null, load: null }));

  return (
    <div className="space-y-3">
      <section className="energy-card relative overflow-hidden p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(16,185,129,0.10),transparent_45%)]" />
        <div className="relative flex items-center gap-5">
          <BatteryGraphic soc={soc} state={charging ? 'charging' : discharging ? 'discharging' : 'idle'} width={116} />
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold text-slate-500">نسبة الشحن</span>
            <p className="mt-1 leading-none">
              <bdi dir="ltr">
                <span className="text-6xl font-black tabular-nums" style={{ color: low ? '#e11d48' : '#0f172a' }}>{num(soc)}</span>
                <span className="text-xl font-black text-slate-400">%</span>
              </bdi>
            </p>
            <span className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold ring-1 ${statePill}`}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: levelColor(soc) }} />
              {stateText}{w != null && (charging || discharging) ? <bdi dir="ltr"> {(Math.abs(w) / 1000).toFixed(2)} kW</bdi> : null}
            </span>
            {low && <p className="mt-2 text-xs font-bold text-rose-600">أقل من حد التنبيه ({settings.lowBatteryPercent}%)</p>}
          </div>
        </div>
      </section>

      <section className="energy-card grid grid-cols-3 gap-2 p-2.5">
        <StatBox label="المخزّن" value={stored != null ? stored.toFixed(1) : DASH} unit="kWh" tone="battery" />
        <StatBox
          label={charging ? 'تمتلئ خلال' : 'تكفي حتى'}
          value={charging ? (toFull != null ? formatHours(toFull) : soc === 100 ? 'ممتلئة' : DASH) : backup != null ? formatHours(backup) : DASH}
          tone="neutral"
        />
        <StatBox label="الجهد" value={s.batteryVoltage != null ? num(s.batteryVoltage, 1) : DASH} unit="V" tone="home" />
      </section>

      <Collapsible icon={<Activity className="h-5 w-5" />} title="الشحن خلال اليوم" subtitle="نسبة البطارية منذ منتصف الليل" tone="battery" defaultOpen>
        <DayChart points={socOnly} />
      </Collapsible>

      <Collapsible icon={<Info className="h-5 w-5" />} title="تفاصيل البطارية" tone="neutral">
        <InfoList
          rows={[
            ['القدرة الآن', w != null ? `${(Math.abs(w) / 1000).toFixed(2)} kW (${stateText})` : DASH],
            ['التيار', s.batteryCurrentA != null ? `${Math.abs(s.batteryCurrentA).toFixed(1)} A` : DASH],
            ['السعة القابلة للاستخدام', `${cap} kWh`],
            ['حد تنبيه الانخفاض', `${settings.lowBatteryPercent}%`],
          ]}
        />
      </Collapsible>
    </div>
  );
};
