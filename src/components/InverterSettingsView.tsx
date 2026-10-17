/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  Settings, Wifi, Radio, Server, CheckCircle2, 
  XCircle, Loader2, Key, Sliders, Shield, RefreshCw, Cpu, Database,
  Leaf, Battery, Gauge, SunMedium, Eye, Sparkles
} from 'lucide-react';
import { InverterConnectionConfig, InverterBrand } from '../types/solar';
import { testInverterApiConnection } from '../services/solarSim';
import { SmartessSession, fetchSnapshot } from '../services/smartessClient';
import { SmartessConnectPanel } from './SmartessConnectPanel';

interface InverterSettingsProps {
  config: InverterConnectionConfig;
  onSaveConfig: (newConfig: InverterConnectionConfig) => void;
  batterySoc?: number;
  highContrast?: boolean;
  onToggleHighContrast?: () => void;
  smartessSession?: SmartessSession | null;
  onSmartessSessionChange?: (session: SmartessSession | null) => void;
}

const INVERTER_BRANDS: { id: InverterBrand; name: string; protocol: string; defaultPort: number }[] = [
  { id: 'smartess', name: 'SmartESS (DessMonitor)', protocol: 'SmartESS Cloud API • اتصال حقيقي', defaultPort: 443 },
  { id: 'deye', name: 'Deye / Sunsynk Hybrid', protocol: 'Modbus TCP / Solarman API', defaultPort: 502 },
  { id: 'growatt', name: 'Growatt (ShinePhone)', protocol: 'Growatt Server Open API', defaultPort: 443 },
  { id: 'huawei', name: 'Huawei FusionSolar', protocol: 'Northbound OpenAPI / Kiosk', defaultPort: 443 },
  { id: 'goodwe', name: 'GoodWe SEMS Portal', protocol: 'SEMS REST Cloud API', defaultPort: 443 },
  { id: 'fronius', name: 'Fronius Solar.web', protocol: 'Solar API Local JSON v1', defaultPort: 80 },
  { id: 'victron', name: 'Victron Energy', protocol: 'VRM API / Venus OS MQTT', defaultPort: 1883 },
  { id: 'solaredge', name: 'SolarEdge Monitoring', protocol: 'Monitoring REST API', defaultPort: 443 },
  { id: 'modbus', name: 'Generic Modbus TCP', protocol: 'SunSpec / Modbus RTU-WiFi', defaultPort: 502 },
  { id: 'custom_api', name: 'مخصص (Custom REST API)', protocol: 'Custom Webhook / JSON GET', defaultPort: 8080 },
];

export const InverterSettingsView: React.FC<InverterSettingsProps> = ({
  config,
  onSaveConfig,
  batterySoc = 82,
  highContrast = false,
  onToggleHighContrast,
  smartessSession = null,
  onSmartessSessionChange,
}) => {
  const isSmartess = (brand: InverterBrand) => brand === 'smartess';
  const [formData, setFormData] = useState<InverterConnectionConfig>({ ...config });
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    responseTimeMs: number;
    message: string;
    payloadPreview?: Record<string, unknown>;
  } | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Keep the form in step when the app switches source (e.g. after a SmartESS login)
  useEffect(() => {
    setFormData(prev => ({ ...prev, mode: config.mode, brand: config.brand, brandName: config.brandName }));
  }, [config.mode, config.brand, config.brandName]);

  const handleBrandChange = (brandId: InverterBrand) => {
    const selected = INVERTER_BRANDS.find(b => b.id === brandId);
    if (!selected) return;

    setFormData(prev => ({
      ...prev,
      brand: brandId,
      brandName: selected.name,
      apiPort: selected.defaultPort,
      // SmartESS is a real cloud connection, so switch to real mode with it
      mode: isSmartess(brandId) ? 'real_api' : prev.mode,
      apiUrl: isSmartess(brandId)
        ? '/api/smartess'
        : brandId === 'deye' || brandId === 'modbus'
        ? 'http://192.168.1.180/api/v1/telemetry'
        : `https://api.${brandId}.com/v2/inverter/live`,
    }));
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = formData.mode === 'real_api' && isSmartess(formData.brand)
        ? await testSmartess()
        : await testInverterApiConnection(formData);
      setTestResult(res);
      if (res.success) {
        setFormData(prev => ({
          ...prev,
          lastConnectedTime: new Date().toISOString(),
          connectionStatus: formData.mode === 'simulation' ? 'simulated' : 'connected',
        }));
      }
    } finally {
      setIsTesting(false);
    }
  };

  const testSmartess = async () => {
    const start = performance.now();
    try {
      const snap = await fetchSnapshot(smartessSession);
      return {
        success: true,
        responseTimeMs: Math.round(performance.now() - start),
        message: `تم استلام بيانات حية من SmartESS للجهاز ${snap.deviceName}${snap.online ? '' : ' (الجهاز غير متصل حالياً)'}`,
        payloadPreview: snap as unknown as Record<string, unknown>,
      };
    } catch (err) {
      return {
        success: false,
        responseTimeMs: Math.round(performance.now() - start),
        message: err instanceof Error ? err.message : 'فشل الاتصال بـ SmartESS',
      };
    }
  };

  const handleSave = () => {
    onSaveConfig(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-400" />
            <span>إعدادات الاتصال بمحول الطاقة (Inverter API Settings)</span>
          </h2>
          <span className="text-[11px] text-slate-400">ربط العاكس الشمسي عبر الشبكة المحلية أو السحابة واستقبال البيانات آلياً</span>
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all active:scale-95 flex items-center gap-1.5"
        >
          {savedSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>تم الحفظ بنجاح</span>
            </>
          ) : (
            <span>حفظ الإعدادات</span>
          )}
        </button>
      </div>

      {/* High Contrast Mode for Direct Sunlight Visibility */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-2xl transition-colors ${
              highContrast 
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20' 
                : 'bg-slate-800 text-amber-400'
            }`}>
              <SunMedium className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100">وضع التباين العالي وأشعة الشمس (High Contrast Sunlight Mode)</h3>
                <span className={`px-2 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  highContrast 
                    ? 'bg-amber-400 text-slate-950' 
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {highContrast ? 'مفعّل ☀️' : 'معطل'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-xl">
                تحسين رؤية البيانات والرسوم البيانية للأشخاص الذين يراقبون المحول أو يفحصون الألواح تحت أشعة الشمس المباشرة عبر تكثيف سواد الخلفية ورفع سماكة وتباين أرقام العدادات والخطوط بدون أي شفافية باهتة.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleHighContrast}
            className={`w-14 h-7 rounded-full transition-colors relative p-0.5 focus:outline-none shrink-0 ${
              highContrast ? 'bg-amber-400 shadow-lg shadow-amber-400/30' : 'bg-slate-800'
            }`}
            title="تفعيل/تعطيل وضع التباين العالي"
          >
            <div className={`w-6 h-6 rounded-full bg-slate-950 transition-transform ${
              highContrast ? 'translate-x-0' : '-translate-x-7'
            }`} />
          </button>
        </div>

        {/* Informative quick preview */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>يمكنك أيضاً التبديل السريع من شريط أندرويد العلوي بنقرة واحدة أثناء الوقوف تحت الشمس.</span>
          </span>
          <span className="font-mono text-amber-400/90 font-bold hidden sm:inline">7:1 Contrast Ratio</span>
        </div>
      </div>

      {/* Mode Switcher: Simulation vs Real Inverter API */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl backdrop-blur-md">
        <label className="text-xs font-bold text-slate-200 block mb-3">نمط اتصال البيانات (Data Source Mode):</label>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            onClick={() => setFormData({ ...formData, mode: 'simulation' })}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              formData.mode === 'simulation'
                ? 'bg-amber-500/10 border-amber-500/60 shadow-md shadow-amber-500/10'
                : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-100 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-amber-400" />
                <span>محاكي العاكس الذكي (Smart Simulator)</span>
              </span>
              <span className={`w-3.5 h-3.5 rounded-full border-2 ${
                formData.mode === 'simulation' ? 'bg-amber-500 border-amber-500' : 'border-slate-600'
              }`} />
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              توليد بيانات طاقة شمسية واقعية متغيرة مع منحنى النهار والليل وتأثير الأحمال واختبار الحالات الحرجة دون الحاجة لجهاز محول فعلي الآن.
            </p>
          </div>

          <div
            onClick={() => setFormData({ ...formData, mode: 'real_api' })}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              formData.mode === 'real_api'
                ? 'bg-cyan-500/10 border-cyan-500/60 shadow-md shadow-cyan-500/10'
                : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-100 flex items-center gap-2">
                <Wifi className="w-4 h-4 text-cyan-400" />
                <span>ربط حقيقي عبر API / Modbus TCP</span>
              </span>
              <span className={`w-3.5 h-3.5 rounded-full border-2 ${
                formData.mode === 'real_api' ? 'bg-cyan-500 border-cyan-500' : 'border-slate-600'
              }`} />
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              الاتصال التلقائي المباشر بعنوان IP لمحول الطاقة في شبكة المنزل أو عبر مفتاح API لسحابة الشركة المصنعة (Cloud Portal).
            </p>
          </div>
        </div>
      </div>

      {/* Brand & Protocol Selection */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl backdrop-blur-md space-y-4">
        <h3 className="text-sm font-bold text-slate-200">نوع وموديل محول الطاقة (Inverter Manufacturer)</h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {INVERTER_BRANDS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleBrandChange(item.id)}
              className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between ${
                formData.brand === item.id
                  ? 'bg-amber-500/15 border-amber-500/70 text-slate-100 shadow-md'
                  : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
              }`}
            >
              <span className="text-xs font-bold block">{item.name}</span>
              <span className="text-[10px] text-slate-400 mt-1 block font-mono">{item.protocol}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Connection Parameters Form */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl backdrop-blur-md space-y-4">
        <h3 className="text-sm font-bold text-slate-200">بيانات الاتصال والتوثيق (Credentials)</h3>

        {config.lastError && config.mode === 'real_api' && (
          <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/50 text-rose-200 text-xs">
            آخر خطأ في الاتصال: {config.lastError}
          </div>
        )}

        {isSmartess(formData.brand) ? (
          onSmartessSessionChange && (
            <SmartessConnectPanel
              session={smartessSession}
              onSessionChange={onSmartessSessionChange}
              batteryCapacityKwh={formData.batteryCapacityKwh ?? 4.8}
              onBatteryCapacityChange={(kwh) => setFormData(prev => ({ ...prev, batteryCapacityKwh: kwh }))}
            />
          )
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">عنوان IP أو رابط الـ API:</label>
            <input
              type="text"
              value={formData.apiUrl}
              onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
              placeholder="http://192.168.1.180/api/telemetry"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">منفذ الاتصال (Port):</label>
            <input
              type="number"
              value={formData.apiPort}
              onChange={(e) => setFormData({ ...formData, apiPort: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
              placeholder="502"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">مفتاح التوثيق / رمز الـ API (Auth Key/Token):</label>
            <input
              type="password"
              value={formData.apiKey}
              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
              placeholder="Bearer Token أو API Secret"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">الرقم التسلسلي للمحول (Inverter SN):</label>
            <input
              type="text"
              value={formData.inverterSn}
              onChange={(e) => setFormData({ ...formData, inverterSn: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
              placeholder="SN-24089921104"
            />
          </div>
        </div>
        )}

        {/* Polling Interval */}
        <div className="pt-2 border-t border-slate-800/80">
          <label className="text-xs font-bold text-slate-300 block mb-2">معدل التحديث التلقائي للبيانات (Auto-Refresh Rate):</label>
          <div className="flex flex-wrap gap-2">
            {[
              { val: 3, label: '3 ثوانٍ (فوري فائق السرعة)' },
              { val: 5, label: '5 ثوانٍ (موصى به)' },
              { val: 10, label: '10 ثوانٍ' },
              { val: 30, label: '30 ثانية (توفير بطارية)' },
            ].map((option) => (
              <button
                key={option.val}
                type="button"
                onClick={() => setFormData({ ...formData, pollIntervalSec: option.val })}
                className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all ${
                  formData.pollIntervalSec === option.val
                    ? 'bg-amber-500 text-slate-950 border-amber-500'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Smart Power Saver / Eco Mode Toggle & Settings */}
        <div className="pt-3 border-t border-slate-800/80">
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl transition-colors ${
                  formData.smartEcoModeEnabled 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-slate-800 text-slate-500'
                }`}>
                  <Leaf className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-100">وضع توفير الطاقة الذكي (Smart Power Saver)</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Eco Polling
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    مضاعفة فترة تحديث البيانات تلقائياً عند انخفاض شحن البطارية لتقليل استهلاك المعالج وشبكة الهاتف
                  </p>
                </div>
              </div>

              {/* Native Android Switch Toggle */}
              <button
                type="button"
                onClick={() => setFormData({ ...formData, smartEcoModeEnabled: !formData.smartEcoModeEnabled })}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 focus:outline-none ${
                  formData.smartEcoModeEnabled ? 'bg-emerald-500 shadow-md shadow-emerald-500/20' : 'bg-slate-800'
                }`}
                title="تفعيل/تعطيل وضع توفير الطاقة الذكي"
              >
                <div className={`w-5 h-5 rounded-full bg-slate-950 transition-transform ${
                  formData.smartEcoModeEnabled ? 'translate-x-0' : '-translate-x-6'
                }`} />
              </button>
            </div>

            {formData.smartEcoModeEnabled && (
              <div className="pt-3 border-t border-slate-800/60 space-y-3 animate-in fade-in duration-200">
                {/* Live Active Status Badge */}
                <div className="flex items-center justify-between bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Battery className="w-3.5 h-3.5 text-slate-300" />
                    <span>مستوى بطارية النظام الشمسي الحالي:</span>
                    <strong className="text-slate-200 font-mono">{Math.round(batterySoc)}%</strong>
                  </span>

                  {batterySoc <= (formData.smartEcoBatteryThreshold || 20) ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>نشط حالياً (تحديث كل {formData.smartEcoPollIntervalSec || 30}ث)</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px]">
                      <span>في وضع الاستعداد (البطارية كافية)</span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Battery threshold trigger */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
                      عتبة بدء التوفير عند انخفاض شحن البطارية إلى:
                    </label>
                    <div className="flex gap-1.5">
                      {[15, 20, 25, 30].map((socVal) => (
                        <button
                          key={socVal}
                          type="button"
                          onClick={() => setFormData({ ...formData, smartEcoBatteryThreshold: socVal })}
                          className={`flex-1 py-1 rounded-lg border text-xs font-mono font-bold transition-all ${
                            formData.smartEcoBatteryThreshold === socVal
                              ? 'bg-emerald-500 text-slate-950 border-emerald-500 font-black'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          &lt; {socVal}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Eco poll interval */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
                      الفاصل الزمني الجديد في وضع التوفير:
                    </label>
                    <div className="flex gap-1.5">
                      {[
                        { sec: 20, label: '20 ثانية' },
                        { sec: 30, label: '30 ثانية (المثالي)' },
                        { sec: 60, label: '60 ثانية' },
                      ].map((item) => (
                        <button
                          key={item.sec}
                          type="button"
                          onClick={() => setFormData({ ...formData, smartEcoPollIntervalSec: item.sec })}
                          className={`flex-1 py-1 rounded-lg border text-[11px] font-mono font-bold transition-all ${
                            formData.smartEcoPollIntervalSec === item.sec
                              ? 'bg-emerald-500 text-slate-950 border-emerald-500 font-black'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Test Connection Button & Result Box */}
        <div className="pt-4 border-t border-slate-800/80">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري إرسال حزم الفحص والاستجابة من المحول...</span>
              </>
            ) : (
              <>
                <Radio className="w-4 h-4 text-amber-400" />
                <span>اختبار الاتصال الفوري بمحول الطاقة (Test Inverter Ping)</span>
              </>
            )}
          </button>

          {testResult && (
            <div className={`mt-3 p-3.5 rounded-2xl border text-xs animate-in fade-in duration-200 ${
              testResult.success 
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200' 
                : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold flex items-center gap-1.5">
                  {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-rose-400" />}
                  <span>{testResult.message}</span>
                </span>
                <span className="font-mono text-[10px] opacity-75">
                  زمن الاستجابة: {testResult.responseTimeMs} ms
                </span>
              </div>

              {testResult.payloadPreview && (
                <div className="mt-2 p-2 bg-slate-950/80 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 max-h-36 overflow-y-auto">
                  <span className="text-[10px] text-amber-400 font-bold block mb-1">سجل استجابة سجلات العاكس (Registers Payload):</span>
                  <pre className="whitespace-pre-wrap">{JSON.stringify(testResult.payloadPreview, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
