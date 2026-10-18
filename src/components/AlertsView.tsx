/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertTriangle, BellOff, CircleAlert, Info } from 'lucide-react';
import type { AppAlert, Severity } from '../lib/alerts';
import { dateOf, timeOf } from '../lib/format';
import { Button } from './ui';

const look: Record<Severity, { box: string; Icon: typeof Info; label: string }> = {
  critical: { box: 'bg-rose-50 text-rose-600 ring-rose-100', Icon: CircleAlert, label: 'حرج' },
  warning: { box: 'bg-amber-50 text-amber-600 ring-amber-100', Icon: AlertTriangle, label: 'تحذير' },
  info: { box: 'bg-sky-50 text-sky-600 ring-sky-100', Icon: Info, label: 'معلومة' },
};

const dayKey = (ms: number) => new Date(ms).toDateString();

export const AlertsView: React.FC<{ alerts: AppAlert[]; onClear: () => void }> = ({ alerts, onClear }) => {
  if (alerts.length === 0) {
    return (
      <section className="energy-card flex flex-col items-center gap-3 p-8 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100"><BellOff className="h-6 w-6" /></span>
        <h2 className="text-base font-black text-slate-900">لا توجد تنبيهات</h2>
        <p className="text-xs font-semibold leading-5 text-slate-500">ستظهر هنا تنبيهات انخفاض البطارية، انقطاع الشبكة، ارتفاع الحمل وأعطال المحول.</p>
      </section>
    );
  }

  const counts = alerts.reduce<Record<Severity, number>>((acc, a) => ({ ...acc, [a.severity]: acc[a.severity] + 1 }), { critical: 0, warning: 0, info: 0 });

  // Group by day, newest first
  const groups: { day: string; at: number; items: AppAlert[] }[] = [];
  for (const a of alerts) {
    const k = dayKey(a.at);
    const g = groups.find((x) => x.day === k);
    if (g) g.items.push(a);
    else groups.push({ day: k, at: a.at, items: [a] });
  }

  return (
    <div className="space-y-3">
      <section className="energy-card grid grid-cols-3 gap-2 p-2.5">
        {(['critical', 'warning', 'info'] as Severity[]).map((sev) => (
          <div key={sev} className={`rounded-2xl p-3 ring-1 ${look[sev].box}`}>
            <span className="block text-[11px] font-bold text-slate-500">{look[sev].label}</span>
            <strong className="mt-1 block text-xl font-black tabular-nums">{counts[sev]}</strong>
          </div>
        ))}
      </section>

      {groups.map((g) => (
        <section key={g.day} className="energy-card overflow-hidden">
          <h2 className="border-b border-slate-100 px-4 py-2.5 text-xs font-black text-slate-500">{dateOf(g.at)}</h2>
          <ul className="divide-y divide-slate-100">
            {g.items.map((a) => {
              const { box, Icon } = look[a.severity];
              return (
                <li key={`${a.id}-${a.at}`} className="flex gap-3 px-4 py-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${box}`}><Icon className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-black text-slate-900">{a.title}</p>
                      <span className="shrink-0 text-[11px] font-bold tabular-nums text-slate-400">{timeOf(a.at)}</span>
                    </div>
                    <p className="mt-0.5 text-xs font-semibold leading-5 text-slate-600">{a.detail}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <Button variant="plain" onClick={onClear} className="w-full">مسح التنبيهات</Button>
    </div>
  );
};
