/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "Energy flow now": the inverter in the middle with the sun, grid, house and
 * battery around it on a plus shape. Each spoke has its source's colour; when
 * power moves along it, dashes and sparks run in the direction of the flow.
 * Nodes are rounded squares (Taktak's own shape).
 */

import React, { useId } from 'react';
import { Battery, BatteryCharging, BatteryMedium, Home, Sun, UtilityPole, Zap } from 'lucide-react';
import type { SmartessSnapshot } from '../services/smartessClient';
import { timeOf } from '../lib/format';

const ACTIVE = 0.05; // kW below which a flow counts as idle
const AC_VOLTS = 230;

type Spoke = { key: string; from: [number, number]; to: [number, number]; color: string; active: boolean; towardHub: boolean; kw: number };

const kwText = (kw: number | null) => (kw == null ? '—' : `${Math.abs(kw).toFixed(2)} kW`);

const Pill: React.FC<{ amps: number | null; tone: string; muted?: boolean }> = ({ amps, tone, muted }) => (
  <span dir="ltr" className={`inline-flex h-[22px] min-w-[3.4rem] items-center justify-center gap-[3px] rounded-full px-2 text-xs font-black ring-1 ring-inset ${tone} ${muted ? 'opacity-50' : ''}`}>
    {amps == null ? '—' : amps < 0.05 ? '0' : amps.toFixed(1)}
    <span className="text-[10px] font-extrabold opacity-70">A</span>
  </span>
);

export const EnergyFlow: React.FC<{
  snapshot: SmartessSnapshot | null;
  readingAt: number | null;
  isLive: boolean;
  onOpen: (page: 'battery' | 'forecast') => void;
}> = ({ snapshot: s, readingAt, isLive, onOpen }) => {
  const id = useId().replace(/:/g, '');

  const solarKw = s?.pvPowerW != null ? s.pvPowerW / 1000 : null;
  const homeKw = s?.loadPowerW != null ? s.loadPowerW / 1000 : null;
  const gridKw = s?.gridPowerW != null ? s.gridPowerW / 1000 : null;
  const batteryKw = s?.batteryPowerW != null ? s.batteryPowerW / 1000 : null;
  const soc = s?.batterySoc ?? null;

  const solarActive = isLive && (solarKw ?? 0) > ACTIVE;
  const homeActive = isLive && (homeKw ?? 0) > ACTIVE;
  const charging = isLive && (batteryKw ?? 0) > ACTIVE;
  const discharging = isLive && (batteryKw ?? 0) < -ACTIVE;
  const gridOn = s?.gridConnected === true;
  const importing = isLive && gridOn && (gridKw ?? 0) > ACTIVE;
  const anyFlow = solarActive || homeActive || charging || discharging || importing;

  // Hub (inverter) at 200,230 in a 400x460 drawing; nodes 135 units away
  const spokes: Spoke[] = [
    { key: 'sun', from: [200, 128], to: [200, 190], color: '#f59e0b', active: solarActive, towardHub: true, kw: solarKw ?? 0 },
    { key: 'grid', from: [101, 230], to: [160, 230], color: '#8b5cf6', active: importing, towardHub: true, kw: gridKw ?? 0 },
    { key: 'home', from: [299, 230], to: [240, 230], color: '#0ea5e9', active: homeActive, towardHub: false, kw: homeKw ?? 0 },
    { key: 'battery', from: [200, 332], to: [200, 270], color: '#10b981', active: charging || discharging, towardHub: discharging, kw: batteryKw ?? 0 },
  ];
  const width = (kw: number) => 1.8 + Math.min(Math.abs(kw), 6) * 0.25;
  const dur = (kw: number) => Math.max(0.7, 2.4 - Math.min(Math.abs(kw), 6) * 0.28);

  const amps = (kw: number | null) => (kw == null ? null : (Math.abs(kw) * 1000) / AC_VOLTS);
  const BatteryIcon = charging ? BatteryCharging : discharging ? BatteryMedium : Battery;

  const nodeClass = (on: boolean, gradient: string) =>
    `relative flex h-16 w-16 items-center justify-center rounded-[1.35rem] border-2 transition ${
      on ? `${gradient} border-white` : 'bg-slate-100 border-slate-200'
    }`;
  const glow = (on: boolean, rgba: string): React.CSSProperties | undefined =>
    on ? { boxShadow: `0 10px 26px ${rgba}` } : undefined;

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_18px_55px_rgba(30,41,90,0.09)]" aria-label="مخطط تدفق الطاقة">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(245,158,11,0.10),transparent_30%),radial-gradient(circle_at_14%_50%,rgba(139,92,246,0.08),transparent_28%),radial-gradient(circle_at_86%_50%,rgba(14,165,233,0.08),transparent_28%),radial-gradient(circle_at_50%_78%,rgba(16,185,129,0.09),transparent_30%)]" />

      <div className="relative flex items-start justify-between px-4 pt-4">
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-extrabold ${isLive ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          <span className={`h-2 w-2 rounded-full ${isLive ? 'animate-pulse bg-emerald-500' : 'bg-amber-500'}`} />
          تدفق الطاقة الآن
        </span>
        {readingAt != null && (
          <span className={`whitespace-nowrap text-[11px] font-bold ${isLive ? 'text-slate-500' : 'text-amber-700'}`}>
            آخر قراءة <bdi dir="ltr">{timeOf(readingAt)}</bdi>{!isLive && ' · متأخرة'}
          </span>
        )}
      </div>

      <div className="relative mx-auto aspect-[400/460] w-full max-w-md">
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 400 460" fill="none" aria-hidden="true">
          <defs>
            <filter id={`${id}-glow`}><feGaussianBlur stdDeviation="2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          {spokes.map((sp) => {
            const [a, b] = sp.towardHub ? [sp.from, sp.to] : [sp.to, sp.from];
            const d = `M ${a[0]} ${a[1]} L ${b[0]} ${b[1]}`;
            const pathId = `${id}-${sp.key}`;
            return (
              <g key={sp.key}>
                <path id={pathId} d={d} stroke={sp.color} strokeWidth={sp.active ? width(sp.kw) : 2} strokeLinecap="round"
                  strokeDasharray={sp.active ? undefined : '0.1 6'} opacity={sp.active ? 0.4 : 0.75} />
                {[sp.from, sp.to].map(([x, y], i) => (
                  <rect key={i} x={x - 2.5} y={y - 2.5} width="5" height="5" rx="1.5" fill="white" stroke={sp.color} strokeWidth="1.3" />
                ))}
                {sp.active && (
                  <path d={d} stroke={sp.color} strokeWidth={width(sp.kw)} strokeLinecap="round" strokeDasharray="9 7" filter={`url(#${id}-glow)`}>
                    <animate attributeName="stroke-dashoffset" from="16" to="0" dur={`${dur(sp.kw) / 2}s`} repeatCount="indefinite" />
                  </path>
                )}
                {sp.active && [0, 1 / 2].map((o) => (
                  <rect key={o} x="-3" y="-3" width="6" height="6" rx="2" fill="white" stroke={sp.color} strokeWidth="1.4" filter={`url(#${id}-glow)`}>
                    <animateMotion dur={`${dur(sp.kw)}s`} begin={`${o * dur(sp.kw)}s`} repeatCount="indefinite" rotate="auto">
                      <mpath href={`#${pathId}`} />
                    </animateMotion>
                  </rect>
                ))}
              </g>
            );
          })}
          {/* inverter hub: a slowly turning dashed square while power moves */}
          <g>
            <rect x="160" y="190" width="80" height="80" rx="26" fill="none" stroke={anyFlow ? '#0d9488' : '#cbd5e1'}
              strokeWidth="2" strokeDasharray="2 8" strokeLinecap="round" opacity={anyFlow ? 0.8 : 0.5} />
            {anyFlow && <animateTransform attributeName="transform" type="rotate" from="0 200 230" to="360 200 230" dur="10s" repeatCount="indefinite" />}
          </g>
        </svg>

        {/* Sun (top) */}
        <button type="button" onClick={() => onOpen('forecast')} className="absolute left-1/2 top-[21.7%] z-10 -translate-x-1/2 -translate-y-1/2 active:scale-95" aria-label="الألواح الشمسية">
          <div className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 w-28 -translate-x-1/2 text-center">
            <div className="text-xs font-black text-slate-700">الطاقة الشمسية</div>
            <div className={`text-sm font-black ${solarActive ? 'text-amber-600' : 'text-slate-500'}`}><bdi dir="ltr">{kwText(solarKw)}</bdi></div>
          </div>
          <div className={nodeClass(solarActive, 'bg-gradient-to-br from-amber-300 to-amber-500')} style={glow(solarActive, 'rgba(245,158,11,0.35)')}>
            <Sun className={`h-7 w-7 ${solarActive ? 'text-white' : 'text-slate-400'}`} strokeWidth={2.2} />
          </div>
          <div className="pointer-events-none absolute left-1/2 top-full mt-1.5 -translate-x-1/2">
            <Pill amps={isLive ? amps(solarKw) : null} tone="bg-amber-50 text-amber-700 ring-amber-100" muted={!solarActive} />
          </div>
        </button>

        {/* Grid (left) */}
        <div className="absolute left-[17%] top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <div className={nodeClass(gridOn, 'bg-gradient-to-br from-violet-400 to-violet-600')} style={glow(gridOn, 'rgba(139,92,246,0.3)')}>
            <UtilityPole className={`h-7 w-7 ${gridOn ? 'text-white' : 'text-slate-400'}`} strokeWidth={2.2} />
          </div>
          <div className="pointer-events-none absolute left-1/2 top-full mt-1.5 w-28 -translate-x-1/2 text-center">
            <div className="text-xs font-black text-slate-700">الشبكة</div>
            <div className={`text-[11px] font-bold ${gridOn ? 'text-violet-500' : 'text-slate-400'}`}>
              {s?.gridConnected == null || !isLive ? 'غير معروفة' : !gridOn ? 'مقطوعة' : importing ? 'تسحب منها' : 'متوفرة'}
            </div>
            <div className={`text-sm font-black ${importing ? 'text-violet-600' : 'text-slate-500'}`}><bdi dir="ltr">{kwText(gridKw)}</bdi></div>
            <div className="mt-1"><Pill amps={isLive && gridKw != null ? (gridKw * 1000) / (s?.gridVoltage || AC_VOLTS) : null} tone="bg-violet-50 text-violet-700 ring-violet-100" muted={!importing} /></div>
          </div>
        </div>

        {/* Home (right) */}
        <div className="absolute left-[83%] top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <div className={nodeClass(true, 'bg-gradient-to-br from-sky-400 to-sky-600')} style={glow(true, 'rgba(14,165,233,0.3)')}>
            <Home className="h-7 w-7 text-white" strokeWidth={2.2} />
          </div>
          <div className="pointer-events-none absolute left-1/2 top-full mt-1.5 w-28 -translate-x-1/2 text-center">
            <div className="text-xs font-black text-slate-700">المنزل</div>
            <div className="text-sm font-black text-sky-600"><bdi dir="ltr">{kwText(homeKw)}</bdi></div>
            <div className="mt-1"><Pill amps={isLive ? amps(homeKw) : null} tone="bg-sky-50 text-sky-700 ring-sky-100" /></div>
          </div>
        </div>

        {/* Battery (bottom) */}
        <button type="button" onClick={() => onOpen('battery')} className="absolute left-1/2 top-[78.3%] z-10 -translate-x-1/2 -translate-y-1/2 active:scale-95" aria-label="البطارية">
          <div className={nodeClass(true, 'bg-gradient-to-br from-emerald-400 to-emerald-600')} style={glow(true, 'rgba(16,185,129,0.35)')}>
            <div className="flex h-11 w-11 flex-col items-center justify-center rounded-xl bg-white">
              <BatteryIcon className={`h-4 w-4 ${charging ? 'text-emerald-500' : discharging ? 'text-amber-500' : 'text-slate-400'}`} strokeWidth={2.3} />
              <span className="text-[11px] font-black leading-tight text-slate-800">{soc == null ? '—' : `${Math.round(soc)}%`}</span>
            </div>
          </div>
          <div className="pointer-events-none absolute left-1/2 top-full mt-1.5 w-32 -translate-x-1/2 text-center">
            <div className="text-xs font-black text-slate-700">
              البطارية {isLive && <span className="font-bold text-slate-400">· {charging ? 'تشحن' : discharging ? 'تفرّغ' : 'ثابتة'}</span>}
            </div>
            <div className={`text-sm font-black ${charging ? 'text-emerald-600' : discharging ? 'text-amber-600' : 'text-slate-500'}`}><bdi dir="ltr">{kwText(batteryKw)}</bdi></div>
          </div>
        </button>

        {/* Inverter (centre) */}
        <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
          <div className={`flex h-14 w-14 items-center justify-center rounded-[1.1rem] border-2 ${anyFlow ? 'border-white bg-gradient-to-br from-teal-400 to-teal-600 shadow-[0_8px_24px_rgba(13,148,136,0.35)]' : 'border-slate-200 bg-slate-100'}`}>
            <Zap className={`h-6 w-6 ${anyFlow ? 'text-white' : 'text-slate-400'}`} strokeWidth={2.4} fill={anyFlow ? 'currentColor' : 'none'} />
          </div>
        </div>
      </div>
    </section>
  );
};
