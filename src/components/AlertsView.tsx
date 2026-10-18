/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { AppAlert, Severity } from '../lib/alerts';
import { timeOf } from '../lib/format';
import { Button, Card } from './ui';

const bar: Record<Severity, string> = {
  critical: 'bg-rose-600',
  warning: 'bg-amber-500',
  info: 'bg-slate-400',
};

export const AlertsView: React.FC<{ alerts: AppAlert[]; onClear: () => void }> = ({ alerts, onClear }) => (
  <Card title="التنبيهات">
    {alerts.length === 0 ? (
      <p className="p-4 text-sm text-slate-500">لا توجد تنبيهات.</p>
    ) : (
      <>
        <ul>
          {alerts.map((a) => (
            <li key={a.id} className="flex gap-3 px-4 py-3 border-b border-slate-100">
              <span className={`w-1 shrink-0 rounded-sm ${bar[a.severity]}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-bold text-slate-900">{a.title}</p>
                  <span className="text-xs text-slate-400 tabular-nums">{timeOf(a.at)}</span>
                </div>
                <p className="text-sm text-slate-600 mt-0.5">{a.detail}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="p-3">
          <Button variant="plain" onClick={onClear} className="w-full">مسح التنبيهات</Button>
        </div>
      </>
    )}
  </Card>
);
