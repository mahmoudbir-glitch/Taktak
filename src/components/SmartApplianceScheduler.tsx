/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Flame, Droplets, Zap, Car, Wind, Sparkles, 
  Clock, Power, Sliders, CheckCircle2, AlertCircle, 
  Plus, X, ShieldCheck, ChevronDown, ChevronUp, Waves
} from 'lucide-react';
import { SmartAppliance, ApplianceType, SolarTelemetry } from '../types/solar';

interface SmartApplianceSchedulerProps {
  appliances: SmartAppliance[];
  telemetry: SolarTelemetry;
  onUpdateAppliance: (updated: SmartAppliance) => void;
  onAddAppliance: (newApp: SmartAppliance) => void;
  onDeleteAppliance: (id: string) => void;
}

export const SmartApplianceScheduler: React.FC<SmartApplianceSchedulerProps> = ({
  appliances,
  telemetry,
  onUpdateAppliance,
  onAddAppliance,
  onDeleteAppliance,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingApplianceId, setEditingApplianceId] = useState<string | null>(null);

  // New appliance form state
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<ApplianceType>('water_heater');
  const [newRatedKw, setNewRatedKw] = useState(1.5);
  const [newMinSurplusKw, setNewMinSurplusKw] = useState(1.2);
  const [newMinBatterySoc, setNewMinBatterySoc] = useState(75);
  const [newMaxDailyMinutes, setNewMaxDailyMinutes] = useState(90);
  const [newRelay, setNewRelay] = useState<'Inverter Dry Contact' | 'Shelly WiFi Relay' | 'Tuya / Sonoff' | 'Modbus Coil'>('Inverter Dry Contact');

  const liveSurplusKw = Math.max(0, Number((telemetry.pvPower - telemetry.loadPower).toFixed(2)));
  const runningAppliancesCount = appliances.filter(a => a.status === 'running').length;

  const getApplianceIcon = (type: ApplianceType) => {
    switch (type) {
      case 'water_heater':
        return <Flame className="w-5 h-5 text-orange-400" />;
      case 'water_pump':
        return <Waves className="w-5 h-5 text-cyan-400" />;
      case 'ev_charger':
        return <Car className="w-5 h-5 text-emerald-400" />;
      case 'ac_cooling':
        return <Wind className="w-5 h-5 text-blue-400" />;
      default:
        return <Zap className="w-5 h-5 text-amber-400" />;
    }
  };

  const handleToggleAuto = (app: SmartAppliance) => {
    const updated = {
      ...app,
      autoScheduleEnabled: !app.autoScheduleEnabled,
      status: !app.autoScheduleEnabled 
        ? (liveSurplusKw >= app.minSurplusKw && telemetry.batterySoc >= app.minBatterySoc ? 'running' as const : 'waiting_for_surplus' as const)
        : 'idle' as const,
    };
    onUpdateAppliance(updated);
  };

  const handleManualToggleRun = (app: SmartAppliance) => {
    const updated = {
      ...app,
      status: app.status === 'running' ? 'idle' as const : 'running' as const,
      lastToggledAt: 'تشغيل يدوي',
    };
    onUpdateAppliance(updated);
  };

  const handleCreateAppliance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newApp: SmartAppliance = {
      id: `app-${Date.now()}`,
      name: newName.trim(),
      type: newType,
      ratedKw: Number(newRatedKw),
      minSurplusKw: Number(newMinSurplusKw),
      minBatterySoc: Number(newMinBatterySoc),
      autoScheduleEnabled: true,
      status: liveSurplusKw >= newMinSurplusKw && telemetry.batterySoc >= newMinBatterySoc ? 'running' : 'waiting_for_surplus',
      relayProtocol: newRelay,
      runTimeTodayMinutes: 0,
      maxDailyMinutes: Number(newMaxDailyMinutes),
      lastToggledAt: 'الآن',
    };

    onAddAppliance(newApp);
    setShowAddModal(false);
    setNewName('');
  };

  return (
    <div className="bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800/80 rounded-3xl p-4 sm:p-5 shadow-2xl backdrop-blur-xl relative overflow-hidden">
      {/* Background ambient warm solar flare */}
      <div className="absolute top-0 right-1/4 w-72 h-36 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-800/70">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100">
                جدولة الأحمال الثقيلة الذكية (Surplus Load Automation)
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30 font-bold">
                تلقائي عبر الفائض
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              تشغيل السخان ومضخة المياه والسيارة الكهربائية آلياً عند توفر طاقة شمسية فائضة مجانية
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة جهاز ذكي</span>
        </button>
      </div>

      {/* Live Solar Surplus Status Gauge Strip */}
      <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-3.5 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl shrink-0 ${
            liveSurplusKw > 1.0 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse' 
              : 'bg-slate-800 text-slate-400'
          }`}>
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">الفائض الشمسي اللحظي المتاح للأجهزة:</span>
              <span className="text-base font-black font-mono text-emerald-400">
                +{liveSurplusKw} kW
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              {liveSurplusKw > 1.0 
                ? 'فائض مجاني ممتاز لتشغيل السخان والمضخة دون أي سحب من الشبكة' 
                : 'الفائض الحالي محدود؛ الأجهزة في وضع الانتظار لحماية البطارية'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="bg-slate-900 px-3 py-1 rounded-xl border border-slate-800 flex items-center gap-1.5">
            <span className="text-slate-400">شحن البطارية:</span>
            <strong className="text-emerald-400 font-bold">{Math.round(telemetry.batterySoc)}%</strong>
          </div>
          <div className="bg-slate-900 px-3 py-1 rounded-xl border border-slate-800 flex items-center gap-1.5">
            <span className="text-slate-400">أجهزة تعمل الآن:</span>
            <strong className="text-orange-400 font-bold">{runningAppliancesCount} جهاز</strong>
          </div>
        </div>
      </div>

      {/* Appliances List */}
      <div className="space-y-3">
        {appliances.map((app) => {
          const isRunning = app.status === 'running';
          const isWaiting = app.status === 'waiting_for_surplus';
          const isEditing = editingApplianceId === app.id;

          return (
            <div
              key={app.id}
              className={`rounded-2xl p-4 border transition-all ${
                isRunning
                  ? 'bg-gradient-to-r from-orange-950/40 via-slate-900/90 to-slate-950 border-orange-500/60 shadow-lg shadow-orange-950/20'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`p-2.5 rounded-2xl shrink-0 mt-0.5 ${
                    isRunning ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40' : 'bg-slate-900 border border-slate-800'
                  }`}>
                    {getApplianceIcon(app.type)}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-100">{app.name}</h4>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-slate-300">
                        {app.ratedKw} kW
                      </span>
                      
                      {/* Status Badge */}
                      {isRunning ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>يعمل بالفائض الشمسي الآن 🔥</span>
                        </span>
                      ) : isWaiting ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold">
                          بانتظار فائض &gt; {app.minSurplusKw} kW
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-mono">
                          خامل (جاهز)
                        </span>
                      )}
                    </div>

                    {/* Operational Requirements Tags */}
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] font-mono text-slate-400">
                      <span className="bg-slate-900/80 px-2 py-0.5 rounded-lg border border-slate-800">
                        يشترط فائض: <strong className="text-slate-200">{app.minSurplusKw} kW</strong>
                      </span>
                      <span className="bg-slate-900/80 px-2 py-0.5 rounded-lg border border-slate-800">
                        يشترط بطارية: <strong className="text-slate-200">&gt; {app.minBatterySoc}%</strong>
                      </span>
                      <span className="bg-slate-900/80 px-2 py-0.5 rounded-lg border border-slate-800 hidden sm:inline">
                        التحكم: <strong className="text-slate-200">{app.relayProtocol}</strong>
                      </span>
                    </div>

                    {/* Daily runtime progress */}
                    <div className="mt-2.5 flex items-center gap-3">
                      <div className="flex-1 bg-slate-900 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-orange-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, (app.runTimeTodayMinutes / app.maxDailyMinutes) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        تشغيل اليوم: {Math.round(app.runTimeTodayMinutes)} / {app.maxDailyMinutes} دقيقة
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right controls: Auto Toggle & Force Run */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-bold hidden sm:inline">الجدولة الآلية:</span>
                    <button
                      type="button"
                      onClick={() => handleToggleAuto(app)}
                      className={`w-11 h-6 rounded-full transition-colors relative p-0.5 focus:outline-none ${
                        app.autoScheduleEnabled ? 'bg-orange-500 shadow-md shadow-orange-500/20' : 'bg-slate-800'
                      }`}
                      title="تفعيل/تعطيل الجدولة الذكية التلقائية"
                    >
                      <div className={`w-5 h-5 rounded-full bg-slate-950 transition-transform ${
                        app.autoScheduleEnabled ? 'translate-x-0' : '-translate-x-5'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleManualToggleRun(app)}
                      className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-all flex items-center gap-1 ${
                        isRunning
                          ? 'bg-rose-950/60 border-rose-500/40 text-rose-300 hover:bg-rose-900/60'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-orange-400'
                      }`}
                    >
                      <Power className="w-3 h-3" />
                      <span>{isRunning ? 'إيقاف يدوي' : 'تشغيل فوري'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingApplianceId(isEditing ? null : app.id)}
                      className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs"
                      title="تعديل الشروط"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Inline Editor for Thresholds */}
              {isEditing && (
                <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in duration-200">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">
                      الفائض المطلوب للتشغيل (kW):
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      max="6.0"
                      value={app.minSurplusKw}
                      onChange={(e) => onUpdateAppliance({ ...app, minSurplusKw: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">
                      أدنى نسبة بطارية مسموحة (%):
                    </label>
                    <input
                      type="number"
                      min="30"
                      max="95"
                      step="5"
                      value={app.minBatterySoc}
                      onChange={(e) => onUpdateAppliance({ ...app, minBatterySoc: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">
                      أقصى مدة تشغيل يومية (دقيقة):
                    </label>
                    <input
                      type="number"
                      min="15"
                      max="360"
                      step="15"
                      value={app.maxDailyMinutes}
                      onChange={(e) => onUpdateAppliance({ ...app, maxDailyMinutes: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Engineering Value Proposition Tip */}
      <div className="mt-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-start gap-2.5 text-xs text-orange-200/90 leading-relaxed">
        <Sparkles className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold text-orange-300 block mb-0.5">القيمة الهندسية الذكية:</strong>
          <span>
            بدلاً من تصدير الفائض للشبكة بأسعار زهيدة أو هدره، يقوم التطبيق بتوجيه الفائض اللحظي تلقائياً لتسخين المياه أو ضخ الخزانات؛ وعند هبوط أشعة الشمس يقوم بفصلها فوراً لحماية بطاريات الليثيوم ومنع أي سحب مكلف من شبكة الكهرباء!
          </span>
        </div>
      </div>

      {/* Add New Appliance Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-orange-400" />
                <span>إضافة جهاز كهربائي لجدولة الفائض الشمسي</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAppliance} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">اسم الجهاز (مثلاً: مضخة الحديقة):</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="سخان إضافي، فلتر مسبح..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">نوع الجهاز:</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as ApplianceType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-orange-500"
                  >
                    <option value="water_heater">سخان مياه حراري</option>
                    <option value="water_pump">مضخة مياه / ري</option>
                    <option value="ev_charger">شاحن سيارة كهربائية</option>
                    <option value="ac_cooling">مكيف هواء إضافي</option>
                    <option value="laundry">غسالة صحون / ملابس</option>
                    <option value="custom">جهاز مخصص</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">قدرة الجهاز (kW):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.2"
                    max="10"
                    value={newRatedKw}
                    onChange={(e) => setNewRatedKw(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-slate-100 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">الفائض المطلوب للتشغيل (kW):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="8"
                    value={newMinSurplusKw}
                    onChange={(e) => setNewMinSurplusKw(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-slate-100 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">أدنى نسبة شحن بطارية (%):</label>
                  <input
                    type="number"
                    min="30"
                    max="95"
                    step="5"
                    value={newMinBatterySoc}
                    onChange={(e) => setNewMinBatterySoc(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-slate-100 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">بروتوكول مفتاح التشغيل (Relay Protocol):</label>
                <select
                  value={newRelay}
                  onChange={(e) => setNewRelay(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-orange-500"
                >
                  <option value="Inverter Dry Contact">ملامس جاف للمحول (Inverter Dry Contact Relay)</option>
                  <option value="Shelly WiFi Relay">قاطع شيلي الذكي (Shelly WiFi Smart Relay)</option>
                  <option value="Tuya / Sonoff">مقبس تويا أو سونوف (Tuya / Sonoff Smart Plug)</option>
                  <option value="Modbus Coil">ملف مودباص خارجي (Modbus TCP Coil)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold shadow-md transition-all active:scale-95"
                >
                  حفظ وتفعيل الجدولة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
