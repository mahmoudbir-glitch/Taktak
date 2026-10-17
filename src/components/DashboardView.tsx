/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Sun, BatteryCharging, Battery, Home, Zap, 
  ArrowUpRight, ArrowDownLeft, ShieldCheck, 
  AlertTriangle, RefreshCw, Thermometer, Fan,
  Activity, Sparkles, Play, RotateCcw, Sliders, ChevronDown, Leaf
} from 'lucide-react';
import { 
  SolarTelemetry, SolarForecastSummary, WeatherType, 
  FinancialSavingsEstimate, FinancialTariffConfig, SmartAppliance, GeoLocation 
} from '../types/solar';
import { EnergyFlowDiagram } from './EnergyFlowDiagram';
import { SolarForecastSection } from './SolarForecastSection';
import { FinancialSavingsWidget } from './FinancialSavingsWidget';
import { SmartApplianceScheduler } from './SmartApplianceScheduler';

interface DashboardViewProps {
  telemetry: SolarTelemetry;
  forecast: SolarForecastSummary;
  location: GeoLocation;
  isLoadingWeather?: boolean;
  savings: FinancialSavingsEstimate;
  tariff: FinancialTariffConfig;
  appliances: SmartAppliance[];
  isEcoActive?: boolean;
  effectivePollInterval?: number;
  onLocationChange: (loc: GeoLocation) => void;
  onRequestGps: () => void;
  onRefreshWeather?: () => void;
  onUpdateAppliance: (updated: SmartAppliance) => void;
  onAddAppliance: (newApp: SmartAppliance) => void;
  onDeleteAppliance: (id: string) => void;
  onUpdateTariff: (newTariff: FinancialTariffConfig) => void;
  onWeatherChange: (weather: WeatherType) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onTriggerSimEvent: (eventType: 'blackout' | 'low_battery' | 'high_temp' | 'overload' | 'reset') => void;
  onNavigateToTab: (tab: 'stats' | 'alerts' | 'settings') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  telemetry,
  forecast,
  location,
  isLoadingWeather = false,
  savings,
  tariff,
  appliances,
  isEcoActive = false,
  effectivePollInterval = 5,
  onLocationChange,
  onRequestGps,
  onRefreshWeather,
  onUpdateAppliance,
  onAddAppliance,
  onDeleteAppliance,
  onUpdateTariff,
  onWeatherChange,
  onRefresh,
  isRefreshing,
  onTriggerSimEvent,
  onNavigateToTab,
}) => {
  const [selectedNodeDetails, setSelectedNodeDetails] = useState<string | null>(null);
  const [showSimControls, setShowSimControls] = useState(false);

  const isGridBlackout = telemetry.gridStatus === 'blackout' || telemetry.gridStatus === 'islanded';
  const isBatteryLow = telemetry.batterySoc < 20;
  const isOverheating = telemetry.inverterTemp > 65;
  const isOverloaded = telemetry.loadPower > 6.0;

  const currentTemp = forecast.hourlyForecasts[0]?.tempCelsius;
  const currentIrradiance = forecast.currentIrradianceWm2 ?? forecast.hourlyForecasts[0]?.irradianceWm2 ?? 0;
  const selfPowered = telemetry.loadPower > 0
    ? Math.max(0, Math.min(100, Math.round(((telemetry.loadPower - Math.max(0, telemetry.gridPower)) / telemetry.loadPower) * 100)))
    : 100;

  return (
    <div className="p-4 sm:p-5 space-y-4">
      {/* Top Quick Status Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl ${
            isGridBlackout || isBatteryLow || isOverheating
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          }`}>
            {isGridBlackout || isBatteryLow || isOverheating ? (
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            ) : (
              <ShieldCheck className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-slate-100">
                {isGridBlackout 
                  ? 'انقطاع الشبكة • وضع الطوارئ نشط'
                  : isBatteryLow
                  ? 'تنبيه: شحن البطارية منخفض جداً'
                  : isOverheating
                  ? 'تحذير: حرارة المحول مرتفعة'
                  : 'النظام الشمسي متصل ويعمل بكفاءة'}
              </span>

              {isEcoActive && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold animate-pulse">
                  <Leaf className="w-3 h-3 text-emerald-400" />
                  <span>توفير الطاقة نشط ({effectivePollInterval}ث)</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
              <span>{forecast.weatherLabel}{currentTemp !== undefined ? ` ${currentTemp}°C` : ''}</span>
              <span>•</span>
              <span>إشعاع: {currentIrradiance} W/m²</span>
              <span>•</span>
              <span className="text-amber-400 font-bold">ذاتي {selfPowered}%</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            onClick={() => setShowSimControls(!showSimControls)}
            className={`p-2 rounded-xl border text-xs flex items-center gap-1 transition-all ${
              showSimControls 
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' 
                : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
            }`}
            title="محاكاة واختبار الحالات الحرجة"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="text-[11px] font-bold">اختبار الحالات</span>
          </button>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 transition-all active:scale-95 disabled:opacity-50"
            title="تحديث البيانات اللحظية"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Quick Simulation Drawer / Drawer Bar */}
      {showSimControls && (
        <div className="p-3 bg-slate-900 border border-amber-500/40 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>لوحة اختبار الاستجابة الذكية للحالات الحرجة (Simulation Lab):</span>
            </span>
            <span className="text-[10px] text-slate-400">انقر لتوليد حالة حرجة فورية</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
            <button
              onClick={() => onTriggerSimEvent('blackout')}
              className="px-2.5 py-1.5 rounded-lg bg-rose-950/70 border border-rose-500/50 hover:bg-rose-900/60 text-rose-300 text-[11px] font-bold flex items-center justify-center gap-1 transition-all"
            >
              <span>انقطاع الشبكة</span>
              <Zap className="w-3 h-3 text-rose-400" />
            </button>

            <button
              onClick={() => onTriggerSimEvent('low_battery')}
              className="px-2.5 py-1.5 rounded-lg bg-amber-950/70 border border-amber-500/50 hover:bg-amber-900/60 text-amber-300 text-[11px] font-bold flex items-center justify-center gap-1 transition-all"
            >
              <span>هبوط بطارية (12%)</span>
              <Battery className="w-3 h-3 text-amber-400" />
            </button>

            <button
              onClick={() => onTriggerSimEvent('high_temp')}
              className="px-2.5 py-1.5 rounded-lg bg-orange-950/70 border border-orange-500/50 hover:bg-orange-900/60 text-orange-300 text-[11px] font-bold flex items-center justify-center gap-1 transition-all"
            >
              <span>حرارة محول (72°C)</span>
              <Thermometer className="w-3 h-3 text-orange-400" />
            </button>

            <button
              onClick={() => onTriggerSimEvent('overload')}
              className="px-2.5 py-1.5 rounded-lg bg-purple-950/70 border border-purple-500/50 hover:bg-purple-900/60 text-purple-300 text-[11px] font-bold flex items-center justify-center gap-1 transition-all"
            >
              <span>حمل زائد (7.4 kW)</span>
              <Activity className="w-3 h-3 text-purple-400" />
            </button>

            <button
              onClick={() => onTriggerSimEvent('reset')}
              className="col-span-2 sm:col-span-1 px-2.5 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/60 hover:bg-emerald-900/60 text-emerald-300 text-[11px] font-bold flex items-center justify-center gap-1 transition-all"
            >
              <RotateCcw className="w-3 h-3 text-emerald-400" />
              <span>إعادة الوضع الطبيعي</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Interactive Animated Energy Flow Diagram */}
      <EnergyFlowDiagram 
        telemetry={telemetry} 
        onNodeClick={(id) => setSelectedNodeDetails(selectedNodeDetails === id ? null : id)} 
      />

      {/* Telemetry Detail Grid (4 Core Metric Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        
        {/* Card 1: Solar PV Production */}
        <div className="bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-amber-500/30 rounded-2xl p-4 shadow-lg backdrop-blur-md relative overflow-hidden group hover:border-amber-500/50 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-300">إنتاج الألواح اللحظي</h4>
                <span className="text-[10px] text-slate-500">PV Solar Generation</span>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-amber-400 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30">
              ذروة اليوم: {telemetry.pvPeakTodayKw} kW
            </span>
          </div>

          <div className="flex items-baseline justify-between mt-2">
            <div>
              <span className="text-3xl font-black font-mono tracking-tight text-amber-400">
                {telemetry.pvPower.toFixed(2)}
              </span>
              <span className="text-sm font-bold text-slate-400 mr-1.5">كيلوواط (kW)</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">إنتاج اليوم التراكمي</span>
              <span className="text-base font-black font-mono text-slate-100">{telemetry.pvTodayKwh.toFixed(1)} kWh</span>
            </div>
          </div>

          {/* Sub strings breakdown */}
          <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
              <div className="text-slate-400 font-sans text-[10px] flex items-center justify-between">
                <span>المصفوفة 1 (MPPT 1)</span>
                <span className="text-amber-400 font-bold">{((telemetry.pvVoltage1 * telemetry.pvCurrent1) / 1000).toFixed(2)} kW</span>
              </div>
              <div className="text-slate-300 mt-1 flex justify-between">
                <span>{telemetry.pvVoltage1} V</span>
                <span>{telemetry.pvCurrent1} A</span>
              </div>
            </div>

            <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
              <div className="text-slate-400 font-sans text-[10px] flex items-center justify-between">
                <span>المصفوفة 2 (MPPT 2)</span>
                <span className="text-amber-400 font-bold">{((telemetry.pvVoltage2 * telemetry.pvCurrent2) / 1000).toFixed(2)} kW</span>
              </div>
              <div className="text-slate-300 mt-1 flex justify-between">
                <span>{telemetry.pvVoltage2} V</span>
                <span>{telemetry.pvCurrent2} A</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Battery Storage SOC */}
        <div className={`bg-gradient-to-b from-slate-900/90 to-slate-950/90 border rounded-2xl p-4 shadow-lg backdrop-blur-md relative overflow-hidden transition-all ${
          isBatteryLow ? 'border-rose-500/50 shadow-rose-950/30' : 'border-emerald-500/30 hover:border-emerald-500/50'
        }`}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-xl ${isBatteryLow ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                {telemetry.batteryPower > 0 ? (
                  <BatteryCharging className="w-5 h-5 animate-pulse" />
                ) : (
                  <Battery className="w-5 h-5" />
                )}
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-300">نسبة شحن البطارية (SOC)</h4>
                <span className="text-[10px] text-slate-500">Lithium-ion LiFePO4</span>
              </div>
            </div>

            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border ${
              telemetry.batteryPower > 0 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}>
              {telemetry.batteryPower > 0 ? `شحن +${telemetry.batteryPower} kW` : `تفريغ ${telemetry.batteryPower} kW`}
            </span>
          </div>

          <div className="flex items-baseline justify-between mt-2">
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-black font-mono tracking-tight ${isBatteryLow ? 'text-rose-400' : 'text-emerald-400'}`}>
                {Math.round(telemetry.batterySoc)}%
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {((telemetry.batterySoc / 100) * telemetry.batteryCapacityKwh).toFixed(1)} / {telemetry.batteryCapacityKwh} kWh
              </span>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400 block">وقت التشغيل التقديري</span>
              <span className="text-sm font-black font-mono text-slate-200">
                {telemetry.batteryPower < -0.1 ? `~ ${telemetry.batteryRemainingHours} ساعة` : 'احتياطي كامل 100%'}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-800/80 rounded-full h-2 mt-3 overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 rounded-full ${
                telemetry.batterySoc < 20
                  ? 'bg-rose-500'
                  : telemetry.batterySoc < 40
                  ? 'bg-amber-500'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-400'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, telemetry.batterySoc))}%` }}
            />
          </div>

          <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>الجهد: <strong className="text-slate-200">{telemetry.batteryVoltage} V</strong></span>
            <span>الحرارة: <strong className="text-slate-200">{telemetry.batteryTemp} °C</strong></span>
            <span>الصحة (SOH): <strong className="text-emerald-400">{telemetry.batteryHealth}%</strong></span>
          </div>
        </div>

        {/* Card 3: Home Consumption */}
        <div className="bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-cyan-500/30 rounded-2xl p-4 shadow-lg backdrop-blur-md relative overflow-hidden group hover:border-cyan-500/50 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                <Home className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-300">معدل الاستهلاك المنزلي</h4>
                <span className="text-[10px] text-slate-500">Live Home Power Load</span>
              </div>
            </div>

            <span className="text-xs font-mono font-bold text-cyan-400 px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30">
              حمولة: {Math.round((telemetry.loadPower / telemetry.inverterRatedPowerKw) * 100)}%
            </span>
          </div>

          <div className="flex items-baseline justify-between mt-2">
            <div>
              <span className={`text-3xl font-black font-mono tracking-tight ${isOverloaded ? 'text-rose-400' : 'text-cyan-400'}`}>
                {telemetry.loadPower.toFixed(2)}
              </span>
              <span className="text-sm font-bold text-slate-400 mr-1.5">كيلوواط (kW)</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">إجمالي استهلاك اليوم</span>
              <span className="text-base font-black font-mono text-slate-100">{telemetry.loadTodayKwh.toFixed(1)} kWh</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
              <div className="text-slate-400 font-sans text-[10px] flex items-center justify-between">
                <span>أحمال حرجة (Essential)</span>
                <span className="text-cyan-300 font-bold">{telemetry.essentialLoadPower} kW</span>
              </div>
              <span className="text-[10px] text-slate-500 font-sans mt-0.5 block">إنارة، ثلاجة، شبكة</span>
            </div>

            <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
              <div className="text-slate-400 font-sans text-[10px] flex items-center justify-between">
                <span>أحمال ثقيلة (Heavy)</span>
                <span className="text-cyan-300 font-bold">{telemetry.heavyLoadPower} kW</span>
              </div>
              <span className="text-[10px] text-slate-500 font-sans mt-0.5 block">تكييف، سخان ماء</span>
            </div>
          </div>
        </div>

        {/* Card 4: Grid Status & Exchange */}
        <div className={`bg-gradient-to-b from-slate-900/90 to-slate-950/90 border rounded-2xl p-4 shadow-lg backdrop-blur-md relative overflow-hidden transition-all ${
          isGridBlackout
            ? 'border-rose-500/50 shadow-rose-950/30'
            : telemetry.gridPower < 0
            ? 'border-emerald-500/30 hover:border-emerald-500/50'
            : 'border-slate-700/80 hover:border-slate-600'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-xl ${
                isGridBlackout ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-300'
              }`}>
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-300">شبكة الكهرباء العامة</h4>
                <span className="text-[10px] text-slate-500">Public Utility Grid</span>
              </div>
            </div>

            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border ${
              isGridBlackout
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                : telemetry.gridPower < 0
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}>
              {isGridBlackout ? 'انقطاع تام (Blackout)' : telemetry.gridPower < 0 ? 'تصدير فائض' : 'سحب من الشبكة'}
            </span>
          </div>

          <div className="flex items-baseline justify-between mt-2">
            <div>
              <span className={`text-3xl font-black font-mono tracking-tight ${
                isGridBlackout ? 'text-rose-400' : telemetry.gridPower < 0 ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {Math.abs(telemetry.gridPower).toFixed(2)}
              </span>
              <span className="text-sm font-bold text-slate-400 mr-1.5">كيلوواط (kW)</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">فائض اليوم المصدر</span>
              <span className="text-base font-black font-mono text-emerald-400">{telemetry.gridTodayExportKwh.toFixed(1)} kWh</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>الجهد: <strong className="text-slate-200">{isGridBlackout ? '0.0 V' : `${telemetry.gridVoltage} V`}</strong></span>
            <span>التردد: <strong className="text-slate-200">{isGridBlackout ? '0.0 Hz' : `${telemetry.gridFrequency} Hz`}</strong></span>
            <span>المستورد اليوم: <strong className="text-slate-200">{telemetry.gridTodayImportKwh.toFixed(1)} kWh</strong></span>
          </div>
        </div>

      </div>

      {/* Solar Production Forecast Section (Upcoming Hours) */}
      <SolarForecastSection 
        forecast={forecast} 
        location={location}
        isLoadingWeather={isLoadingWeather}
        onWeatherChange={onWeatherChange} 
        onLocationChange={onLocationChange}
        onRequestGps={onRequestGps}
        onRefreshWeather={onRefreshWeather}
      />

      {/* Financial Savings & Utility Bill Calculator */}
      <FinancialSavingsWidget
        savings={savings}
        tariff={tariff}
        onUpdateTariff={onUpdateTariff}
      />

      {/* Smart Appliance & Heavy Load Surplus Automation */}
      <SmartApplianceScheduler
        appliances={appliances}
        telemetry={telemetry}
        onUpdateAppliance={onUpdateAppliance}
        onAddAppliance={onAddAppliance}
        onDeleteAppliance={onDeleteAppliance}
      />

      {/* Inverter Hardware Telemetry Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700/80 text-amber-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-200">محول الطاقة (Inverter): Deye Hybrid 8kW</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">
                {telemetry.inverterStatus === 'normal' ? 'جاهزية كاملة' : telemetry.inverterStatus}
              </span>
            </div>
            <span className="text-[11px] text-slate-400">كفاءة التحويل الحالية: {telemetry.inverterEfficiency}% • استهلاك داخلي: 45W</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <Thermometer className={`w-4 h-4 ${telemetry.inverterTemp > 60 ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`} />
            <span className="text-slate-400">الحرارة:</span>
            <span className={`font-bold ${telemetry.inverterTemp > 60 ? 'text-rose-400' : 'text-slate-200'}`}>
              {telemetry.inverterTemp} °C
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Fan className={`w-4 h-4 text-slate-400 ${telemetry.fanSpeedPercent > 50 ? 'animate-spin' : ''}`} />
            <span className="text-slate-400">المروحة:</span>
            <span className="font-bold text-slate-200">{telemetry.fanSpeedPercent}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
