/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Taqati design: soft white cards on a pale mint page, rounded corners,
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

export const cardClass =
  'bg-white border border-[#dde6e4] rounded-[1.15rem] shadow-[0_12px_32px_rgba(13,148,136,0.06)]';

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
    className={`h-12 px-5 rounded-2xl text-sm font-extrabold transition disabled:opacity-50 active:scale-[0.99] ${
      variant === 'primary'
        ? 'bg-teal-700 text-white hover:bg-teal-800 shadow-[0_8px_20px_rgba(15,118,110,0.22)]'
        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
    } ${className}`}
  />
);

export const inputClass =
  'w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-50';

/** Taqati mark: a sun rising over a leaf-shaped battery cell */
export const Logo: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
    <rect x="2" y="2" width="60" height="60" rx="18" fill="#0f766e" />
    <circle cx="32" cy="27" r="9" fill="#fcd34d" />
    <g stroke="#fcd34d" strokeWidth="3.5" strokeLinecap="round">
      <line x1="32" y1="9" x2="32" y2="13" />
      <line x1="45" y1="14" x2="42" y2="17" />
      <line x1="19" y1="14" x2="22" y2="17" />
      <line x1="50" y1="27" x2="46" y2="27" />
      <line x1="14" y1="27" x2="18" y2="27" />
    </g>
    <path d="M14 46 Q32 34 50 46 L50 52 Q32 42 14 52 Z" fill="#5eead4" />
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
