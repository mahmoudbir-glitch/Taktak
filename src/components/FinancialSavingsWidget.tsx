/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Banknote, TrendingUp, Sliders, ChevronDown, ChevronUp, 
  HelpCircle, CheckCircle2, ArrowDownRight, ArrowUpRight, 
  Coins, Sparkles, Calendar, DollarSign
} from 'lucide-react';
import { FinancialTariffConfig, FinancialSavingsEstimate } from '../types/solar';
import { CURRENCY_PRESETS } from '../services/solarSim';

interface FinancialSavingsWidgetProps {
  savings: FinancialSavingsEstimate;
  tariff: FinancialTariffConfig;
  onUpdateTariff: (newTariff: FinancialTariffConfig) => void;
}

export const FinancialSavingsWidget: React.FC<FinancialSavingsWidgetProps> = ({
  savings,
  tariff,
  onUpdateTariff,
}) => {
  const [showConfig, setShowConfig] = useState(false);
  const [activeView, setActiveView] = useState<'daily' | 'monthly'>('daily');
  const [tempTariff, setTempTariff] = useState<FinancialTariffConfig>({ ...tariff });

  const handleSelectPreset = (preset: FinancialTariffConfig) => {
    setTempTariff(preset);
    onUpdateTariff(preset);
  };

  const handleSaveCustomTariff = () => {
    onUpdateTariff(tempTariff);
    setShowConfig(false);
  };

  return (
    <div className="bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800/80 rounded-3xl p-4 sm:p-5 shadow-2xl backdrop-blur-xl relative overflow-hidden">
      {/* Background emerald aura */}
      <div className="absolute top-0 left-1/3 w-64 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-800/70">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100">
                تقدير التوفير المالي وفواتير الكهرباء
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                {tariff.currencyCode} ({tariff.currencySymbol})
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              مقارنة الإنتاج الشمسي مقابل تكلفة الاعتماد الكامل على شبكة الكهرباء
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Day / Month Tab Switcher */}
          <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => setActiveView('daily')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeView === 'daily'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              اليومي
            </button>
            <button
              onClick={() => setActiveView('monthly')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeView === 'monthly'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              الشهري التقديري
            </button>
          </div>

          {/* Config Settings Toggle */}
          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`p-2 rounded-xl border text-xs flex items-center gap-1 transition-all ${
              showConfig
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
            }`}
            title="تخصيص العملة وسعر الكيلوواط"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="text-[11px] font-bold hidden sm:inline">التعرفة والعملة</span>
          </button>
        </div>
      </div>

      {/* Main Financial Highlights */}
      {activeView === 'daily' ? (
        /* DAILY VIEW */
        <div className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Total Daily Saved Card */}
            <div className="sm:col-span-1 bg-gradient-to-br from-emerald-950/50 via-slate-900/80 to-slate-950 border border-emerald-500/40 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
              <div>
                <span className="text-[11px] text-emerald-300/80 font-bold block mb-1">
                  إجمالي التوفير اليومي (Net Savings)
                </span>
                <div className="flex items-baseline gap-1.5 my-1">
                  <span className="text-3xl font-black font-mono tracking-tight text-emerald-400">
                    +{savings.dailyTotalSaved}
                  </span>
                  <span className="text-sm font-bold text-slate-300">{tariff.currencySymbol}</span>
                </div>
                <span className="text-[10px] text-slate-400">اليوم التراكمي</span>
              </div>

              <div className="mt-3 pt-3 border-t border-emerald-500/20 flex items-center justify-between text-xs">
                <span className="text-slate-400">نسبة خفض الفاتورة:</span>
                <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {savings.dailyBillReductionPercent}% وفر
                </span>
              </div>
            </div>

            {/* Bill Comparison Card: Without Solar vs With Solar */}
            <div className="sm:col-span-2 bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-200">
                  مقارنة فاتورة استهلاك اليوم (Grid vs Solar)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  تعرفة الشراء: {tariff.gridImportRatePerKwh} {tariff.currencySymbol}/kWh
                </span>
              </div>

              {/* Visual Comparative Bars */}
              <div className="space-y-2.5 my-2">
                {/* 1. Cost Without Solar */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">فاتورة اليوم بدون نظام شمسي (كامل أحمال المنزل من الشبكة):</span>
                    <span className="font-mono font-bold text-rose-400 line-through">
                      {savings.dailyCostWithoutSolar} {tariff.currencySymbol}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800/80 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-rose-500/70 h-full rounded-full w-full" />
                  </div>
                </div>

                {/* 2. Actual Cost With Solar */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-emerald-300 font-bold">الفاتورة الفعلية اليوم (ما تم سحبه من الشبكة فقط):</span>
                    <span className="font-mono font-black text-emerald-400">
                      {savings.dailyActualGridCost} {tariff.currencySymbol}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800/80 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500" 
                      style={{ 
                        width: `${Math.max(6, Math.min(100, Math.round((savings.dailyActualGridCost / Math.max(0.1, savings.dailyCostWithoutSolar)) * 100)))}%` 
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Sub Breakdown Tags */}
              <div className="mt-2 pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">وفر الاستهلاك الذاتي:</span>
                  <span className="font-bold text-emerald-400">
                    +{savings.dailySelfConsumptionSavings} {tariff.currencySymbol}
                  </span>
                  <span className="text-[10px] text-slate-500 block">({savings.dailySelfConsumedKwh} kWh تم توفيرها)</span>
                </div>

                <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">عائد فائض التصدير للشبكة:</span>
                  <span className="font-bold text-amber-400">
                    +{savings.dailyExportRevenue} {tariff.currencySymbol}
                  </span>
                  <span className="text-[10px] text-slate-500 block">({savings.dailyExportedKwh} kWh ضخ بالشبكة)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* MONTHLY VIEW */
        <div className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Monthly Total Saved Card */}
            <div className="sm:col-span-1 bg-gradient-to-br from-emerald-950/50 via-slate-900/80 to-slate-950 border border-emerald-500/40 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
              <div>
                <span className="text-[11px] text-emerald-300/80 font-bold block mb-1">
                  التوفير الشهري التقديري (Monthly Savings)
                </span>
                <div className="flex items-baseline gap-1.5 my-1">
                  <span className="text-3xl font-black font-mono tracking-tight text-emerald-400">
                    +{savings.monthlyTotalSaved}
                  </span>
                  <span className="text-sm font-bold text-slate-300">{tariff.currencySymbol}</span>
                </div>
                <span className="text-[10px] text-slate-400">بناءً على دورة شهرية 30 يوماً</span>
              </div>

              <div className="mt-3 pt-3 border-t border-emerald-500/20 flex items-center justify-between text-xs">
                <span className="text-slate-400">تخفيض الفاتورة الشهرية:</span>
                <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {savings.monthlyNetSavingsPercent}% وفر
                </span>
              </div>
            </div>

            {/* Monthly Projections & Payback */}
            <div className="sm:col-span-2 bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-200">
                    توقعات الفاتورة الشهرية مع وبدون الطاقة الشمسية
                  </span>
                  <span className="text-[10px] text-amber-400 font-mono font-bold">
                    إنتاج شهري متوقع: ~{savings.monthlyEstimatedPvKwh} kWh
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="p-3 bg-slate-900/80 rounded-xl border border-rose-500/30">
                    <span className="text-[10px] text-slate-400 block">فاتورة الكهرباء بدون طاقة شمسية:</span>
                    <span className="text-lg font-black font-mono text-rose-400 block mt-0.5">
                      {savings.monthlyBillWithoutSolar} {tariff.currencySymbol}
                    </span>
                    <span className="text-[10px] text-slate-500">فاتورة الشبكة الكاملة</span>
                  </div>

                  <div className="p-3 bg-slate-900/80 rounded-xl border border-emerald-500/30">
                    <span className="text-[10px] text-slate-400 block">فاتورة الكهرباء المتوقعة مع شمسك:</span>
                    <span className="text-lg font-black font-mono text-emerald-400 block mt-0.5">
                      {savings.monthlyActualGridBill} {tariff.currencySymbol}
                    </span>
                    <span className="text-[10px] text-emerald-400/80 font-bold">وفر شهري {savings.monthlyTotalSaved} {tariff.currencySymbol}</span>
                  </div>
                </div>
              </div>

              {/* Annual & Payback strip */}
              <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">التوفير السنوي التقديري:</span>
                  <strong className="text-emerald-400 font-bold">
                    +{savings.yearlyEstimatedSaved} {tariff.currencySymbol}/سنة
                  </strong>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-800">
                  <span className="text-slate-400">فترة استرداد رأس المال التقديرية:</span>
                  <strong className="text-amber-400 font-bold">
                    ~ {savings.paybackPeriodYears} سنة
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Collapsible Tariff & Currency Configuration Drawer */}
      {showConfig && (
        <div className="mt-4 p-4 bg-slate-950 border border-slate-800 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-200 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <span>إعدادات العملة وتعرفة الكهرباء المحلية:</span>
            </span>
            <button
              onClick={() => setShowConfig(false)}
              className="text-[11px] text-slate-400 hover:text-slate-200"
            >
              إغلاق
            </button>
          </div>

          {/* Quick Currency Presets */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 block mb-2">
              اختر العملة والتعرفة المعتمدة لدولتك:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CURRENCY_PRESETS.map((preset) => (
                <button
                  key={preset.currencyCode}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`p-2 rounded-xl border text-right transition-all text-xs ${
                    tariff.currencyCode === preset.currencyCode
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 font-bold shadow-sm'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span className="block">{preset.currencyName}</span>
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                    {preset.gridImportRatePerKwh} {preset.currencySymbol}/kWh
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom tariff inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                سعر شراء الكهرباء من الشبكة ({tempTariff.currencySymbol}/kWh):
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={tempTariff.gridImportRatePerKwh}
                onChange={(e) => setTempTariff({ ...tempTariff, gridImportRatePerKwh: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                سعر بيع/تصدير الفائض للشبكة ({tempTariff.currencySymbol}/kWh):
              </label>
              <input
                type="number"
                step="0.01"
                min="0.0"
                value={tempTariff.gridExportRatePerKwh}
                onChange={(e) => setTempTariff({ ...tempTariff, gridExportRatePerKwh: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                تكلفة تأسيس النظام الشمسي ({tempTariff.currencySymbol}):
              </label>
              <input
                type="number"
                step="500"
                min="1000"
                value={tempTariff.systemInstallCost}
                onChange={(e) => setTempTariff({ ...tempTariff, systemInstallCost: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            onClick={handleSaveCustomTariff}
            className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-98"
          >
            تطبيق وحفظ التعرفة المخصصة
          </button>
        </div>
      )}
    </div>
  );
};
