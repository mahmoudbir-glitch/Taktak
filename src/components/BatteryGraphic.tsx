/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Battery drawn as a battery: the fill level is the charge, its colour the
 * level band (green / amber / red). While charging, a wave rises through the
 * fill and a bolt blinks; while discharging the stripes run downward; at rest
 * the fill is still.
 */

import React, { useId } from 'react';

export type BatteryState = 'charging' | 'discharging' | 'idle';

export const levelColor = (soc: number | null) =>
  soc == null ? '#94a3b8' : soc <= 20 ? '#e11d48' : soc <= 50 ? '#f59e0b' : '#10b981';

export const BatteryGraphic: React.FC<{ soc: number | null; state: BatteryState; width?: number }> = ({
  soc,
  state,
  width = 132,
}) => {
  const id = useId().replace(/:/g, '');
  const pct = soc == null ? 0 : Math.max(0, Math.min(100, soc));
  const color = levelColor(soc);

  // Body: 120 x 210 at (20, 30); inner area padded by 8
  const inner = { x: 28, y: 38, w: 104, h: 194 };
  const fillH = (inner.h * pct) / 100;
  const fillY = inner.y + inner.h - fillH;

  return (
    <svg width={width} height={(width * 250) / 160} viewBox="0 0 160 250" role="img" aria-label={`البطارية ${soc == null ? 'غير معروفة' : `${Math.round(pct)}%`}`}>
      <defs>
        <clipPath id={`${id}-inner`}>
          <rect x={inner.x} y={inner.y} width={inner.w} height={inner.h} rx="14" />
        </clipPath>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.85" />
          <stop offset="1" stopColor={color} />
        </linearGradient>
        <pattern id={`${id}-stripes`} width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
          <rect width="12" height="24" fill="white" opacity="0.18" />
        </pattern>
      </defs>

      {/* cap and body */}
      <rect x="58" y="12" width="44" height="18" rx="6" fill="#cbd5e1" />
      <rect x="20" y="30" width="120" height="210" rx="22" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="4" />

      <g clipPath={`url(#${id}-inner)`}>
        {/* fill level */}
        <rect x={inner.x} y={fillY} width={inner.w} height={fillH} fill={`url(#${id}-fill)`} style={{ transition: 'y 0.8s ease, height 0.8s ease' }} />

        {/* moving stripes over the fill (direction = flow) */}
        {state !== 'idle' && (
          <g className={state === 'charging' ? 'battery-stripes-up' : 'battery-stripes-down'}>
            <rect x={inner.x - 40} y={fillY - 48} width={inner.w + 80} height={fillH + 96} fill={`url(#${id}-stripes)`} />
          </g>
        )}

        {/* rising wave on the surface while charging */}
        {state === 'charging' && pct < 100 && (
          <path className="battery-wave" d={`M ${inner.x - 104} ${fillY} q 13 -7 26 0 t 26 0 t 26 0 t 26 0 t 26 0 t 26 0 t 26 0 t 26 0 t 26 0 t 26 0 V ${fillY + 10} H ${inner.x - 104} Z`} fill="white" opacity="0.35" />
        )}

        {/* level ticks every 25% */}
        {[25, 50, 75].map((t) => (
          <line key={t} x1={inner.x} x2={inner.x + 12} y1={inner.y + inner.h * (1 - t / 100)} y2={inner.y + inner.h * (1 - t / 100)} stroke="#94a3b8" strokeWidth="2" opacity="0.5" />
        ))}
      </g>

      {/* bolt while charging */}
      {state === 'charging' && (
        <path className="bolt-blink" d="M86 96 L64 140 H80 L72 176 L98 126 H82 Z" fill="white" stroke={color} strokeWidth="3" strokeLinejoin="round" />
      )}
    </svg>
  );
};
