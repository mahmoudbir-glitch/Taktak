/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  LayoutDashboard, BarChart3, Bell, Settings, 
  Sun, Battery, Zap, AlertTriangle, RefreshCw
} from 'lucide-react';
import { 
  SolarTelemetry, SmartAlert, InverterConnectionConfig, 
  AlertThresholds, HourlyStatsPoint, DailySummary, WeatherType, SolarForecastSummary,
  FinancialTariffConfig, FinancialSavingsEstimate, SmartAppliance, GeoLocation 
} from './types/solar';
import { 
  INITIAL_TELEMETRY, INITIAL_CONFIG, 
  calculateNextTelemetry, generateHourlyHistory, getDailySummaries, generateSolarForecast,
  DEFAULT_TARIFF_CONFIG, calculateFinancialSavings,
  INITIAL_APPLIANCES, evaluateSmartAppliances 
} from './services/solarSim';
import { DEFAULT_LOCATION, fetchRealSolarForecast, getUserGpsLocation } from './services/weatherApi';
import { playAlertSound } from './services/sound';
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

export default function App() {
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'stats' | 'alerts' | 'settings'>('dashboard');
  const [telemetry, setTelemetry] = useState<SolarTelemetry>(INITIAL_TELEMETRY);
  const [config, setConfig] = useState<InverterConnectionConfig>(INITIAL_CONFIG);
  const [thresholds, setThresholds] = useState<AlertThresholds>(DEFAULT_THRESHOLDS);
  const [alerts, setAlerts] = useState<SmartAlert[]>(INITIAL_ALERTS);
  const [activeBannerAlert, setActiveBannerAlert] = useState<SmartAlert | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hourlyHistory, setHourlyHistory] = useState<HourlyStatsPoint[]>([]);
  const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);
  const [weatherOverride, setWeatherOverride] = useState<WeatherType>('sunny');
  const [forecast, setForecast] = useState<SolarForecastSummary>(() => generateSolarForecast(undefined, 'sunny'));
  const [location, setLocation] = useState<GeoLocation>(DEFAULT_LOCATION);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [tariff, setTariff] = useState<FinancialTariffConfig>(DEFAULT_TARIFF_CONFIG);
  const [highContrast, setHighContrast] = useState(false);
  const [appliances, setAppliances] = useState<SmartAppliance[]>(INITIAL_APPLIANCES);

  // Prevent spamming the same alert repeatedly
  const lastAlertTimeRef = useRef<{ [key: string]: number }>({});

  useEffect(() => {
    setHourlyHistory(generateHourlyHistory());
    setDailySummaries(getDailySummaries());
  }, []);

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

  // Telemetry check for automated smart alerts
  const checkTelemetryForAlerts = useCallback((t: SolarTelemetry) => {
    // 1. Blackout
    if ((t.gridStatus === 'blackout' || t.gridStatus === 'islanded') && thresholds.gridBlackoutAlert) {
      triggerAlert(
        'grid_blackout',
        'انقطاع شبكة الكهرباء العامة (Grid Blackout)',
        'فصلت الشبكة العامة. قام العاكس بالتحويل تلقائياً إلى وضع الجزيرة المعزولة (Islanding) بالاعتماد على البطارية والألواح.',
        'critical',
        'Grid = 0.0V',
        'يرجى ترشيد استهلاك المكيفات والأحمال الثقيلة للحفاظ على شحن البطارية.'
      );
    }

    // 2. Battery SOC
    if (t.batterySoc <= thresholds.criticalBatterySoc) {
      triggerAlert(
        'critical_battery',
        'طاقة البطارية في مرحلة حرجة جداً!',
        `انخفضت نسبة الشحن إلى ${Math.round(t.batterySoc)}%. يوشك النظام على الإغلاق لحماية خلايا الليثيوم.`,
        'critical',
        `SOC = ${Math.round(t.batterySoc)}%`,
        'أوقف فوراً الأحمال غير الضرورية أو قم بتوصيل الشبكة/المولد.'
      );
    } else if (t.batterySoc <= thresholds.lowBatterySoc) {
      triggerAlert(
        'low_battery',
        'تنبيه: انخفاض سعة شحن البطارية',
        `نسبة شحن البطارية وصلت إلى ${Math.round(t.batterySoc)}%، وهي أدنى من الحد الآمن المحدد (${thresholds.lowBatterySoc}%).`,
        'warning',
        `SOC = ${Math.round(t.batterySoc)}%`,
        'راقب تفريغ البطارية أو فعّل وضع توفير الطاقة.'
      );
    }

    // 3. Inverter Temp
    if (t.inverterTemp >= thresholds.criticalInverterTemp) {
      triggerAlert(
        'critical_temp',
        'خطر: ارتفاع حرارة محول الطاقة لمستوى حرج!',
        `درجة حرارة المحول بلغت ${t.inverterTemp}°C. قد يحدث خفض تلقائي للقدرة (Derating) أو إيقاف طارئ.`,
        'critical',
        `Temp = ${t.inverterTemp}°C`,
        'تأكد من سلامة تهوية غرفة المحول وعدم انسداد فتحات مراوح التبريد.'
      );
    } else if (t.inverterTemp >= thresholds.highInverterTemp) {
      triggerAlert(
        'high_temp',
        'تحذير: ارتفاع حرارة المحول الشمسي',
        `سجل المحول حرارة تشغيلية ${t.inverterTemp}°C (الحد الأقصى ${thresholds.highInverterTemp}°C).`,
        'warning',
        `Temp = ${t.inverterTemp}°C`,
        'تم رفع سرعة مراوح التبريد إلى أقصى طاقة.'
      );
    }

    // 4. Overload
    if (t.loadPower >= thresholds.highLoadThresholdKw) {
      triggerAlert(
        'high_load',
        'حمل استهلاك كهربائي مرتفع جداً',
        `أحمال المنزل تستهلك ${t.loadPower.toFixed(2)} kW مقتربة من سعة العاكس القصوى.`,
        'warning',
        `Load = ${t.loadPower.toFixed(2)} kW`,
        'تجنب تشغيل أجهزة كهربائية ثقيلة في نفس اللحظة.'
      );
    }
  }, [thresholds, triggerAlert]);

  // Dynamic Polling Loop with Smart Eco Mode
  const isEcoActive = Boolean(
    config.smartEcoModeEnabled && 
    telemetry.batterySoc <= (config.smartEcoBatteryThreshold || 20)
  );
  const effectivePollInterval = isEcoActive 
    ? (config.smartEcoPollIntervalSec || 30) 
    : (config.pollIntervalSec || 5);

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

  useEffect(() => {
    const timer = setInterval(() => {
      setTelemetry(prev => {
        const next = calculateNextTelemetry(prev);
        checkTelemetryForAlerts(next);

        // Smart Surplus Appliance Automation Check
        setAppliances(currentApps => {
          const { updatedAppliances, events } = evaluateSmartAppliances(currentApps, next);
          events.forEach(ev => {
            if (ev.action === 'started') {
              triggerAlert(
                `app_auto_${ev.applianceName}`,
                `تشغيل ذكي: ${ev.applianceName}`,
                ev.reason,
                'info',
                'فائض طاقة شمسية مجانية'
              );
            }
          });
          return updatedAppliances;
        });

        return next;
      });
    }, effectivePollInterval * 1000);

    return () => clearInterval(timer);
  }, [effectivePollInterval, checkTelemetryForAlerts, triggerAlert]);

  // Initial weather load from real Open-Meteo API
  useEffect(() => {
    let active = true;
    setIsLoadingWeather(true);
    fetchRealSolarForecast(location)
      .then(res => {
        if (active) {
          setForecast(res);
          setWeatherOverride(res.currentWeather);
        }
      })
      .catch(err => {
        console.warn('Weather fetch error:', err);
      })
      .finally(() => {
        if (active) setIsLoadingWeather(false);
      });

    return () => {
      active = false;
    };
  }, [location]);

  const handleLocationChange = async (newLoc: GeoLocation) => {
    setLocation(newLoc);
    setIsLoadingWeather(true);
    try {
      const res = await fetchRealSolarForecast(newLoc);
      setForecast(res);
      setWeatherOverride(res.currentWeather);
      playAlertSound('success');
      triggerAlert(
        'loc_changed',
        `تحديث الموقع: ${newLoc.cityName}`,
        `تم ربط توقعات الطاقة الشمسية بمحطة رصد ${newLoc.cityName} (${newLoc.countryName}) واستقبال الإشعاع الشمسي الحي.`,
        'info',
        `${res.currentIrradianceWm2 || 0} W/m²`
      );
    } catch {
      // Fallback handled in weatherApi
    } finally {
      setIsLoadingWeather(false);
    }
  };

  const handleRequestGps = async () => {
    setIsLoadingWeather(true);
    try {
      const gpsLoc = await getUserGpsLocation();
      setLocation(gpsLoc);
      const res = await fetchRealSolarForecast(gpsLoc);
      setForecast(res);
      setWeatherOverride(res.currentWeather);
      playAlertSound('success');
      triggerAlert(
        'gps_loc',
        'تم تحديد الموقع الجغرافي بنجاح (GPS)',
        `تم رصد إحداثياتك (${gpsLoc.latitude}°, ${gpsLoc.longitude}°) وجلب الإشعاع الشمسي المباشر بنجاح.`,
        'info',
        `إشعاع: ${res.currentIrradianceWm2 || 0} W/m²`
      );
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'تعذر تحديد الموقع الجغرافي';
      triggerAlert(
        'gps_err',
        'تعذر الوصول إلى نظام GPS',
        `${errorMsg}. يمكنك اختيار مدينتك يدوياً من قائمة المدن.`,
        'warning'
      );
    } finally {
      setIsLoadingWeather(false);
    }
  };

  const handleRefreshWeather = async () => {
    setIsLoadingWeather(true);
    try {
      const res = await fetchRealSolarForecast(location);
      setForecast(res);
      setWeatherOverride(res.currentWeather);
      playAlertSound('success');
    } finally {
      setIsLoadingWeather(false);
    }
  };

  const handleWeatherChange = (newWeather: WeatherType) => {
    setWeatherOverride(newWeather);
    setForecast(generateSolarForecast(undefined, newWeather));
  };

  // Manual Refresh
  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setTelemetry(prev => {
        const next = calculateNextTelemetry(prev);
        checkTelemetryForAlerts(next);
        return next;
      });
      handleRefreshWeather();
      setIsRefreshing(false);
      playAlertSound('success');
    }, 500);
  };

  // Simulation Lab Triggers
  const handleTriggerSimEvent = (eventType: 'blackout' | 'low_battery' | 'high_temp' | 'overload' | 'reset') => {
    if (eventType === 'blackout') {
      setTelemetry(prev => {
        const next = {
          ...prev,
          gridStatus: 'blackout' as const,
          gridPower: 0,
          gridVoltage: 0,
          gridFrequency: 0,
        };
        checkTelemetryForAlerts(next);
        return next;
      });
    } else if (eventType === 'low_battery') {
      setTelemetry(prev => {
        const next = {
          ...prev,
          batterySoc: 12,
          batteryVoltage: 48.2,
          batteryRemainingHours: 1.1,
          batteryPower: -2.4,
        };
        checkTelemetryForAlerts(next);
        return next;
      });
    } else if (eventType === 'high_temp') {
      setTelemetry(prev => {
        const next = {
          ...prev,
          inverterTemp: 72.4,
          fanSpeedPercent: 100,
        };
        checkTelemetryForAlerts(next);
        return next;
      });
    } else if (eventType === 'overload') {
      setTelemetry(prev => {
        const next = {
          ...prev,
          loadPower: 7.45,
          heavyLoadPower: 6.2,
        };
        checkTelemetryForAlerts(next);
        return next;
      });
    } else if (eventType === 'reset') {
      setTelemetry(INITIAL_TELEMETRY);
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

  const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length;

  return (
    <AndroidFrame
      activeAlertCount={unacknowledgedCount}
      batterySoc={telemetry.batterySoc}
      inverterConnected={config.connectionStatus !== 'failed'}
      highContrast={highContrast}
      onToggleHighContrast={() => {
        setHighContrast(prev => !prev);
        playAlertSound('info');
      }}
    >
      {/* Native Android Dropping Push Banner */}
      <AndroidNotificationBanner
        alert={activeBannerAlert}
        onDismiss={() => setActiveBannerAlert(null)}
        onViewAlerts={() => setCurrentTab('alerts')}
      />

      {/* Main Tab Screen Content */}
      <div className="flex-1 pb-20">
        {currentTab === 'dashboard' && (
          <DashboardView
            telemetry={telemetry}
            forecast={forecast}
            location={location}
            isLoadingWeather={isLoadingWeather}
            savings={calculateFinancialSavings(telemetry, tariff)}
            tariff={tariff}
            appliances={appliances}
            isEcoActive={isEcoActive}
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
            savings={calculateFinancialSavings(telemetry, tariff)}
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
            highContrast={highContrast}
            onToggleHighContrast={() => {
              setHighContrast(prev => !prev);
              playAlertSound('info');
            }}
            onSaveConfig={(newConfig) => {
              setConfig(newConfig);
              playAlertSound('success');
            }}
          />
        )}
      </div>

      {/* Android Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-4xl mx-auto z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 px-2 py-1.5 flex items-center justify-around select-none">
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
