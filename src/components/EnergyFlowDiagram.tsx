/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sun, BatteryCharging, Battery, Home, Zap, Flame, Radio } from 'lucide-react';
import { SolarTelemetry } from '../types/solar';

interface EnergyFlowProps {
  telemetry: SolarTelemetry;
  onNodeClick?: (nodeId: string) => void;
}

export const EnergyFlowDiagram: React.FC<EnergyFlowProps> = ({ telemetry, onNodeClick }) => {
  const isCharging = telemetry.batteryPower > 0.05;
  const isDischarging = telemetry.batteryPower < -0.05;
  const isExporting = telemetry.gridPower < -0.05;
  const isImporting = telemetry.gridPower > 0.05;
  const isPvActive = telemetry.pvPower > 0.05;
  const isGridBlackout = telemetry.gridStatus === 'blackout' || telemetry.gridStatus === 'islanded';

  return (
    <div className="relative w-full bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800/80 rounded-3xl p-5 shadow-2xl backdrop-blur-xl overflow-hidden">
      {/* Background ambient solar glow */}
      <div 
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full pointer-events-none blur-3xl opacity-20"
        style={{
          background: isPvActive ? 'radial-gradient(circle, #f59e0b 0%, #10b981 70%, transparent 100%)' : '#3b82f6',
        }}
      />

      {/* Header bar */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <h3 className="text-sm font-bold text-slate-200">مخطط تدفق الطاقة الحي (Live Energy Flow)</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800/80 text-amber-400 border border-slate-700/60">
            كفاءة العاكس: {telemetry.unavailable?.includes('inverterEfficiency') ? '—' : `${telemetry.inverterEfficiency}%`}
          </span>
        </div>
      </div>

      {/* SVG Canvas for dynamic flowing energy lines */}
      <div className="relative w-full aspect-[16/11] min-h-[300px] max-h-[360px] flex items-center justify-center">
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 280">
          <defs>
            <linearGradient id="pvFlowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#eab308" />
            </linearGradient>
            <linearGradient id="batteryChargeGrad" x1="50%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="batteryDischargeGrad" x1="0%" y1="100%" x2="50%" y2="0%">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#eab308" />
            </linearGradient>
            <linearGradient id="loadFlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
            <linearGradient id="gridExportGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#14b8a6" />
            </linearGradient>
            <linearGradient id="gridImportGrad" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
          </defs>

          {/* 1. Line: PV (200, 35) to Inverter (200, 140) */}
          <line
            x1="200" y1="52" x2="200" y2="115"
            stroke="#334155" strokeWidth="4" strokeLinecap="round"
          />
          {isPvActive && (
            <line
              x1="200" y1="52" x2="200" y2="115"
              stroke="url(#pvFlowGrad)"
              strokeWidth="4"
              strokeDasharray="6 6"
              strokeLinecap="round"
              className="animate-flow-forward"
            />
          )}

          {/* 2. Line: Inverter (200, 140) to Battery (75, 230) */}
          <path
            d="M 180 155 C 130 180, 100 190, 80 215"
            fill="none"
            stroke="#334155"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {isCharging && (
            <path
              d="M 180 155 C 130 180, 100 190, 80 215"
              fill="none"
              stroke="url(#batteryChargeGrad)"
              strokeWidth="4"
              strokeDasharray="6 6"
              strokeLinecap="round"
              className="animate-flow-forward"
            />
          )}
          {isDischarging && (
            <path
              d="M 180 155 C 130 180, 100 190, 80 215"
              fill="none"
              stroke="url(#batteryDischargeGrad)"
              strokeWidth="4"
              strokeDasharray="6 6"
              strokeLinecap="round"
              className="animate-flow-backward"
            />
          )}

          {/* 3. Line: Inverter (200, 140) to Home Load (325, 230) */}
          <path
            d="M 220 155 C 270 180, 300 190, 320 215"
            fill="none"
            stroke="#334155"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M 220 155 C 270 180, 300 190, 320 215"
            fill="none"
            stroke="url(#loadFlowGrad)"
            strokeWidth="4"
            strokeDasharray="6 6"
            strokeLinecap="round"
            className="animate-flow-forward"
          />

          {/* 4. Line: Inverter (200, 140) to Grid (340, 140) */}
          <line
            x1="230" y1="140" x2="310" y2="140"
            stroke="#334155" strokeWidth="4" strokeLinecap="round"
          />
          {isExporting && (
            <line
              x1="230" y1="140" x2="310" y2="140"
              stroke="url(#gridExportGrad)"
              strokeWidth="4"
              strokeDasharray="6 6"
              strokeLinecap="round"
              className="animate-flow-forward"
            />
          )}
          {isImporting && (
            <line
              x1="230" y1="140" x2="310" y2="140"
              stroke="url(#gridImportGrad)"
              strokeWidth="4"
              strokeDasharray="6 6"
              strokeLinecap="round"
              className="animate-flow-backward"
            />
          )}
        </svg>

        {/* Center Node: Inverter (العاكس الذكي) */}
        <div 
          onClick={() => onNodeClick?.('inverter')}
          className="absolute z-20 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer group"
        >
          <div className="relative p-3.5 rounded-2xl bg-slate-900 border-2 border-amber-500/80 shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
            <Zap className="w-8 h-8 text-amber-400 animate-pulse" />
            <div className="absolute -bottom-1 -right-1 px-1.5 py-0.2 bg-slate-800 border border-slate-700 rounded-md text-[9px] font-mono text-emerald-400">
              {telemetry.unavailable?.includes('inverterTemp') ? '—' : `${telemetry.inverterTemp}°C`}
            </div>
          </div>
          <span className="mt-1 text-xs font-bold text-slate-200">المحول (Inverter)</span>
          <span className="text-[10px] text-slate-400 font-mono">{telemetry.inverterRatedPowerKw} kW Hybrid</span>
        </div>

        {/* Top Node: Solar Panels (الألواح الشمسية) */}
        <div 
          onClick={() => onNodeClick?.('pv')}
          className="absolute z-20 top-1 left-1/2 -translate-x-1/2 flex flex-col items-center cursor-pointer group"
        >
          <div className="relative p-3 rounded-2xl bg-amber-950/40 border border-amber-500/60 shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
            <Sun className="w-7 h-7 text-amber-400 animate-spin-slow" />
            <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px]">
              PV
            </span>
          </div>
          <span className="mt-1 text-xs font-bold text-amber-300">الألواح الشمسية</span>
          <span className="text-sm font-black font-mono text-amber-400 drop-shadow">
            {telemetry.pvPower.toFixed(2)} kW
          </span>
        </div>

        {/* Bottom Left Node: Battery Bank (البطارية) */}
        <div 
          onClick={() => onNodeClick?.('battery')}
          className="absolute z-20 bottom-1 left-4 sm:left-10 flex flex-col items-center cursor-pointer group"
        >
          <div className={`relative p-3 rounded-2xl border shadow-lg group-hover:scale-105 transition-transform ${
            telemetry.batterySoc < 20 
              ? 'bg-rose-950/50 border-rose-500/80 shadow-rose-500/30' 
              : 'bg-emerald-950/40 border-emerald-500/60 shadow-emerald-500/20'
          }`}>
            {isCharging ? (
              <BatteryCharging className="w-7 h-7 text-emerald-400" />
            ) : (
              <Battery className={`w-7 h-7 ${telemetry.batterySoc < 20 ? 'text-rose-400 animate-bounce' : 'text-emerald-400'}`} />
            )}
            <span className="absolute -bottom-2 -left-2 px-1.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-[10px] font-mono font-bold text-slate-200">
              {telemetry.batteryVoltage}V
            </span>
          </div>
          <span className="mt-1 text-xs font-bold text-emerald-300">البطارية (SOC)</span>
          <div className="flex items-center gap-1">
            <span className={`text-sm font-black font-mono ${telemetry.batterySoc < 20 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {Math.round(telemetry.batterySoc)}%
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              ({telemetry.batteryPower > 0 ? `+${telemetry.batteryPower}` : telemetry.batteryPower} kW)
            </span>
          </div>
        </div>

        {/* Bottom Right Node: Home Consumption (الاستهلاك المنزلي) */}
        <div 
          onClick={() => onNodeClick?.('load')}
          className="absolute z-20 bottom-1 right-4 sm:right-10 flex flex-col items-center cursor-pointer group"
        >
          <div className="relative p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/60 shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <Home className="w-7 h-7 text-cyan-400" />
            <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-cyan-500 text-slate-950 font-black text-[9px]">
              Load
            </span>
          </div>
          <span className="mt-1 text-xs font-bold text-cyan-300">أحمال المنزل</span>
          <span className="text-sm font-black font-mono text-cyan-400 drop-shadow">
            {telemetry.loadPower.toFixed(2)} kW
          </span>
        </div>

        {/* Right Node: Grid (الشبكة العامة) */}
        <div 
          onClick={() => onNodeClick?.('grid')}
          className="absolute z-20 top-1/2 -translate-y-1/2 right-2 sm:right-5 flex flex-col items-center cursor-pointer group"
        >
          <div className={`relative p-3 rounded-2xl border shadow-lg group-hover:scale-105 transition-transform ${
            isGridBlackout
              ? 'bg-rose-950/40 border-rose-500/60 shadow-rose-500/20'
              : isExporting
              ? 'bg-emerald-950/40 border-emerald-500/60 shadow-emerald-500/20'
              : 'bg-slate-900 border-slate-700 shadow-slate-900'
          }`}>
            <Radio className={`w-6 h-6 ${isGridBlackout ? 'text-rose-400' : isExporting ? 'text-emerald-400' : 'text-slate-300'}`} />
            {isGridBlackout && (
              <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-rose-600 text-white font-bold text-[9px]">
                منقطعة
              </span>
            )}
          </div>
          <span className="mt-1 text-[11px] font-bold text-slate-300">الشبكة العامة</span>
          <span className="text-[11px] font-mono font-bold">
            {isGridBlackout ? (
              <span className="text-rose-400">انقطاع (Blackout)</span>
            ) : isExporting ? (
              <span className="text-emerald-400">تصدير {Math.abs(telemetry.gridPower).toFixed(2)} kW</span>
            ) : isImporting ? (
              <span className="text-amber-400">سحب {telemetry.gridPower.toFixed(2)} kW</span>
            ) : (
              <span className="text-slate-400">0.00 kW</span>
            )}
          </span>
        </div>
      </div>

      {/* Dynamic Summary Strip at bottom of flow */}
      <div className="mt-3 grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/80 text-center">
        <div className="bg-slate-900/60 rounded-xl p-2 border border-slate-800/60">
          <span className="text-[10px] text-slate-400 block">إنتاج اليوم الإجمالي</span>
          <span className="text-sm font-black font-mono text-amber-400">{telemetry.pvTodayKwh.toFixed(1)} kWh</span>
        </div>
        <div className="bg-slate-900/60 rounded-xl p-2 border border-slate-800/60">
          <span className="text-[10px] text-slate-400 block">استهلاك اليوم</span>
          <span className="text-sm font-black font-mono text-cyan-400">{telemetry.loadTodayKwh.toFixed(1)} kWh</span>
        </div>
        <div className="bg-slate-900/60 rounded-xl p-2 border border-slate-800/60">
          <span className="text-[10px] text-slate-400 block">وقت البطارية المتبقي</span>
          <span className="text-sm font-black font-mono text-emerald-400">
            {telemetry.batteryPower < -0.1 ? `~ ${telemetry.batteryRemainingHours} ساعة` : 'مشحونة / فائض'}
          </span>
        </div>
      </div>
    </div>
  );
};
