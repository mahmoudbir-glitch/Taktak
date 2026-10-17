/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Bell, AlertTriangle, AlertCircle, Info, CheckCheck, 
  Volume2, VolumeX, ShieldAlert, Sparkles, Sliders, Check, Trash2, Battery
} from 'lucide-react';
import { SmartAlert, AlertThresholds } from '../types/solar';
import { playAlertSound } from '../services/sound';

interface AlertsViewProps {
  alerts: SmartAlert[];
  thresholds: AlertThresholds;
  onUpdateThresholds: (newThresholds: AlertThresholds) => void;
  onAcknowledgeAlert: (id: string) => void;
  onClearAllAlerts: () => void;
  onTriggerTestAlert: (severity: 'critical' | 'warning' | 'info') => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  alerts,
  thresholds,
  onUpdateThresholds,
  onAcknowledgeAlert,
  onClearAllAlerts,
  onTriggerTestAlert,
}) => {
  const [activeTab, setActiveTab] = useState<'alerts' | 'rules'>('alerts');

  const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length;

  return (
    <div className="p-4 sm:p-5 space-y-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <span>التنبيهات الذكية للحالات الحرجة (Smart Alarms)</span>
            </h2>
            {unacknowledgedCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-mono font-bold animate-pulse">
                {unacknowledgedCount} جديد
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-400">مراقبة تلقائية للبطارية، حرارة المحول، وانقطاع الشبكة</span>
        </div>

        {/* Tab switcher: Alerts Log vs Threshold Rules */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'alerts' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>سجل التنبيهات ({alerts.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'rules' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>عتبات التنبيه (Rules)</span>
          </button>
        </div>
      </div>

      {activeTab === 'alerts' ? (
        <>
          {/* Quick Actions & Test Buttons */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-3.5 backdrop-blur-md flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300">اختبار نغمة التنبيه:</span>
              <button
                onClick={() => {
                  playAlertSound('critical');
                  onTriggerTestAlert('critical');
                }}
                className="px-2.5 py-1 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-bold hover:bg-rose-900/60 transition-all flex items-center gap-1"
              >
                <span>حالة حرجة 🚨</span>
              </button>
              <button
                onClick={() => {
                  playAlertSound('warning');
                  onTriggerTestAlert('warning');
                }}
                className="px-2.5 py-1 rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs font-bold hover:bg-amber-900/60 transition-all flex items-center gap-1"
              >
                <span>تحذير ⚠️</span>
              </button>
            </div>

            {alerts.length > 0 && (
              <button
                onClick={onClearAllAlerts}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-rose-300 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 ml-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>مسح السجل</span>
              </button>
            )}
          </div>

          {/* Alerts List */}
          <div className="space-y-2.5">
            {alerts.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-10 text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                  <CheckCheck className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-200">لا توجد تنبيهات حالية</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  نظام الطاقة الشمسية والبطارية ومحول الطاقة يعملون ضمن الحدود الآمنة والطبيعية تماماً.
                </p>
              </div>
            ) : (
              alerts.map((alert) => {
                const isCritical = alert.severity === 'critical';
                const isWarning = alert.severity === 'warning';

                return (
                  <div
                    key={alert.id}
                    className={`relative rounded-2xl p-4 border transition-all ${
                      isCritical
                        ? 'bg-gradient-to-r from-rose-950/40 to-slate-900/90 border-rose-500/50 shadow-lg shadow-rose-950/20'
                        : isWarning
                        ? 'bg-gradient-to-r from-amber-950/40 to-slate-900/90 border-amber-500/50 shadow-lg shadow-amber-950/20'
                        : 'bg-slate-900/90 border-slate-800 shadow-md'
                    } ${alert.acknowledged ? 'opacity-70' : 'opacity-100'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                        isCritical
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : isWarning
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      }`}>
                        {isCritical ? (
                          <AlertCircle className="w-5 h-5 animate-pulse" />
                        ) : isWarning ? (
                          <AlertTriangle className="w-5 h-5" />
                        ) : (
                          <Info className="w-5 h-5" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-slate-100">{alert.title}</h4>
                            <span className={`px-2 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                              isCritical ? 'bg-rose-500 text-white' : isWarning ? 'bg-amber-500 text-slate-950' : 'bg-slate-700 text-slate-200'
                            }`}>
                              {isCritical ? 'حرج جداً' : isWarning ? 'تحذير' : 'إشعار'}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400">{alert.timestamp}</span>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">{alert.message}</p>

                        {alert.recommendedAction && (
                          <div className="mt-2.5 p-2 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300 flex items-start gap-1.5">
                            <span className="text-amber-400 font-bold shrink-0">الإجراء المقترح:</span>
                            <span>{alert.recommendedAction}</span>
                          </div>
                        )}

                        <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/80">
                          {alert.metric && (
                            <span className="text-[11px] font-mono text-slate-400">
                              المؤشر المرصود: <strong className="text-slate-200">{alert.metric}</strong>
                            </span>
                          )}

                          {!alert.acknowledged && (
                            <button
                              onClick={() => onAcknowledgeAlert(alert.id)}
                              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs font-bold flex items-center gap-1 transition-all mr-auto"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>تأكيد الاطلاع</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : (
        /* Alert Rules & Config Tab */
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl backdrop-blur-md space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-100">تخصيص حدود وعتبات التنبيه الذكية</h3>
              <span className="text-[11px] text-slate-400">تحديد المعايير التي يُطلق التطبيق عندها إشارات الإنذار</span>
            </div>
            <button
              onClick={() => onUpdateThresholds({
                ...thresholds,
                audioChimeEnabled: !thresholds.audioChimeEnabled,
              })}
              className={`p-2 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all ${
                thresholds.audioChimeEnabled 
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' 
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {thresholds.audioChimeEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span>{thresholds.audioChimeEnabled ? 'الصوت مفعّل' : 'الصوت مكتوم'}</span>
            </button>
          </div>

          <div className="space-y-4">
            {/* Rule 1: Low Battery Threshold */}
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-xs font-bold text-slate-200">الحد الأدنى لنسبة شحن البطارية (Low Battery)</span>
                  <p className="text-[11px] text-slate-400">تنبيه عند انخفاض سعة البطارية لحماية خلايا الليثيوم من التفريغ العميق</p>
                </div>
                <span className="text-sm font-black font-mono text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                  {thresholds.lowBatterySoc}%
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="40"
                step="5"
                value={thresholds.lowBatterySoc}
                onChange={(e) => onUpdateThresholds({ ...thresholds, lowBatterySoc: Number(e.target.value) })}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                <span>10% (حرج جداً)</span>
                <span>20% (موصى به)</span>
                <span>40% (تحفظي)</span>
              </div>
            </div>

            {/* Rule 2: Inverter Temp Threshold */}
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-xs font-bold text-slate-200">أقصى حرارة تشغيلية للمحول (Inverter Temp)</span>
                  <p className="text-[11px] text-slate-400">تنبيه فوري لتفادي تلف وحدات الترانزستور IGBT ومراوح التبريد</p>
                </div>
                <span className="text-sm font-black font-mono text-orange-400 px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/20">
                  {thresholds.highInverterTemp} °C
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="80"
                step="5"
                value={thresholds.highInverterTemp}
                onChange={(e) => onUpdateThresholds({ ...thresholds, highInverterTemp: Number(e.target.value) })}
                className="w-full accent-orange-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                <span>50°C</span>
                <span>65°C (المعيار الآمن)</span>
                <span>80°C (خطر إطفاء حراري)</span>
              </div>
            </div>

            {/* Rule 3: Max Load Limit */}
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-xs font-bold text-slate-200">حمل الاستهلاك الزائد (Overload Alert)</span>
                  <p className="text-[11px] text-slate-400">تحذير عند اقتراب استهلاك المنزل من سعة العاكس القصوى (8 kW)</p>
                </div>
                <span className="text-sm font-black font-mono text-rose-400 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                  {thresholds.highLoadThresholdKw} kW
                </span>
              </div>
              <input
                type="range"
                min="4"
                max="8"
                step="0.5"
                value={thresholds.highLoadThresholdKw}
                onChange={(e) => onUpdateThresholds({ ...thresholds, highLoadThresholdKw: Number(e.target.value) })}
                className="w-full accent-rose-500 cursor-pointer"
              />
            </div>

            {/* Rule 4: Grid Blackout Toggle */}
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-200">تنبيه فوري عند انقطاع شبكة الكهرباء العامة</span>
                <p className="text-[11px] text-slate-400">إشعار مباشر عند تحول النظام إلى وضع العزل الذاتي (Islanding Mode)</p>
              </div>
              <button
                onClick={() => onUpdateThresholds({
                  ...thresholds,
                  gridBlackoutAlert: !thresholds.gridBlackoutAlert,
                })}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                  thresholds.gridBlackoutAlert ? 'bg-amber-500' : 'bg-slate-800'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-slate-950 transition-transform ${
                  thresholds.gridBlackoutAlert ? 'translate-x-0' : '-translate-x-6'
                }`} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
