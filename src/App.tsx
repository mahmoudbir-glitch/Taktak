/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { LayoutDashboard, BarChart3, Bell, Settings } from 'lucide-react';
import { 
  SolarTelemetry, SmartAlert, InverterConnectionConfig, 
  AlertThresholds, HourlyStatsPoint, DailySummary, WeatherType, SolarForecastSummary,
  FinancialTariffConfig, SmartAppliance, GeoLocation
} from './types/solar';
import { 
  INITIAL_TELEMETRY, INITIAL_CONFIG, 
  calculateNextTelemetry, generateHourlyHistory, getDailySummaries, generateSolarForecast,
  DEFAULT_TARIFF_CONFIG, calculateFinancialSavings,
  INITIAL_APPLIANCES, evaluateSmartAppliances 
} from './services/solarSim';
import { DEFAULT_LOCATION, fetchRealSolarForecast, getUserGpsLocation } from './services/weatherApi';
import { playAlertSound } from './services/sound';
import {
  SmartessSession, fetchSnapshot, loadSession, saveSession, snapshotToTelemetry
} from './services/smartessClient';
import { AndroidFrame } from './components/AndroidFrame';
import { AndroidNotificationBanner } from './components/AndroidNotificationBanner';
import { DashboardView } from './components/DashboardView';
import { StatsView } from './components/StatsView';
import { AlertsView } from './components/AlertsView';
import { InverterSettingsView } from './components/InverterSettingsView';

const DEFAULT_THRESHOLDS: AlertThresholds = {
  lowBatterySoc: 20,
  criticalBatterySoc: 10,
  highInverterTemp: 65,
  criticalInverterTemp: 75,
  highLoadThresholdKw: 6.0,
  gridBlackoutAlert: true,
  pvLowPerformanceAlert: true,
  audioChimeEnabled: true,
  pushNotificationSimEnabled: true,
};

const INITIAL_ALERTS: SmartAlert[] = [
  {
    id: 'alt-1',
    title: 'اكتمال شحن البطارية إلى 100%',
    message: 'تم شحن بنك بطاريات الليثيوم بالكامل؛ تحول المحول إلى تصدير الفائض الشمسي للشبكة.',
    severity: 'info',
    timestamp: 'منذ 15 دقيقة',
    acknowledged: true,
    metric: 'SOC = 100%',
    recommendedAction: 'النظام في أفضل حالات الكفاءة.',
  },
];

const CONFIG_KEY = 'shamsak.inverter.config';
// Only non-secret, user-chosen settings are persisted
const PERSISTED_KEYS = [
  'mode', 'brand', 'brandName', 'pollIntervalSec', 'smartEcoModeEnabled',
  'smartEcoBatteryThreshold', 'smartEcoPollIntervalSec', 'batteryCapacityKwh',
] as const;

function loadConfig(): InverterConnectionConfig {
  let stored: Partial<InverterConnectionConfig> | null = null;
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    stored = raw ? JSON.parse(raw) : null;
  } catch {
    stored = null;
  }
  if (stored) {
    const picked = Object.fromEntries(PERSISTED_KEYS.filter(k => k in stored!).map(k => [k, stored![k]]));
    return { ...INITIAL_CONFIG, ...picked, connectionStatus: stored.mode === 'real_api' ? 'connecting' : 'simulated' };
  }
  // A saved SmartESS session but no saved settings: go straight to real data
  if (loadSession()) {
    return { ...INITIAL_CONFIG, mode: 'real_api', brand: 'smartess', brandName: 'SmartESS (DessMonitor)', connectionStatus: 'connecting' };
  }
  return INITIAL_CONFIG;
}

function saveConfig(config: InverterConnectionConfig) {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(Object.fromEntries(PERSISTED_KEYS.map(k => [k, config[k]]))));
  } catch {
    /* storage unavailable */
  }
}

export default function App() {
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'stats' | 'alerts' | 'settings'>('dashboard');
  const [telemetry, setTelemetry] = useState<SolarTelemetry>(INITIAL_TELEMETRY);
  const [config, setConfig] = useState<InverterConnectionConfig>(loadConfig);
  const [thresholds, setThresholds] = useState<AlertThresholds>(DEFAULT_THRESHOLDS);
  const [alerts, setAlerts] = useState<SmartAlert[]>(INITIAL_ALERTS);
  const [activeBannerAlert, setActiveBannerAlert] = useState<SmartAlert | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hourlyHistory] = useState<HourlyStatsPoint[]>(() => generateHourlyHistory());
  const [dailySummaries] = useState<DailySummary[]>(() => getDailySummaries(30));
  const [weatherOverride, setWeatherOverride] = useState<WeatherType>('sunny');
  const [forecast, setForecast] = useState<SolarForecastSummary>(() => generateSolarForecast(undefined, 'sunny'));
  const [location, setLocation] = useState<GeoLocation>(DEFAULT_LOCATION);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [tariff, setTariff] = useState<FinancialTariffConfig>(DEFAULT_TARIFF_CONFIG);
  const [highContrast, setHighContrast] = useState(false);
  const [appliances, setAppliances] = useState<SmartAppliance[]>(INITIAL_APPLIANCES);
  const [smartessSession, setSmartessSession] = useState<SmartessSession | null>(() => loadSession());

  // Prevent spamming the same alert repeatedly
  const lastAlertTimeRef = useRef<{ [key: string]: number }>({});
  // Conditions that are currently active: an alert fires only when one becomes active
  const activeConditionsRef = useRef<Set<string>>(new Set());

  const isRealSmartess = config.mode === 'real_api' && config.brand === 'smartess';

  // Trigger Alert helper
  const triggerAlert = useCallback((
    key: string,
    title: string,
    message: string,
    severity: 'critical' | 'warning' | 'info',
    metric?: string,
    recommendedAction?: string
  ) => {
    const now = Date.now();
    // Allow same category alert only once every 30 seconds
    if (lastAlertTimeRef.current[key] && now - lastAlertTimeRef.current[key] < 30000) {
      return;
    }
    lastAlertTimeRef.current[key] = now;

    const newAlert: SmartAlert = {
      id: `alt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title,
      message,
      severity,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      acknowledged: false,
      metric,
      recommendedAction,
    };

    setAlerts(prev => [newAlert, ...prev]);
    setActiveBannerAlert(newAlert);

    if (thresholds.audioChimeEnabled) {
      playAlertSound(severity);
    }
  }, [thresholds.audioChimeEnabled]);

  const triggerAlertRef = useRef(triggerAlert);
  useEffect(() => { triggerAlertRef.current = triggerAlert; }, [triggerAlert]);

  const dismissBanner = useCallback(() => setActiveBannerAlert(null), []);

  /**
   * Edge-triggered condition: `fire` runs once when the condition becomes active,
   * and the condition re-arms only after `cleared` is true (hysteresis).
   */
  const edge = useCallback((key: string, active: boolean, cleared: boolean, fire: () => void) => {
    const set = activeConditionsRef.current;
    if (active) {
      if (!set.has(key)) {
        set.add(key);
        fire();
      }
    } else if (cleared) {
      set.delete(key);
    }
  }, []);

  // Telemetry check for automated smart alerts
  const checkTelemetryForAlerts = useCallback((t: SolarTelemetry) => {
    const set = activeConditionsRef.current;

    // 1. Blackout
    const isBlackout = t.gridStatus === 'blackout' || t.gridStatus === 'islanded';
    edge('grid_blackout', isBlackout && thresholds.gridBlackoutAlert, !isBlackout, () => triggerAlert(
      'grid_blackout',
      'انقطاع شبكة الكهرباء العامة (Grid Blackout)',
      'فصلت الشبكة العامة. قام العاكس بالتحويل تلقائياً إلى وضع الجزيرة المعزولة (Islanding) بالاعتماد على البطارية والألواح.',
      'critical',
      'Grid = 0.0V',
      'يرجى ترشيد استهلاك المكيفات والأحمال الثقيلة للحفاظ على شحن البطارية.'
    ));

    // 2. Battery SOC (2% hysteresis)
    const soc = t.batterySoc;
    edge('critical_battery', soc <= thresholds.criticalBatterySoc, soc > thresholds.criticalBatterySoc + 2, () => {
      set.add('low_battery'); // the critical alert supersedes the low one
      triggerAlert(
        'critical_battery',
        'طاقة البطارية في مرحلة حرجة جداً!',
        `انخفضت نسبة الشحن إلى ${Math.round(soc)}%. يوشك النظام على الإغلاق لحماية خلايا البطارية.`,
        'critical',
        `SOC = ${Math.round(soc)}%`,
        'أوقف فوراً الأحمال غير الضرورية أو قم بتوصيل الشبكة/المولد.'
      );
    });
    edge('low_battery', soc <= thresholds.lowBatterySoc, soc > thresholds.lowBatterySoc + 2, () => triggerAlert(
      'low_battery',
      'تنبيه: انخفاض سعة شحن البطارية',
      `نسبة شحن البطارية وصلت إلى ${Math.round(soc)}%، وهي أدنى من الحد الآمن المحدد (${thresholds.lowBatterySoc}%).`,
      'warning',
      `SOC = ${Math.round(soc)}%`,
      'راقب تفريغ البطارية أو فعّل وضع توفير الطاقة.'
    ));

    // 3. Inverter Temp (3°C hysteresis)
    const temp = t.inverterTemp;
    edge('critical_temp', temp >= thresholds.criticalInverterTemp, temp < thresholds.criticalInverterTemp - 3, () => {
      set.add('high_temp');
      triggerAlert(
        'critical_temp',
        'خطر: ارتفاع حرارة محول الطاقة لمستوى حرج!',
        `درجة حرارة المحول بلغت ${temp}°C. قد يحدث خفض تلقائي للقدرة (Derating) أو إيقاف طارئ.`,
        'critical',
        `Temp = ${temp}°C`,
        'تأكد من سلامة تهوية غرفة المحول وعدم انسداد فتحات مراوح التبريد.'
      );
    });
    edge('high_temp', temp >= thresholds.highInverterTemp, temp < thresholds.highInverterTemp - 3, () => triggerAlert(
      'high_temp',
      'تحذير: ارتفاع حرارة المحول الشمسي',
      `سجل المحول حرارة تشغيلية ${temp}°C (الحد الأقصى ${thresholds.highInverterTemp}°C).`,
      'warning',
      `Temp = ${temp}°C`,
      'تم رفع سرعة مراوح التبريد إلى أقصى طاقة.'
    ));

    // 4. Overload (0.3 kW hysteresis)
    const load = t.loadPower;
    edge('high_load', load >= thresholds.highLoadThresholdKw, load < thresholds.highLoadThresholdKw - 0.3, () => triggerAlert(
      'high_load',
      'حمل استهلاك كهربائي مرتفع جداً',
      `أحمال المنزل تستهلك ${load.toFixed(2)} kW مقتربة من سعة العاكس القصوى.`,
      'warning',
      `Load = ${load.toFixed(2)} kW`,
      'تجنب تشغيل أجهزة كهربائية ثقيلة في نفس اللحظة.'
    ));
  }, [thresholds, triggerAlert, edge]);

  // Dynamic Polling Loop with Smart Eco Mode
  const isEcoActive = Boolean(
    config.smartEcoModeEnabled &&
    telemetry.batterySoc <= (config.smartEcoBatteryThreshold || 20)
  );
  const basePollInterval = isEcoActive
    ? (config.smartEcoPollIntervalSec || 30)
    : (config.pollIntervalSec || 5);
  // The SmartESS cloud only refreshes every few minutes; polling faster just wastes requests.
  const effectivePollInterval = isRealSmartess ? Math.max(60, basePollInterval) : basePollInterval;

  const handleUpdateAppliance = useCallback((updated: SmartAppliance) => {
    setAppliances(prev => prev.map(a => a.id === updated.id ? updated : a));
  }, []);

  const handleAddAppliance = useCallback((newApp: SmartAppliance) => {
    setAppliances(prev => [...prev, newApp]);
    playAlertSound('success');
  }, []);

  const handleDeleteAppliance = useCallback((id: string) => {
    setAppliances(prev => prev.filter(a => a.id !== id));
  }, []);

  // One polling tick: simulator step, or a real SmartESS reading
  const pollNowRef = useRef<() => void>(() => {});

  const wasRealRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    // Entering real mode: drop the simulator's daily counters so they don't mix with real data
    if (isRealSmartess && !wasRealRef.current) {
      setTelemetry(prev => ({
        ...prev,
        timestamp: new Date().toISOString(),
        loadTodayKwh: 0,
        gridTodayImportKwh: 0,
        gridTodayExportKwh: 0,
        pvPeakTodayKw: 0,
      }));
    }
    wasRealRef.current = isRealSmartess;

    const tick = async () => {
      if (!isRealSmartess) {
        setTelemetry(prev => calculateNextTelemetry(prev, undefined, effectivePollInterval));
        return;
      }
      try {
        const snapshot = await fetchSnapshot(smartessSession);
        if (cancelled) return;
        const capacity = config.batteryCapacityKwh || 4.8;
        setTelemetry(prev => snapshotToTelemetry(snapshot, prev, capacity));
        setConfig(prev => prev.connectionStatus === 'connected' && !prev.lastError
          ? prev
          : { ...prev, connectionStatus: 'connected', lastError: null, lastConnectedTime: new Date().toISOString() });
        activeConditionsRef.current.delete('smartess_error');
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'تعذر جلب بيانات SmartESS';
        setConfig(prev => ({ ...prev, connectionStatus: 'failed', lastError: message }));
        edge('smartess_error', true, false, () => triggerAlertRef.current(
          'smartess_error',
          'تعذر جلب البيانات من SmartESS',
          message,
          'warning',
          'SmartESS Cloud',
          'تحقق من تسجيل الدخول في الإعدادات ومن اتصال جهاز جمع البيانات (Datalogger) بالإنترنت.'
        ));
      }
    };

    pollNowRef.current = () => { void tick(); };
    if (isRealSmartess) void tick(); // fetch immediately instead of waiting a full interval
    const timer = setInterval(() => void tick(), effectivePollInterval * 1000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [effectivePollInterval, isRealSmartess, smartessSession, config.batteryCapacityKwh, edge]);

  // Alerts run outside the state updater, once per new reading
  useEffect(() => {
    checkTelemetryForAlerts(telemetry);
  }, [telemetry, checkTelemetryForAlerts]);

  // Smart surplus appliance automation, once per new reading
  const appliancesRef = useRef(appliances);
  useEffect(() => { appliancesRef.current = appliances; }, [appliances]);

  useEffect(() => {
    const { updatedAppliances, events } = evaluateSmartAppliances(
      appliancesRef.current,
      telemetry,
      effectivePollInterval / 60
    );
    setAppliances(updatedAppliances);
    events
      .filter(ev => ev.action === 'started')
      .forEach(ev => triggerAlertRef.current(
        `app_auto_${ev.applianceName}`,
        `تشغيل ذكي: ${ev.applianceName}`,
        ev.reason,
        'info',
        'فائض طاقة شمسية مجانية'
      ));
    // Only re-evaluate when a new reading arrives
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telemetry]);

  // Weather: one request at a time; responses for an older location are ignored
  const weatherRequestRef = useRef(0);
  const loadForecast = useCallback(async (loc: GeoLocation): Promise<SolarForecastSummary | null> => {
    const requestId = ++weatherRequestRef.current;
    setIsLoadingWeather(true);
    try {
      const res = await fetchRealSolarForecast(loc);
      if (requestId !== weatherRequestRef.current) return null;
      setForecast(res);
      setWeatherOverride(res.currentWeather);
      return res;
    } finally {
      if (requestId === weatherRequestRef.current) setIsLoadingWeather(false);
    }
  }, []);

  // Initial weather load from real Open-Meteo API
  useEffect(() => {
    void loadForecast(DEFAULT_LOCATION);
  }, [loadForecast]);

  const handleLocationChange = async (newLoc: GeoLocation) => {
    setLocation(newLoc);
    const res = await loadForecast(newLoc);
    if (!res) return;
    playAlertSound('success');
    triggerAlert(
      'loc_changed',
      `تحديث الموقع: ${newLoc.cityName}`,
      res.source === 'live_api'
        ? `تم ربط توقعات الطاقة الشمسية بمحطة رصد ${newLoc.cityName} (${newLoc.countryName}) واستقبال الإشعاع الشمسي الحي.`
        : `تعذر الوصول لخدمة الطقس؛ تُعرض توقعات تقديرية لـ ${newLoc.cityName}.`,
      'info',
      `${res.currentIrradianceWm2 ?? 0} W/m²`
    );
  };

  const handleRequestGps = async () => {
    setIsLoadingWeather(true);
    try {
      const gpsLoc = await getUserGpsLocation();
      setLocation(gpsLoc);
      const res = await loadForecast(gpsLoc);
      if (!res) return;
      playAlertSound('success');
      triggerAlert(
        'gps_loc',
        'تم تحديد الموقع الجغرافي بنجاح (GPS)',
        `تم رصد إحداثياتك (${gpsLoc.latitude}°, ${gpsLoc.longitude}°) وجلب الإشعاع الشمسي المباشر بنجاح.`,
        'info',
        `إشعاع: ${res.currentIrradianceWm2 ?? 0} W/m²`
      );
    } catch (err: unknown) {
      setIsLoadingWeather(false);
      const errorMsg = err instanceof Error ? err.message : 'تعذر تحديد الموقع الجغرافي';
      triggerAlert(
        'gps_err',
        'تعذر الوصول إلى نظام GPS',
        `${errorMsg}. يمكنك اختيار مدينتك يدوياً من قائمة المدن.`,
        'warning'
      );
    }
  };

  const handleRefreshWeather = async () => {
    const res = await loadForecast(location);
    if (res) playAlertSound('success');
  };

  const handleWeatherChange = (newWeather: WeatherType) => {
    setWeatherOverride(newWeather);
    setForecast({
      ...generateSolarForecast(undefined, newWeather),
      locationName: `${location.cityName} (محاكاة يدوية)`,
      source: 'fallback',
      lastUpdated: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    });
  };

  // Manual Refresh
  const handleManualRefresh = () => {
    setIsRefreshing(true);
    pollNowRef.current();
    void handleRefreshWeather();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Simulation Lab Triggers (alerts fire from the telemetry effect)
  const handleTriggerSimEvent = (eventType: 'blackout' | 'low_battery' | 'high_temp' | 'overload' | 'reset') => {
    if (eventType === 'blackout') {
      setTelemetry(prev => ({
        ...prev,
        gridStatus: 'blackout',
        gridPower: 0,
        gridVoltage: 0,
        gridFrequency: 0,
      }));
    } else if (eventType === 'low_battery') {
      setTelemetry(prev => ({
        ...prev,
        batterySoc: 12,
        batteryVoltage: 48.2,
        batteryRemainingHours: 1.1,
        batteryPower: -2.4,
      }));
    } else if (eventType === 'high_temp') {
      setTelemetry(prev => ({
        ...prev,
        inverterTemp: 72.4,
        fanSpeedPercent: 100,
      }));
    } else if (eventType === 'overload') {
      setTelemetry(prev => ({
        ...prev,
        loadPower: 7.45,
        heavyLoadPower: 6.2,
      }));
    } else if (eventType === 'reset') {
      setTelemetry({ ...INITIAL_TELEMETRY, timestamp: new Date().toISOString() });
      playAlertSound('success');
    }
  };

  // Test Alert trigger
  const handleTriggerTestAlert = (severity: 'critical' | 'warning' | 'info') => {
    if (severity === 'critical') {
      triggerAlert(
        'test_critical_' + Date.now(),
        'تجربة: إنذار حرج فوري (Test Critical Alarm)',
        'هذا اختبار عملي لنظام الإشعارات الذكية عند رصد خطر انقطاع أو ارتفاع حرارة أو هبوط السعة.',
        'critical',
        'اختبار يدوي',
        'تم تأكيد عمل صوت الإنذار والإشعار المنبثق بنجاح.'
      );
    } else if (severity === 'warning') {
      triggerAlert(
        'test_warning_' + Date.now(),
        'تجربة: تنبيه تحذيري (Test Warning)',
        'اختبار جاهزية مؤشرات الحالات التحذيرية الخاصة بالألواح والشبكة.',
        'warning',
        'مستوى تحذيري',
        'النظام يعمل بشكل ممتاز.'
      );
    }
  };

  const handleSmartessSessionChange = useCallback((session: SmartessSession | null) => {
    saveSession(session);
    setSmartessSession(session);
    // Logging in switches to live SmartESS data right away (no separate "save" needed)
    if (session) {
      setConfig(prev => {
        const next: InverterConnectionConfig = {
          ...prev, mode: 'real_api', brand: 'smartess', brandName: 'SmartESS (DessMonitor)', connectionStatus: 'connecting',
        };
        saveConfig(next);
        return next;
      });
    }
  }, []);

  const savings = useMemo(() => calculateFinancialSavings(telemetry, tariff), [telemetry, tariff]);

  const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length;

  return (
    <AndroidFrame
      activeAlertCount={unacknowledgedCount}
      batterySoc={telemetry.batterySoc}
      inverterConnected={isRealSmartess && config.connectionStatus === 'connected'}
      highContrast={highContrast}
      onToggleHighContrast={() => {
        setHighContrast(prev => !prev);
        playAlertSound('info');
      }}
    >
      {/* Native Android Dropping Push Banner */}
      <AndroidNotificationBanner
        alert={activeBannerAlert}
        onDismiss={dismissBanner}
        onViewAlerts={() => setCurrentTab('alerts')}
      />

      {/* Main Tab Screen Content */}
      <div className="flex-1 pb-4">
        {currentTab === 'dashboard' && (
          <DashboardView
            telemetry={telemetry}
            forecast={forecast}
            location={location}
            isLoadingWeather={isLoadingWeather}
            savings={savings}
            tariff={tariff}
            appliances={appliances}
            isEcoActive={isEcoActive}
            dataSource={isRealSmartess
              ? (config.connectionStatus === 'connected' ? 'real' : config.connectionStatus === 'failed' ? 'failed' : 'connecting')
              : 'simulation'}
            onOpenSettings={() => setCurrentTab('settings')}
            effectivePollInterval={effectivePollInterval}
            onLocationChange={handleLocationChange}
            onRequestGps={handleRequestGps}
            onRefreshWeather={handleRefreshWeather}
            onUpdateAppliance={handleUpdateAppliance}
            onAddAppliance={handleAddAppliance}
            onDeleteAppliance={handleDeleteAppliance}
            onUpdateTariff={setTariff}
            onWeatherChange={handleWeatherChange}
            onRefresh={handleManualRefresh}
            isRefreshing={isRefreshing}
            onTriggerSimEvent={handleTriggerSimEvent}
            onNavigateToTab={(tab) => setCurrentTab(tab)}
          />
        )}

        {currentTab === 'stats' && (
          <StatsView
            hourlyHistory={hourlyHistory}
            dailySummaries={dailySummaries}
            telemetry={telemetry}
            tariff={tariff}
            savings={savings}
          />
        )}

        {currentTab === 'alerts' && (
          <AlertsView
            alerts={alerts}
            thresholds={thresholds}
            onUpdateThresholds={setThresholds}
            onAcknowledgeAlert={(id) => {
              setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
            }}
            onClearAllAlerts={() => setAlerts([])}
            onTriggerTestAlert={handleTriggerTestAlert}
          />
        )}

        {currentTab === 'settings' && (
          <InverterSettingsView
            config={config}
            batterySoc={telemetry.batterySoc}
            smartessSession={smartessSession}
            onSmartessSessionChange={handleSmartessSessionChange}
            highContrast={highContrast}
            onToggleHighContrast={() => {
              setHighContrast(prev => !prev);
              playAlertSound('info');
            }}
            onSaveConfig={(newConfig) => {
              setConfig(newConfig);
              saveConfig(newConfig);
              playAlertSound('success');
            }}
          />
        )}
      </div>

      {/* Android Bottom Navigation Bar */}
      <nav className="sticky bottom-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 px-2 py-1.5 flex items-center justify-around select-none">
        {/* Tab 1: Dashboard */}
        <button
          onClick={() => setCurrentTab('dashboard')}
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all relative ${
            currentTab === 'dashboard'
              ? 'text-amber-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {currentTab === 'dashboard' && (
            <span className="absolute -top-1 w-6 h-1 rounded-full bg-amber-400" />
          )}
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[11px]">الرئيسية</span>
        </button>

        {/* Tab 2: Stats */}
        <button
          onClick={() => setCurrentTab('stats')}
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all relative ${
            currentTab === 'stats'
              ? 'text-amber-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {currentTab === 'stats' && (
            <span className="absolute -top-1 w-6 h-1 rounded-full bg-amber-400" />
          )}
          <BarChart3 className="w-5 h-5 mb-0.5" />
          <span className="text-[11px]">الإحصائيات</span>
        </button>

        {/* Tab 3: Alerts */}
        <button
          onClick={() => setCurrentTab('alerts')}
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all relative ${
            currentTab === 'alerts'
              ? 'text-amber-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {currentTab === 'alerts' && (
            <span className="absolute -top-1 w-6 h-1 rounded-full bg-amber-400" />
          )}
          <div className="relative">
            <Bell className="w-5 h-5 mb-0.5" />
            {unacknowledgedCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse border-2 border-slate-950" />
            )}
          </div>
          <span className="text-[11px]">التنبيهات</span>
        </button>

        {/* Tab 4: Settings */}
        <button
          onClick={() => setCurrentTab('settings')}
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all relative ${
            currentTab === 'settings'
              ? 'text-amber-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {currentTab === 'settings' && (
            <span className="absolute -top-1 w-6 h-1 rounded-full bg-amber-400" />
          )}
          <Settings className="w-5 h-5 mb-0.5" />
          <span className="text-[11px]">إعدادات الـ API</span>
        </button>
      </nav>
    </AndroidFrame>
  );
}
