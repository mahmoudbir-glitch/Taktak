/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Today from 00:00 to 24:00: solar (amber area), house load (sky line) in kW
 * on the left scale, battery charge (emerald dashed line) in % on the right.
 */

import React from 'react';
import type { HistoryPoint } from '../lib/history';

const W = 340;
const H = 170;
const PAD = { l: 30, r: 30, t: 10, b: 22 };

export const DayChart: React.FC<{ points: HistoryPoint[]; showSoc?: boolean }> = ({ points, showSoc = true }) => {
  if (points.length < 2) {
    return (
      <p className="py-6 text-center text-xs font-semibold text-slate-500">
        يُرسم منحنى اليوم من القراءات التي يجلبها التطبيق وهو مفتوح. سيظهر بعد بضع دقائق.
      </p>
    );
  }

  const hasKw = points.some((p) => p.pv != null || p.load != null);
  const start = new Date(points[0].t);
  start.setHours(0, 0, 0, 0);
  const t0 = start.getTime();
  const span = 86_400_000;
  const maxKw = Math.max(1, ...points.map((p) => Math.max(p.pv ?? 0, p.load ?? 0) / 1000));
  const top = Math.ceil(maxKw);

  const x = (t: number) => PAD.l + ((t - t0) / span) * (W - PAD.l - PAD.r);
  const yKw = (w: number) => PAD.t + (1 - w / 1000 / top) * (H - PAD.t - PAD.b);
  const ySoc = (s: number) => PAD.t + (1 - s / 100) * (H - PAD.t - PAD.b);

  // Break lines where the app was closed (gap > 10 minutes)
  const segments = (get: (p: HistoryPoint) => number | null, y: (v: number) => number) => {
    const out: string[] = [];
    let d = '';
    let prev: HistoryPoint | null = null;
    for (const p of points) {
      const v = get(p);
      if (v == null || (prev && p.t - prev.t > 600_000)) {
        if (d) out.push(d);
        d = '';
      }
      if (v != null) d += `${d ? 'L' : 'M'}${x(p.t).toFixed(1)} ${y(v).toFixed(1)} `;
      prev = p;
    }
    if (d) out.push(d);
    return out;
  };

  const pvLines = segments((p) => p.pv, yKw);
  const pvAreas = pvLines.map((d) => {
    const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
    const x1 = nums[0];
    const x2 = nums[nums.length - 2];
    return `${d} L${x2} ${H - PAD.b} L${x1} ${H - PAD.b} Z`;
  });
  const loadLines = segments((p) => p.load, yKw);
  const socLines = showSoc ? segments((p) => p.soc, ySoc) : [];

  return (
    <div dir="ltr">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="منحنى اليوم">
        {/* grid */}
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={PAD.l} x2={W - PAD.r} y1={PAD.t + f * (H - PAD.t - PAD.b)} y2={PAD.t + f * (H - PAD.t - PAD.b)} stroke="#e2e8f0" strokeDasharray="3 4" />
            {hasKw && <text x={PAD.l - 6} y={PAD.t + f * (H - PAD.t - PAD.b) + 3} textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="700">
              {((1 - f) * top).toFixed(f === 0.5 && top % 2 ? 1 : 0)}
            </text>}
            {showSoc && (
              <text x={W - PAD.r + 6} y={PAD.t + f * (H - PAD.t - PAD.b) + 3} fontSize="9" fill="#10b981" fontWeight="700">
                {Math.round((1 - f) * 100)}%
              </text>
            )}
          </g>
        ))}
        {[0, 6, 12, 18, 24].map((h) => (
          <text key={h} x={x(t0 + h * 3_600_000)} y={H - 6} textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="700">
            {String(h).padStart(2, '0')}:00
          </text>
        ))}
        {/* now */}
        <line x1={x(Date.now())} x2={x(Date.now())} y1={PAD.t} y2={H - PAD.b} stroke="#6366f1" strokeWidth="1" opacity="0.4" />

        {pvAreas.map((d, i) => <path key={`a${i}`} d={d} fill="#fbbf24" opacity="0.25" />)}
        {pvLines.map((d, i) => <path key={`p${i}`} d={d} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinejoin="round" />)}
        {loadLines.map((d, i) => <path key={`l${i}`} d={d} fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinejoin="round" />)}
        {socLines.map((d, i) => <path key={`s${i}`} d={d} fill="none" stroke="#10b981" strokeWidth="1.6" strokeDasharray="4 3" />)}
      </svg>
      <div className="mt-1 flex justify-center gap-4 text-[11px] font-bold text-slate-500" dir="rtl">
        {hasKw && <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-amber-400" />الألواح kW</span>}
        {hasKw && <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 bg-sky-500" />المنزل kW</span>}
        {showSoc && <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 border-t-2 border-dashed border-emerald-500" />البطارية %</span>}
      </div>
    </div>
  );
};
