/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  BarChart3, Calendar, Download, TrendingUp, 
  Leaf, DollarSign, Sun, Home, Battery, Zap, Info, CheckCircle2
} from 'lucide-react';
import { 
  HourlyStatsPoint, DailySummary, SolarTelemetry, 
  FinancialTariffConfig, FinancialSavingsEstimate 
} from '../types/solar';

interface StatsViewProps {
  hourlyHistory: HourlyStatsPoint[];
  dailySummaries: DailySummary[];
  telemetry: SolarTelemetry;
  tariff?: FinancialTariffConfig;
  savings?: FinancialSavingsEstimate;
}

export const StatsView: React.FC<StatsViewProps> = ({
  hourlyHistory,
  dailySummaries,
  telemetry,
  tariff,
  savings,
}) => {
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');
  const [hoveredPoint, setHoveredPoint] = useState<HourlyStatsPoint | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const curSymbol = tariff?.currencySymbol || 'ر.س';
  const curRate = tariff?.gridImportRatePerKwh || 0.28;

  const curExportRate = tariff?.gridExportRatePerKwh ?? 0;

  // Week = last 7 days, month = last 30 days (the table always shows the selected range)
  const rangeSummaries = dailySummaries.slice(timeRange === 'month' ? -30 : -7);
  const sum = (pick: (d: DailySummary) => number) => rangeSummaries.reduce((acc, d) => acc + pick(d), 0);

  // Calculate high-level metrics
  const isToday = timeRange === 'today';
  const totalPv = isToday ? telemetry.pvTodayKwh : sum(d => d.solarGeneratedKwh);
  const totalLoad = isToday ? telemetry.loadTodayKwh : sum(d => d.homeConsumedKwh);
  const totalExport = isToday ? telemetry.gridTodayExportKwh : sum(d => d.gridExportedKwh);
  const totalImport = isToday ? telemetry.gridTodayImportKwh : sum(d => d.gridImportedKwh);
  const totalSavedValue = isToday && savings
    ? savings.dailyTotalSaved
    : Math.round((totalLoad - totalImport) * curRate + totalExport * curExportRate);
  const totalCo2Kg = Math.round(totalPv * 0.72);
  const treesEq = Number((totalCo2Kg / 21).toFixed(1));
  const selfSufficiency = totalLoad > 0
    ? Math.max(0, Math.min(100, Math.round(((totalLoad - totalImport) / totalLoad) * 100)))
    : 0;

  // Chart coordinate calculations
  const maxKw = 8; // Scale max kW
  const chartHeight = 180;
  const chartWidth = 500;
  const paddingX = 40;
  const paddingY = 25;
  const effectiveWidth = chartWidth - paddingX * 2;
  const effectiveHeight = chartHeight - paddingY * 2;

  const points = hourlyHistory.map((pt, idx) => {
    const x = paddingX + (idx / (hourlyHistory.length - 1)) * effectiveWidth;
    const ySolar = paddingY + effectiveHeight - (pt.solarKw / maxKw) * effectiveHeight;
    const yLoad = paddingY + effectiveHeight - (pt.loadKw / maxKw) * effectiveHeight;
    const yBattery = paddingY + effectiveHeight - (pt.batterySoc / 100) * effectiveHeight;
    return { ...pt, x, ySolar, yLoad, yBattery };
  });

  const solarPath = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.ySolar}`, '');
  const solarArea = points.length > 0
    ? `${solarPath} L ${points[points.length - 1].x} ${paddingY + effectiveHeight} L ${points[0].x} ${paddingY + effectiveHeight} Z`
    : '';

  const loadPath = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.yLoad}`, '');

  const exportReport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "الساعة,إنتاج_الألواح_كيلوواط,استهلاك_المنزل_كيلوواط,شحن_البطارية_نسبة,تبادل_الشبكة\n"
      + hourlyHistory.map(e => `${e.hour},${e.solarKw},${e.loadKw},${e.batterySoc}%,${e.gridKw}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `تقرير_طاقة_شمسية_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  return (
    <div className="p-4 sm:p-5 space-y-4">
      {/* Header and Filter Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 backdrop-blur-md">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-400" />
            <span>الإحصائيات والتقارير اليومية (Analytics)</span>
          </h2>
          <span className="text-[11px] text-slate-400">تحليل كفاءة الإنتاج، الاكتفاء الذاتي، والوفورات المالية</span>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
          <button
            onClick={() => setTimeRange('today')}
            className={`px-3 py-1 rounded-lg transition-all ${
              timeRange === 'today' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            اليوم (Live)
          </button>
          <button
            onClick={() => setTimeRange('week')}
            className={`px-3 py-1 rounded-lg transition-all ${
              timeRange === 'week' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            الأسبوع (7 أيام)
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`px-3 py-1 rounded-lg transition-all ${
              timeRange === 'month' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            الشهري
          </button>
        </div>
      </div>

      {/* 4 Summary Highlight Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/80 border border-amber-500/20 rounded-2xl p-3 backdrop-blur-md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-slate-400">إنتاج الطاقة النظيفة</span>
            <Sun className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-xl font-black font-mono text-amber-400 block">{totalPv.toFixed(1)}</span>
          <span className="text-[10px] text-slate-400">كيلوواط.ساعة (kWh)</span>
        </div>

        <div className="bg-slate-900/80 border border-emerald-500/20 rounded-2xl p-3 backdrop-blur-md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-slate-400">نسبة الاكتفاء الذاتي</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-xl font-black font-mono text-emerald-400 block">{selfSufficiency}%</span>
          <span className="text-[10px] text-slate-400">استقلال تام عن الشبكة</span>
        </div>

        <div className="bg-slate-900/80 border border-cyan-500/20 rounded-2xl p-3 backdrop-blur-md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-slate-400">الوفورات المالية</span>
            <DollarSign className="w-4 h-4 text-cyan-400" />
          </div>
          <span className="text-xl font-black font-mono text-cyan-400 block">+{totalSavedValue}</span>
          <span className="text-[10px] text-slate-400">{curSymbol} ({tariff?.currencyCode || 'SAR'})</span>
        </div>

        <div className="bg-slate-900/80 border border-teal-500/20 rounded-2xl p-3 backdrop-blur-md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-slate-400">الأثر البيئي (CO2)</span>
            <Leaf className="w-4 h-4 text-teal-400" />
          </div>
          <span className="text-xl font-black font-mono text-teal-400 block">{totalCo2Kg} كجم</span>
          <span className="text-[10px] text-slate-400">يعادل غرس {treesEq} شجرة</span>
        </div>
      </div>

      {/* Main Interactive Hourly Curve Chart */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800/80">
          <div>
            <h3 className="text-sm font-bold text-slate-200">منحنى الطاقة اللحظي على مدار الساعات</h3>
            <span className="text-[11px] text-slate-400">مقارنة توليد الألواح مقابل استهلاك المنزل</span>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-bold">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="text-slate-300">إنتاج الألواح</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <span className="text-slate-300">استهلاك المنزل</span>
            </div>
          </div>
        </div>

        {/* SVG Curve */}
        <div className="relative w-full overflow-x-auto">
          <svg 
            className="w-full h-48 select-none"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="solarAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {[0, 2, 4, 6, 8].map((val) => {
              const y = paddingY + effectiveHeight - (val / maxKw) * effectiveHeight;
              return (
                <g key={val}>
                  <line 
                    x1={paddingX} y1={y} x2={chartWidth - paddingX} y2={y} 
                    stroke="#1e293b" strokeDasharray="3 3" strokeWidth="1"
                  />
                  <text 
                    x={paddingX - 8} y={y + 3} 
                    fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace"
                  >
                    {val}kW
                  </text>
                </g>
              );
            })}

            {/* Solar Area & Path */}
            <path d={solarArea} fill="url(#solarAreaGradient)" />
            <path d={solarPath} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />

            {/* Load Path */}
            <path d={loadPath} fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="5 3" />

            {/* Interactive Data Dots & Hover Targets */}
            {points.map((pt, i) => (
              <g 
                key={i} 
                className="cursor-pointer group"
                onMouseEnter={() => setHoveredPoint(pt)}
                onClick={() => setHoveredPoint(pt)}
              >
                {/* Invisible hover bar */}
                <rect 
                  x={pt.x - 12} y={paddingY} width={24} height={effectiveHeight} 
                  fill="transparent" 
                />

                {/* Solar dot */}
                <circle 
                  cx={pt.x} cy={pt.ySolar} r={hoveredPoint?.hour === pt.hour ? 5 : 3.5} 
                  fill="#f59e0b" stroke="#0f172a" strokeWidth="2" 
                />

                {/* Load dot */}
                <circle 
                  cx={pt.x} cy={pt.yLoad} r={hoveredPoint?.hour === pt.hour ? 5 : 3} 
                  fill="#06b6d4" stroke="#0f172a" strokeWidth="2" 
                />

                {/* Hour label */}
                <text 
                  x={pt.x} y={chartHeight - 6} 
                  fill={hoveredPoint?.hour === pt.hour ? '#f59e0b' : '#64748b'} 
                  fontSize="9" textAnchor="middle" fontFamily="monospace"
                  fontWeight={hoveredPoint?.hour === pt.hour ? 'bold' : 'normal'}
                >
                  {pt.hour}
                </text>
              </g>
            ))}
          </svg>
        </div>

        {/* Hover Point Tooltip card */}
        <div className="mt-3 p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              الساعة: {hoveredPoint ? hoveredPoint.hour : 'اللحظية'}
            </span>
            <span className="text-slate-400 text-[11px]">
              {hoveredPoint ? 'بيانات النقطة المختارة من المنحنى' : 'مرر على أي ساعة في الرسم البياني لعرض التفاصيل'}
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="text-amber-400 font-bold">
              توليد: {hoveredPoint ? hoveredPoint.solarKw : telemetry.pvPower} kW
            </span>
            <span className="text-cyan-400 font-bold">
              استهلاك: {hoveredPoint ? hoveredPoint.loadKw : telemetry.loadPower} kW
            </span>
            <span className="text-emerald-400 font-bold">
              البطارية: {hoveredPoint ? hoveredPoint.batterySoc : Math.round(telemetry.batterySoc)}%
            </span>
          </div>
        </div>
      </div>

      {/* Historical Daily Breakdown Table & Export Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur-md">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-200">سجل الإنتاج للأيام السابقة</h3>
            <span className="text-[11px] text-slate-400">إحصائيات تفصيلية للأسبوع الحالي</span>
          </div>

          <button
            onClick={exportReport}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
          >
            {downloadSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">تم التصدير!</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>تصدير CSV</span>
              </>
            )}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-medium">
                <th className="pb-2">اليوم</th>
                <th className="pb-2">إنتاج الألواح</th>
                <th className="pb-2">استهلاك المنزل</th>
                <th className="pb-2">فائض مصدّر</th>
                <th className="pb-2">الاكتفاء الذاتي</th>
                <th className="pb-2">الوفر التقديري</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {rangeSummaries.map((day, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 font-sans font-bold text-slate-200">{day.date}</td>
                  <td className="py-2.5 text-amber-400 font-bold">{day.solarGeneratedKwh} kWh</td>
                  <td className="py-2.5 text-cyan-400">{day.homeConsumedKwh} kWh</td>
                  <td className="py-2.5 text-emerald-400">+{day.gridExportedKwh} kWh</td>
                  <td className="py-2.5">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                      {day.selfSufficiencyPercent}%
                    </span>
                  </td>
                  <td className="py-2.5 text-slate-200">
                    +{Math.round((day.homeConsumedKwh - day.gridImportedKwh) * curRate + day.gridExportedKwh * curExportRate)} {curSymbol}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
