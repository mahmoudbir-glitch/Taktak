/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  SolarTelemetry, HourlyStatsPoint, DailySummary, InverterConnectionConfig,
  WeatherType, HourlySolarForecast, SolarForecastSummary,
  FinancialTariffConfig, FinancialSavingsEstimate,
  SmartAppliance, GeoLocation, PanelTiltSettings, PanelPerformanceAnalysis
} from '../types/solar';

export const INITIAL_TELEMETRY: SolarTelemetry = {
  timestamp: new Date().toISOString(),
  // Solar PV
  pvPower: 5.62, // 5.62 kW
  pvTodayKwh: 24.8,
  pvVoltage1: 345.2,
  pvCurrent1: 8.6,
  pvVoltage2: 352.0,
  pvCurrent2: 7.5,
  pvPeakTodayKw: 6.85,

  // Battery
  batterySoc: 82, // 82%
  batteryPower: 2.15, // +2.15 kW charging
  batteryVoltage: 53.4,
  batteryCurrent: 40.2,
  batteryTemp: 28.5,
  batteryHealth: 99,
  batteryCycles: 214,
  batteryRemainingHours: 7.4,
  batteryCapacityKwh: 14.3,

  // Home Load
  loadPower: 2.74, // 2.74 kW
  loadTodayKwh: 16.2,
  essentialLoadPower: 0.95,
  heavyLoadPower: 1.79,

  // Grid
  gridPower: -0.73, // -0.73 kW exporting surplus
  gridStatus: 'connected',
  gridTodayImportKwh: 3.1,
  gridTodayExportKwh: 11.7,
  gridVoltage: 228.4,
  gridFrequency: 50.02,

  // Inverter
  inverterTemp: 44.8,
  inverterEfficiency: 97.6,
  inverterStatus: 'normal',
  inverterRatedPowerKw: 8.0,
  fanSpeedPercent: 42,
};

export const INITIAL_CONFIG: InverterConnectionConfig = {
  mode: 'simulation',
  brand: 'deye',
  brandName: 'Deye / Sunsynk Hybrid Inverter',
  apiUrl: 'http://192.168.1.180/api/v1/telemetry',
  apiPort: 502,
  apiKey: '',
  stationId: 'DEYE-STN-9021',
  inverterSn: 'SN-24089921104',
  pollIntervalSec: 5,
  autoReconnect: true,
  lastConnectedTime: new Date().toISOString(),
  connectionStatus: 'simulated',
  ipAddress: '192.168.1.180',
  useModbusTcp: true,
  smartEcoModeEnabled: true,
  smartEcoBatteryThreshold: 20,
  smartEcoPollIntervalSec: 30,
  batteryCapacityKwh: 4.8,
  lastError: null,
};

export const generateHourlyHistory = (): HourlyStatsPoint[] => {
  const hours = [
    '00:00', '02:00', '04:00', '06:00', '08:00', '10:00', 
    '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'
  ];

  return hours.map((h, i) => {
    let solarKw = 0;
    if (i >= 3 && i <= 8) {
      // Daylight peak around index 6 (12:00)
      const factor = Math.sin(((i - 3) / 5) * Math.PI);
      solarKw = Number((factor * 6.5 + (Math.random() * 0.4 - 0.2)).toFixed(2));
      if (solarKw < 0) solarKw = 0;
    }

    const baseLoad = 1.2 + Math.random() * 0.6;
    const peakBonus = (i === 4 || i === 7 || i === 10) ? 1.8 : 0;
    const loadKw = Number((baseLoad + peakBonus).toFixed(2));

    // Battery SOC
    let batterySoc = 60;
    if (i < 3) batterySoc = Math.max(35, 70 - i * 8);
    else if (i >= 3 && i <= 7) batterySoc = Math.min(100, 35 + (i - 2) * 13);
    else batterySoc = Math.max(45, 95 - (i - 7) * 9);

    const net = solarKw - loadKw;
    const gridKw = net > 2 ? Number((- (net - 2)).toFixed(2)) : (net < -1 ? Number((Math.abs(net) - 1).toFixed(2)) : 0);

    return {
      hour: h,
      solarKw,
      loadKw,
      batterySoc: Math.round(batterySoc),
      gridKw,
    };
  });
};

export const getDailySummaries = (dayCount = 7): DailySummary[] => {
  const today = new Date();
  const days: DailySummary[] = [];

  for (let i = dayCount - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('ar-EG', { weekday: 'short', month: 'numeric', day: 'numeric' });
    
    // Vary based on day
    const solar = Number((28.5 + (Math.sin(i * 1.5) * 6)).toFixed(1));
    const load = Number((18.2 + (Math.cos(i * 1.2) * 3)).toFixed(1));
    const gridExp = Number((Math.max(0, solar - load * 0.8)).toFixed(1));
    const gridImp = Number((Math.max(1.2, load * 0.2 - i * 0.3)).toFixed(1));
    const selfSuff = Math.min(98, Math.round(((load - gridImp) / load) * 100));

    days.push({
      date: dateStr,
      solarGeneratedKwh: solar,
      homeConsumedKwh: load,
      gridImportedKwh: gridImp,
      gridExportedKwh: gridExp,
      selfSufficiencyPercent: selfSuff,
      moneySaved: 0, // computed per selected tariff in StatsView
      co2SavedKg: Math.round(solar * 0.72),
      treesEquivalent: Number((solar * 0.72 / 21).toFixed(1)),
    });
  }

  return days;
};

// Physics-consistent drift for real-time simulation
export function calculateNextTelemetry(
  prev: SolarTelemetry,
  overrides?: Partial<SolarTelemetry>,
  dtSec = 5
): SolarTelemetry {
  if (overrides) {
    return { ...prev, ...overrides, timestamp: new Date().toISOString() };
  }

  // Slight natural fluctuation
  const pvDelta = (Math.random() - 0.48) * 0.08;
  const newPvPower = Math.max(0, Number((prev.pvPower + pvDelta).toFixed(2)));

  const loadDelta = (Math.random() - 0.49) * 0.12;
  const newLoadPower = Math.max(0.6, Number((prev.loadPower + loadDelta).toFixed(2)));

  // Power balance: PV = Load + BatteryPower + GridPower
  // If PV > Load, excess goes to Battery first (up to 3.5 kW charge rate or until 100%), then Grid Export
  let newBatteryPower = 0;
  let newGridPower = 0;
  let newBatterySoc = prev.batterySoc;

  const surplus = newPvPower - newLoadPower;

  if (prev.gridStatus === 'blackout' || prev.gridStatus === 'islanded') {
    // No grid available!
    newGridPower = 0;
    if (surplus >= 0) {
      newBatteryPower = Math.min(4.0, surplus);
    } else {
      // Battery must supply the deficit
      newBatteryPower = surplus; // negative
    }
  } else {
    if (surplus >= 0) {
      if (prev.batterySoc < 99) {
        newBatteryPower = Math.min(3.5, surplus);
        const remainingSurplus = surplus - newBatteryPower;
        newGridPower = -Number(remainingSurplus.toFixed(2)); // Exporting
      } else {
        newBatteryPower = 0.05; // float charge
        newGridPower = -Number((surplus - 0.05).toFixed(2));
      }
    } else {
      // Deficit
      const deficit = Math.abs(surplus);
      if (prev.batterySoc > 15) {
        // Battery covers deficit
        newBatteryPower = -Math.min(4.0, deficit);
        const remainingDeficit = deficit - Math.abs(newBatteryPower);
        newGridPower = Number(remainingDeficit.toFixed(2)); // Import from grid
      } else {
        // Battery low, grid covers
        newBatteryPower = 0;
        newGridPower = Number(deficit.toFixed(2));
      }
    }
  }

  // Increment SOC gradually
  // SOC follows the energy actually moved in/out of the battery
  const socDelta = ((newBatteryPower * (dtSec / 3600)) / prev.batteryCapacityKwh) * 100;
  newBatterySoc = Math.min(100, Math.max(5, Number((prev.batterySoc + socDelta).toFixed(2))));

  // Calculate remaining hours
  let remainingHours = 12.0;
  if (newBatteryPower < -0.1) {
    const energyRemainingKwh = (newBatterySoc / 100) * prev.batteryCapacityKwh;
    remainingHours = Number((energyRemainingKwh / Math.abs(newBatteryPower)).toFixed(1));
  } else if (newBatteryPower >= 0) {
    remainingHours = 24.0;
  }

  // Inverter Temp adjusts with load & PV
  const targetTemp = 36 + (newPvPower + newLoadPower) * 1.5;
  const newTemp = Number((prev.inverterTemp * 0.95 + targetTemp * 0.05).toFixed(1));

  // Integrate energy counters from power × elapsed time
  const dtHours = dtSec / 3600;
  const round2 = (n: number) => Number(n.toFixed(2));

  return {
    ...prev,
    timestamp: new Date().toISOString(),
    pvPower: newPvPower,
    pvTodayKwh: round2(prev.pvTodayKwh + newPvPower * dtHours),
    pvPeakTodayKw: Math.max(prev.pvPeakTodayKw, newPvPower),
    batterySoc: newBatterySoc,
    batteryPower: Number(newBatteryPower.toFixed(2)),
    batteryRemainingHours: remainingHours,
    batteryVoltage: Number((48.0 + (newBatterySoc / 100) * 5.6).toFixed(1)),
    loadPower: newLoadPower,
    loadTodayKwh: round2(prev.loadTodayKwh + newLoadPower * dtHours),
    gridPower: newGridPower,
    gridTodayImportKwh: round2(prev.gridTodayImportKwh + Math.max(0, newGridPower) * dtHours),
    gridTodayExportKwh: round2(prev.gridTodayExportKwh + Math.max(0, -newGridPower) * dtHours),
    inverterTemp: newTemp,
    fanSpeedPercent: Math.min(100, Math.max(25, Math.round((newTemp - 30) * 2.5))),
    unavailable: undefined,
  };
}

export async function testInverterApiConnection(config: InverterConnectionConfig): Promise<{
  success: boolean;
  responseTimeMs: number;
  message: string;
  payloadPreview?: Record<string, unknown>;
}> {
  const start = performance.now();

  // If in simulation or local test mode
  if (config.mode === 'simulation') {
    await new Promise((r) => setTimeout(r, 650));
    return {
      success: true,
      responseTimeMs: Math.round(performance.now() - start),
      message: 'تم الاتصال بنجاح بمحول الطاقة عبر محاكي البروتوكول الذكي (Modbus/REST OK)',
      payloadPreview: {
        inverter_model: config.brandName,
        serial_number: config.inverterSn,
        station_id: config.stationId,
        protocol: config.useModbusTcp ? 'Modbus TCP / Port 502' : 'HTTP REST v2.1',
        firmware_version: 'v4.18.2-ARM',
        registers_read: 48,
        mppt_count: 2,
        battery_bms_communication: 'CANBUS OK (Pylontech/LiFePO4)',
        inverter_efficiency: '97.8%',
        rated_output: '8.0 kW',
        country_code: 'SA / 230V / 50Hz',
      },
    };
  }

  // Real API Fetch attempt
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
      headers['X-Api-Key'] = config.apiKey;
    }

    const response = await fetch(config.apiUrl, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const time = Math.round(performance.now() - start);

    if (response.ok) {
      const data = await response.json().catch(() => ({ status: 'ok', text: 'Non-JSON response' }));
      return {
        success: true,
        responseTimeMs: time,
        message: `تم التحقق بنجاح من استجابة العاكس (HTTP ${response.status}) في ${time} مللي ثانية`,
        payloadPreview: data,
      };
    } else {
      return {
        success: false,
        responseTimeMs: time,
        message: `فشل الاتصال: رمز الاستجابة ${response.status} (${response.statusText})`,
      };
    }
  } catch (err: unknown) {
    const time = Math.round(performance.now() - start);
    return {
      success: false,
      responseTimeMs: time,
      message: `تعذر الاتصال بالرابط: ${err instanceof Error ? err.message : 'Unknown error'}. يرجى التحقق من الشبكة وCORS.`,
    };
  }
}

export function generateSolarForecast(
  currentHour?: number,
  weatherOverride?: WeatherType
): SolarForecastSummary {
  const now = new Date();
  const startHour = currentHour !== undefined ? currentHour : now.getHours();

  // Weather presets
  const selectedWeather: WeatherType = weatherOverride || 'sunny';

  const weatherConfig: Record<WeatherType, { 
    label: string; 
    factor: number; 
    cloudCover: number; 
    baseTemp: number; 
    baseIrradiance: number;
  }> = {
    sunny: {
      label: 'مشمس وواضح تماماً',
      factor: 1.0,
      cloudCover: 4,
      baseTemp: 34,
      baseIrradiance: 980,
    },
    partly_cloudy: {
      label: 'غيوم متفرقة مع سطوع شمس',
      factor: 0.82,
      cloudCover: 32,
      baseTemp: 31,
      baseIrradiance: 740,
    },
    cloudy: {
      label: 'غائم جزئياً إلى كثيف',
      factor: 0.45,
      cloudCover: 78,
      baseTemp: 27,
      baseIrradiance: 390,
    },
    hazy: {
      label: 'غبار خفيف وعوالق ترابية',
      factor: 0.68,
      cloudCover: 15,
      baseTemp: 36,
      baseIrradiance: 610,
    },
  };

  const wCfg = weatherConfig[selectedWeather];
  const maxSystemKw = 7.6; // Max achievable AC peak
  const hourlyForecasts: HourlySolarForecast[] = [];

  let remainingKwh = 0;
  let maxForecastKw = 0;
  let peakForecastHour = '12:00 م';

  // Forecast for next 7 hours or until sunset
  for (let offset = 0; offset <= 7; offset++) {
    const hourVal = (startHour + offset) % 24;

    // Solar angle calculation (Sun rises ~06:00, peaks ~12:30, sets ~18:30)
    let sunFactor = 0;
    if (hourVal >= 6 && hourVal <= 18) {
      // Sine wave between 6 and 18.5
      const rad = ((hourVal - 6) / 12.5) * Math.PI;
      sunFactor = Math.sin(rad);
      if (sunFactor < 0) sunFactor = 0;
    }

    // Apply weather factor and subtle realistic hour variation
    const variation = 1 - (Math.sin(offset * 1.7) * 0.05);
    const expectedKw = Number((sunFactor * maxSystemKw * wCfg.factor * variation).toFixed(2));
    const irradiance = Math.round(sunFactor * wCfg.baseIrradiance * variation);
    const efficiency = Math.round(Math.min(99, Math.max(70, 98 - (wCfg.baseTemp > 30 ? (wCfg.baseTemp - 25) * 0.4 : 0) - (wCfg.cloudCover * 0.25))));

    const hourFormatted = `${hourVal.toString().padStart(2, '0')}:00`;
    const isPm = hourVal >= 12;
    const hour12 = hourVal === 0 ? 12 : hourVal > 12 ? hourVal - 12 : hourVal;
    const hourLabel = `${hour12}:00 ${isPm ? 'م' : 'ص'}`;
    const relativeLabel = offset === 0 ? 'الآن' : `+${offset} س`;

    if (expectedKw > maxForecastKw) {
      maxForecastKw = expectedKw;
      peakForecastHour = hourLabel;
    }

    remainingKwh += expectedKw;

    hourlyForecasts.push({
      hour: hourFormatted,
      hourLabel,
      relativeLabel,
      expectedKw,
      irradianceWm2: irradiance,
      cloudCoverPercent: Math.min(100, Math.max(0, Math.round(wCfg.cloudCover + Math.sin(offset) * 6))),
      tempCelsius: Math.round(wCfg.baseTemp + (hourVal >= 12 && hourVal <= 16 ? 3 : -2)),
      weather: selectedWeather,
      efficiencyPercent: efficiency,
      isPeakHour: false,
    });
  }

  // Mark the peak hour
  hourlyForecasts.forEach(h => {
    if (h.expectedKw === maxForecastKw && maxForecastKw > 0.5) {
      h.isPeakHour = true;
    }
  });

  // Actionable smart energy recommendation
  let smartAdvice = 'ساعات الذروة الشمسية مثالية لتشغيل الأحمال عالية الاستهلاك مثل التكييف أو شحن المركبة الكهربائية دون استخدام طاقة الشبكة.';
  if (selectedWeather === 'cloudy') {
    smartAdvice = 'الإنتاج المتوقع منخفض نسبياً بسبب الغيوم؛ يفضل الاعتماد على بنك البطاريات وترشيد الأحمال الثقيلة لتجنب السحب من الشبكة.';
  } else if (selectedWeather === 'hazy') {
    smartAdvice = 'وجود عوالق ترابية يخفض كفاءة الخلايا بنحو 30%؛ يُنصح بجدولة غسيل الألواح إذا استمرت الأتربة لرفع الإنتاج.';
  } else if (startHour >= 16) {
    smartAdvice = 'الشمس تقترب من الغروب؛ النظام سيبدأ بالتحول التلقائي لتفريغ بنك البطاريات لتغذية المنزل حتى الصباح.';
  }

  return {
    estimatedRemainingTodayKwh: Number(remainingKwh.toFixed(1)),
    peakHour: peakForecastHour,
    peakKw: maxForecastKw,
    currentWeather: selectedWeather,
    weatherLabel: wCfg.label,
    smartAdvice,
    hourlyForecasts,
  };
}

export const CURRENCY_PRESETS: FinancialTariffConfig[] = [
  {
    currencyCode: 'SAR',
    currencySymbol: 'ر.س',
    currencyName: 'ريال سعودي (SAR)',
    gridImportRatePerKwh: 0.28,
    gridExportRatePerKwh: 0.12,
    systemInstallCost: 26000,
  },
  {
    currencyCode: 'AED',
    currencySymbol: 'د.إ',
    currencyName: 'درهم إماراتي (AED)',
    gridImportRatePerKwh: 0.32,
    gridExportRatePerKwh: 0.14,
    systemInstallCost: 25000,
  },
  {
    currencyCode: 'EGP',
    currencySymbol: 'ج.م',
    currencyName: 'جنيه مصري (EGP)',
    gridImportRatePerKwh: 1.85,
    gridExportRatePerKwh: 0.95,
    systemInstallCost: 185000,
  },
  {
    currencyCode: 'JOD',
    currencySymbol: 'د.أ',
    currencyName: 'دينار أردني (JOD)',
    gridImportRatePerKwh: 0.12,
    gridExportRatePerKwh: 0.05,
    systemInstallCost: 5500,
  },
  {
    currencyCode: 'KWD',
    currencySymbol: 'د.ك',
    currencyName: 'دينار كويتي (KWD)',
    gridImportRatePerKwh: 0.025,
    gridExportRatePerKwh: 0.010,
    systemInstallCost: 2200,
  },
  {
    currencyCode: 'USD',
    currencySymbol: '$',
    currencyName: 'دولار أمريكي (USD)',
    gridImportRatePerKwh: 0.16,
    gridExportRatePerKwh: 0.08,
    systemInstallCost: 7200,
  },
];

export const DEFAULT_TARIFF_CONFIG: FinancialTariffConfig = CURRENCY_PRESETS[0];

export function calculateFinancialSavings(
  telemetry: SolarTelemetry,
  tariff: FinancialTariffConfig = DEFAULT_TARIFF_CONFIG
): FinancialSavingsEstimate {
  const dailyPv = telemetry.pvTodayKwh;
  const dailyExport = telemetry.gridTodayExportKwh;
  const dailyImport = telemetry.gridTodayImportKwh;
  const dailyLoad = telemetry.loadTodayKwh;

  // Self-consumed solar energy
  const selfConsumedKwh = Math.max(0, Number((dailyPv - dailyExport).toFixed(2)));

  // Direct savings from not purchasing selfConsumedKwh from the grid
  const directSelfSavings = Number((selfConsumedKwh * tariff.gridImportRatePerKwh).toFixed(2));

  // Revenue from feeding surplus back to the grid
  const exportRevenue = Number((dailyExport * tariff.gridExportRatePerKwh).toFixed(2));

  // What the user would have had to pay the grid without any solar installation.
  // The house used at least what solar covered plus what came from the grid.
  const houseKwh = Math.max(dailyLoad, selfConsumedKwh + dailyImport);
  const costWithoutSolar = Number((houseKwh * tariff.gridImportRatePerKwh).toFixed(2));

  // What the user actually owes the grid today for imported energy
  const actualGridCost = Number((dailyImport * tariff.gridImportRatePerKwh).toFixed(2));

  // Net daily savings: solar energy used instead of grid energy + export credit
  const dailyTotalSaved = Number((directSelfSavings + exportRevenue).toFixed(2));

  const dailyReductionPercent = costWithoutSolar > 0
    ? Math.min(100, Math.round(((costWithoutSolar - actualGridCost) / costWithoutSolar) * 100))
    : 100;

  // Monthly projections (30 days average)
  const monthlyPv = Number((dailyPv * 30).toFixed(1));
  const monthlyTotalSaved = Number((dailyTotalSaved * 30).toFixed(1));
  const monthlyBillWithoutSolar = Number((costWithoutSolar * 30).toFixed(1));
  const monthlyActualGridBill = Number((actualGridCost * 30).toFixed(1));
  const monthlyNetSavingsPercent = monthlyBillWithoutSolar > 0
    ? Math.min(100, Math.round(((monthlyBillWithoutSolar - monthlyActualGridBill) / monthlyBillWithoutSolar) * 100))
    : 95;

  // Yearly & Payback
  const yearlyEstimatedSaved = Number((dailyTotalSaved * 365).toFixed(0));
  const paybackYears = yearlyEstimatedSaved > 0
    ? Number((tariff.systemInstallCost / yearlyEstimatedSaved).toFixed(1))
    : 4.5;

  return {
    dailyPvKwh: dailyPv,
    dailySelfConsumedKwh: selfConsumedKwh,
    dailyExportedKwh: dailyExport,
    dailyImportedKwh: dailyImport,
    dailySelfConsumptionSavings: directSelfSavings,
    dailyExportRevenue: exportRevenue,
    dailyTotalSaved,
    dailyCostWithoutSolar: costWithoutSolar,
    dailyActualGridCost: actualGridCost,
    dailyBillReductionPercent: dailyReductionPercent,
    monthlyEstimatedPvKwh: monthlyPv,
    monthlyTotalSaved,
    monthlyBillWithoutSolar,
    monthlyActualGridBill,
    monthlyNetSavingsPercent,
    yearlyEstimatedSaved,
    paybackPeriodYears: paybackYears,
  };
}

export const INITIAL_APPLIANCES: SmartAppliance[] = [
  {
    id: 'app-water-heater',
    name: 'سخان المياه الذكي (Thermal Storage)',
    type: 'water_heater',
    ratedKw: 1.8,
    minSurplusKw: 1.5,
    minBatterySoc: 75,
    autoScheduleEnabled: true,
    status: 'running',
    relayProtocol: 'Inverter Dry Contact',
    runTimeTodayMinutes: 45,
    maxDailyMinutes: 120,
    lastToggledAt: 'منذ 45 دقيقة',
  },
  {
    id: 'app-water-pump',
    name: 'مضخة مياه الخزان والري الزراعي',
    type: 'water_pump',
    ratedKw: 1.2,
    minSurplusKw: 1.1,
    minBatterySoc: 70,
    autoScheduleEnabled: true,
    status: 'idle',
    relayProtocol: 'Shelly WiFi Relay',
    runTimeTodayMinutes: 25,
    maxDailyMinutes: 60,
    lastToggledAt: 'اليوم 08:30 ص',
  },
  {
    id: 'app-ev-charger',
    name: 'شاحن المركبة الكهربائية (EV Charger)',
    type: 'ev_charger',
    ratedKw: 3.5,
    minSurplusKw: 3.2,
    minBatterySoc: 85,
    autoScheduleEnabled: false,
    status: 'waiting_for_surplus',
    relayProtocol: 'Tuya / Sonoff',
    runTimeTodayMinutes: 0,
    maxDailyMinutes: 180,
  },
  {
    id: 'app-ac-extra',
    name: 'مكيف الصالة الإضافي (Solar Boost AC)',
    type: 'ac_cooling',
    ratedKw: 2.2,
    minSurplusKw: 2.0,
    minBatterySoc: 80,
    autoScheduleEnabled: true,
    status: 'idle',
    relayProtocol: 'Inverter Dry Contact',
    runTimeTodayMinutes: 60,
    maxDailyMinutes: 180,
  },
];

export function evaluateSmartAppliances(
  appliances: SmartAppliance[],
  telemetry: SolarTelemetry,
  elapsedMinutes = 5 / 60
): {
  updatedAppliances: SmartAppliance[];
  events: { applianceName: string; action: 'started' | 'stopped'; reason: string }[];
} {
  const surplusKw = Math.max(0, telemetry.pvPower - telemetry.loadPower);
  const batterySoc = telemetry.batterySoc;
  const isGridBlackout = telemetry.gridStatus === 'blackout' || telemetry.gridStatus === 'islanded';

  const events: { applianceName: string; action: 'started' | 'stopped'; reason: string }[] = [];

  const updated = appliances.map((app) => {
    if (!app.autoScheduleEnabled) {
      return app;
    }

    // Safety: if grid blackout and battery is below min, stop all non-essential auto loads
    if (isGridBlackout && batterySoc < 50) {
      if (app.status === 'running') {
        events.push({
          applianceName: app.name,
          action: 'stopped',
          reason: 'إيقاف طارئ بسبب انقطاع الشبكة وانخفاض البطارية',
        });
      }
      return { ...app, status: 'idle' as const };
    }

    const hasEnoughSurplus = surplusKw >= app.minSurplusKw;
    const hasEnoughBattery = batterySoc >= app.minBatterySoc;
    const underMaxTime = app.runTimeTodayMinutes < app.maxDailyMinutes;

    if (hasEnoughSurplus && hasEnoughBattery && underMaxTime) {
      if (app.status !== 'running') {
        events.push({
          applianceName: app.name,
          action: 'started',
          reason: `توفر فائض شمسي (${surplusKw.toFixed(1)} kW) مع شحن بطارية كافٍ (${Math.round(batterySoc)}%)`,
        });
      }
      return {
        ...app,
        status: 'running' as const,
        runTimeTodayMinutes: Number((app.runTimeTodayMinutes + elapsedMinutes).toFixed(2)),
        lastToggledAt: 'الآن (تلقائي)',
      };
    } else {
      if (app.status === 'running') {
        events.push({
          applianceName: app.name,
          action: 'stopped',
          reason: `انخفاض الفائض الشمسي دون ${app.minSurplusKw} kW للحفاظ على البطارية وتجنب السحب من الشبكة`,
        });
      }
      const newStatus: 'waiting_for_surplus' | 'idle' = !hasEnoughSurplus ? 'waiting_for_surplus' : 'idle';
      return {
        ...app,
        status: newStatus,
      };
    }
  });

  return { updatedAppliances: updated, events };
}



