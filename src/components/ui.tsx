/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared building blocks: flat white cards on a light page, thin borders,
 * square corners, one accent colour. No gradients, glows or shadows.
 */

import React from 'react';

export const Card: React.FC<{ title?: string; className?: string; children: React.ReactNode }> = ({
  title,
  className = '',
  children,
}) => (
  <section className={`bg-white border border-slate-200 rounded-lg ${className}`}>
    {title && (
      <h2 className="px-4 pt-3 pb-2 text-xs font-bold text-slate-500 border-b border-slate-100">{title}</h2>
    )}
    {children}
  </section>
);

/** One row of a key/value list */
export const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-center justify-between px-4 py-2.5 text-sm border-b border-slate-100 last:border-b-0">
    <span className="text-slate-500">{label}</span>
    <span className="font-semibold text-slate-900 tabular-nums">{value}</span>
  </div>
);

type Tone = 'neutral' | 'good' | 'warn' | 'bad';

const toneText: Record<Tone, string> = {
  neutral: 'text-slate-500',
  good: 'text-emerald-700',
  warn: 'text-amber-700',
  bad: 'text-rose-700',
};

/** Square tile: label, large value with unit, one line of context */
export const Tile: React.FC<{
  label: string;
  value: string;
  unit?: string;
  note?: string;
  tone?: Tone;
  icon: React.ReactNode;
  onClick?: () => void;
}> = ({ label, value, unit, note, tone = 'neutral', icon, onClick }) => (
  <div
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onClick={onClick}
    className={`bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between min-h-[8.5rem] ${
      onClick ? 'cursor-pointer hover:border-slate-400' : ''
    }`}
  >
    <div className="flex items-center justify-between text-slate-500">
      <span className="text-xs font-bold">{label}</span>
      <span className="text-slate-400">{icon}</span>
    </div>
    <div className="mt-3">
      <span className="text-3xl font-bold text-slate-900 tabular-nums">{value}</span>
      {unit && <span className="text-sm font-semibold text-slate-500 ms-1">{unit}</span>}
    </div>
    <p className={`text-xs mt-1 min-h-[1rem] ${toneText[tone]}`}>{note ?? ''}</p>
  </div>
);

export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'plain' }
> = ({ variant = 'primary', className = '', ...props }) => (
  <button
    {...props}
    className={`h-10 px-4 rounded-md text-sm font-bold transition-colors disabled:opacity-50 ${
      variant === 'primary'
        ? 'bg-slate-900 text-white hover:bg-slate-800'
        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
    } ${className}`}
  />
);

export const inputClass =
  'w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-slate-900';
