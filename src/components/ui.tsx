/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Taktak design (Solar family): soft white cards on a pale page, rounded corners,
 * a light teal-tinted shadow, and one pastel colour per energy source.
 */

import React from 'react';

/** Colour per energy source: chip background, icon colour, ring */
export type Accent = 'sun' | 'battery' | 'home' | 'grid' | 'money' | 'neutral';

export const accent: Record<Accent, { chip: string; text: string; bar: string }> = {
  sun: { chip: 'bg-amber-50 ring-amber-200/80', text: 'text-amber-600', bar: 'bg-amber-400' },
  battery: { chip: 'bg-emerald-50 ring-emerald-200/80', text: 'text-emerald-600', bar: 'bg-emerald-500' },
  home: { chip: 'bg-sky-50 ring-sky-200/80', text: 'text-sky-600', bar: 'bg-sky-500' },
  grid: { chip: 'bg-violet-50 ring-violet-200/80', text: 'text-violet-600', bar: 'bg-violet-500' },
  money: { chip: 'bg-teal-50 ring-teal-200/80', text: 'text-teal-700', bar: 'bg-teal-600' },
  neutral: { chip: 'bg-slate-50 ring-slate-200', text: 'text-slate-500', bar: 'bg-slate-400' },
};

export const cardClass = 'energy-card';

export const Chip: React.FC<{ tone: Accent; children: React.ReactNode }> = ({ tone, children }) => (
  <span className={`inline-flex w-9 h-9 items-center justify-center rounded-xl ring-1 ${accent[tone].chip} ${accent[tone].text}`}>
    {children}
  </span>
);

export const Card: React.FC<{ title?: string; className?: string; children: React.ReactNode }> = ({
  title,
  className = '',
  children,
}) => (
  <section className={`${cardClass} ${className}`}>
    {title && <h2 className="px-4 pt-4 pb-1 text-[13px] font-extrabold text-slate-800">{title}</h2>}
    {children}
  </section>
);

/** One row of a key/value list */
export const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-center justify-between px-4 py-3 text-sm border-b border-slate-100 last:border-b-0">
    <span className="text-slate-500 font-semibold">{label}</span>
    <span className="font-bold text-slate-900 tabular-nums">{value}</span>
  </div>
);

type Tone = 'neutral' | 'good' | 'warn' | 'bad';

const toneText: Record<Tone, string> = {
  neutral: 'text-slate-500',
  good: 'text-emerald-600',
  warn: 'text-amber-600',
  bad: 'text-rose-600',
};

/** Metric card: coloured icon chip, label, large value, one line of context */
export const Tile: React.FC<{
  label: string;
  value: string;
  unit?: string;
  note?: string;
  tone?: Tone;
  icon: React.ReactNode;
  accentTone?: Accent;
  onClick?: () => void;
}> = ({ label, value, unit, note, tone = 'neutral', icon, accentTone = 'neutral', onClick }) => (
  <div
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onClick={onClick}
    className={`${cardClass} p-4 flex flex-col gap-3 ${onClick ? 'cursor-pointer active:scale-[0.99] transition-transform' : ''}`}
  >
    <div className="flex items-center gap-2.5">
      <Chip tone={accentTone}>{icon}</Chip>
      <span className="text-[13px] font-bold text-slate-600">{label}</span>
    </div>
    <div>
      <span className="text-[28px] leading-none font-black text-slate-900 tabular-nums">{value}</span>
      {unit && <span className="text-sm font-bold text-slate-400 ms-1">{unit}</span>}
    </div>
    <p className={`text-xs font-semibold min-h-[1rem] ${toneText[tone]}`}>{note ?? ''}</p>
  </div>
);

export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'plain' }
> = ({ variant = 'primary', className = '', ...props }) => (
  <button
    {...props}
    className={`inline-flex h-12 items-center justify-center gap-2 px-5 rounded-2xl text-sm font-extrabold transition disabled:opacity-50 active:scale-[0.99] ${
      variant === 'primary'
        ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-[0_8px_20px_rgba(15,23,42,0.18)]'
        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
    } ${className}`}
  />
);

export const inputClass =
  'w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-400 focus:ring-4 focus:ring-slate-100';

/** Taktak mark: a sun with a lightning bolt — two "tak"s of energy */
export const Logo: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
    <defs>
      <radialGradient id="taktak-sun" cx="0.4" cy="0.35" r="0.75">
        <stop offset="0" stopColor="#ffe27a" />
        <stop offset="1" stopColor="#ffb21e" />
      </radialGradient>
    </defs>
    <g stroke="#ffc94a" strokeWidth="4" strokeLinecap="round">
      <line x1="32" y1="4" x2="32" y2="10" /><line x1="32" y1="54" x2="32" y2="60" />
      <line x1="4" y1="32" x2="10" y2="32" /><line x1="54" y1="32" x2="60" y2="32" />
      <line x1="12" y1="12" x2="16" y2="16" /><line x1="48" y1="48" x2="52" y2="52" />
      <line x1="52" y1="12" x2="48" y2="16" /><line x1="16" y1="48" x2="12" y2="52" />
    </g>
    <rect x="14" y="14" width="36" height="36" rx="12" fill="url(#taktak-sun)" />
    <path d="M35 19 L24 34 H31 L28 45 L40 29 H33 Z" fill="#1e3a8a" />
  </svg>
);

/** Circular gauge (0–100) */
export const Ring: React.FC<{ value: number | null; size?: number; color: string; children?: React.ReactNode }> = ({
  value,
  size = 168,
  color,
  children,
}) => {
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e7efee" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
};

/** Card heading with a coloured icon box, title and optional subtitle */
export const CardHead: React.FC<{ icon: React.ReactNode; title: string; subtitle?: string; tone: Accent; right?: React.ReactNode }> = ({
  icon, title, subtitle, tone, right,
}) => (
  <div className="flex items-center gap-3">
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1 ${accent[tone].chip} ${accent[tone].text}`}>{icon}</span>
    <div className="min-w-0 flex-1">
      <h2 className="text-sm font-black text-slate-900">{title}</h2>
      {subtitle && <p className="truncate text-[11px] font-bold text-slate-500">{subtitle}</p>}
    </div>
    {right}
  </div>
);

/**
 * Collapsible card: the header row is always visible; the body opens and
 * closes with a tap. Built on <details>, so it works without JavaScript.
 */
export const Collapsible: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  tone: Accent;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ icon, title, subtitle, tone, defaultOpen = false, children }) => (
  <details className="energy-card group overflow-hidden" open={defaultOpen}>
    <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1 ${accent[tone].chip} ${accent[tone].text}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black text-slate-900">{title}</span>
        {subtitle && <span className="block truncate text-[11px] font-bold text-slate-500">{subtitle}</span>}
      </span>
      <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true">
        <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </summary>
    <div className="border-t border-slate-100 px-4 pb-4 pt-1">{children}</div>
  </details>
);

/** Tinted number box: small label, big value, optional unit and foot */
export const StatBox: React.FC<{ label: string; value: string; unit?: string; tone: Accent; foot?: React.ReactNode }> = ({
  label, value, unit, tone, foot,
}) => {
  const bg: Record<Accent, string> = {
    sun: 'bg-amber-50', battery: 'bg-emerald-50', home: 'bg-sky-50', grid: 'bg-violet-50', money: 'bg-teal-50', neutral: 'bg-slate-50',
  };
  const fg: Record<Accent, string> = {
    sun: 'text-amber-700', battery: 'text-emerald-700', home: 'text-sky-700', grid: 'text-violet-700', money: 'text-teal-700', neutral: 'text-slate-900',
  };
  return (
    <div className={`flex min-w-0 flex-col rounded-2xl p-3.5 ${bg[tone]}`}>
      <span className="truncate text-[11px] font-bold text-slate-500">{label}</span>
      <strong className={`mt-1 block whitespace-nowrap text-xl font-black leading-7 ${fg[tone]}`}>
        <bdi dir="auto">{value}{unit && <small className="text-xs font-extrabold"> {unit}</small>}</bdi>
      </strong>
      {foot && <span className="mt-1 text-[11px] font-semibold text-slate-500">{foot}</span>}
    </div>
  );
};

/** Key/value list inside a card or collapsible */
export const InfoList: React.FC<{ rows: [string, React.ReactNode][] }> = ({ rows }) => (
  <dl className="divide-y divide-slate-100 text-[13px]">
    {rows.map(([label, value]) => (
      <div key={label} className="flex items-start justify-between gap-3 py-2.5">
        <dt className="shrink-0 font-bold text-slate-500">{label}</dt>
        <dd className="text-left font-black text-slate-800"><bdi>{value}</bdi></dd>
      </div>
    ))}
  </dl>
);
