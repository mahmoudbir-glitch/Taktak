/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type InverterBrand = 
  | 'deye'
  | 'growatt'
  | 'huawei'
  | 'goodwe'
  | 'fronius'
  | 'victron'
  | 'solaredge'
  | 'modbus'
  | 'smartess'
  | 'custom_api';

export type InverterStatus = 'normal' | 'warning' | 'fault' | 'offline' | 'islanding';

export type GridStatus = 'connected' | 'blackout' | 'islanded' | 'disconnected';

export interface SolarTelemetry {
  timestamp: string;
  
  // Solar PV
  pvPower: number; // in kW
  pvTodayKwh: number;
  pvVoltage1: number; // MPPT 1 Voltage
  pvCurrent1: number; // MPPT 1 Current
  pvVoltage2: number; // MPPT 2 Voltage
  pvCurrent2: number; // MPPT 2 Current
  pvPeakTodayKw: number;
  
  // Battery
  batterySoc: number; // Percentage 0 - 100
  batteryPower: number; // kW (+ charging, - discharging)
  batteryVoltage: number; // V e.g., 51.2
  batteryCurrent: number; // A
  batteryTemp: number; // Celsius
  batteryHealth: number; // SOH % e.g., 98%
  batteryCycles: number;
  batteryRemainingHours: number; // Hours remaining at current discharge rate
  batteryCapacityKwh: number;
  
  // Home Load
  loadPower: number; // in kW
  loadTodayKwh: number;
  essentialLoadPower: number; // Critical loads (fridge, lights, router)
  heavyLoadPower: number; // AC, water heater
  
  // Grid
  gridPower: number; // kW (+ importing from grid, - exporting/feeding in)
  gridStatus: GridStatus;
  gridTodayImportKwh: number;
  gridTodayExportKwh: number;
  gridVoltage: number;
  gridFrequency: number;
  
  // Inverter
  inverterTemp: number; // Celsius
  inverterEfficiency: number; // %
  inverterStatus: InverterStatus;
  inverterRatedPowerKw: number;
  fanSpeedPercent: number;

  /** Fields the data source does not report (shown as "—" instead of a number) */
  unavailable?: (keyof SolarTelemetry)[];
}

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface SmartAlert {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  timestamp: string;
  acknowledged: boolean;
  metric?: string;
  value?: string | number;
  recommendedAction?: string;
}

export interface InverterConnectionConfig {
  mode: 'simulation' | 'real_api';
  brand: InverterBrand;
  brandName: string;
  apiUrl: string;
  apiPort: number;
  apiKey: string;
  stationId: string;
  inverterSn: string;
  pollIntervalSec: number;
  autoReconnect: boolean;
  lastConnectedTime: string | null;
  connectionStatus: 'connected' | 'connecting' | 'failed' | 'simulated';
  ipAddress?: string;
  useModbusTcp?: boolean;
  smartEcoModeEnabled: boolean;
  smartEcoBatteryThreshold: number;
  smartEcoPollIntervalSec: number;
  /** Usable battery capacity, used for remaining-time estimates with real data */
  batteryCapacityKwh?: number;
  /** Last error from a real connection, shown in settings */
  lastError?: string | null;
}

export interface AlertThresholds {
  lowBatterySoc: number; // Default 20%
  criticalBatterySoc: number; // Default 10%
  highInverterTemp: number; // Default 65°C
  criticalInverterTemp: number; // Default 75°C
  highLoadThresholdKw: number; // Default 5.5 kW
  gridBlackoutAlert: boolean;
  pvLowPerformanceAlert: boolean;
  audioChimeEnabled: boolean;
  pushNotificationSimEnabled: boolean;
}

export interface HourlyStatsPoint {
  hour: string; // '06:00', '07:00', etc.
  solarKw: number;
  loadKw: number;
  batterySoc: number;
  gridKw: number; // positive = import, negative = export
}

export interface DailySummary {
  date: string;
  solarGeneratedKwh: number;
  homeConsumedKwh: number;
  gridImportedKwh: number;
  gridExportedKwh: number;
  selfSufficiencyPercent: number;
  moneySaved: number; // Currency
  co2SavedKg: number;
  treesEquivalent: number;
}

export type WeatherType = 'sunny' | 'partly_cloudy' | 'cloudy' | 'hazy';

export interface HourlySolarForecast {
  hour: string; // '11:00', '12:00'
  hourLabel: string; // '11:00 ص', '12:00 م'
  relativeLabel: string; // 'الآن', '+1 ساعة', etc.
  expectedKw: number;
  irradianceWm2: number;
  cloudCoverPercent: number;
  tempCelsius: number;
  weather: WeatherType;
  efficiencyPercent: number;
  isPeakHour: boolean;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  cityName: string;
  countryName: string;
  isGps?: boolean;
}

export interface SolarForecastSummary {
  estimatedRemainingTodayKwh: number;
  peakHour: string;
  peakKw: number;
  currentWeather: WeatherType;
  weatherLabel: string;
  smartAdvice: string;
  hourlyForecasts: HourlySolarForecast[];
  locationName?: string;
  source?: 'live_api' | 'fallback';
  lastUpdated?: string;
  currentIrradianceWm2?: number;
}

export interface FinancialTariffConfig {
  currencyCode: string;
  currencySymbol: string;
  currencyName: string;
  gridImportRatePerKwh: number;
  gridExportRatePerKwh: number;
  systemInstallCost: number;
}

export interface FinancialSavingsEstimate {
  dailyPvKwh: number;
  dailySelfConsumedKwh: number;
  dailyExportedKwh: number;
  dailyImportedKwh: number;
  dailySelfConsumptionSavings: number;
  dailyExportRevenue: number;
  dailyTotalSaved: number;
  dailyCostWithoutSolar: number;
  dailyActualGridCost: number;
  dailyBillReductionPercent: number;
  monthlyEstimatedPvKwh: number;
  monthlyTotalSaved: number;
  monthlyBillWithoutSolar: number;
  monthlyActualGridBill: number;
  monthlyNetSavingsPercent: number;
  yearlyEstimatedSaved: number;
  paybackPeriodYears: number;
}

export type ApplianceType = 'water_heater' | 'water_pump' | 'ev_charger' | 'ac_cooling' | 'laundry' | 'custom';

export interface SmartAppliance {
  id: string;
  name: string;
  type: ApplianceType;
  ratedKw: number;
  minSurplusKw: number;
  minBatterySoc: number;
  autoScheduleEnabled: boolean;
  status: 'running' | 'idle' | 'waiting_for_surplus' | 'manual_off';
  relayProtocol: 'Inverter Dry Contact' | 'Shelly WiFi Relay' | 'Tuya / Sonoff' | 'Modbus Coil';
  runTimeTodayMinutes: number;
  maxDailyMinutes: number;
  lastToggledAt?: string;
}
export interface PanelTiltSettings {
  tiltAngle: number; // in degrees, e.g. 22
  azimuthAngle: number; // in degrees: 180 = South, 135 = South-East, 225 = South-West
  azimuthLabel: string; // 'جنوبي (180°)'
  panelCleanlinessPercent: number; // 0 - 100% (100% = completely clean)
  lastCleanedDate: string; // '2026-10-03'
  daysSinceLastCleaned: number;
}

export interface PanelPerformanceAnalysis {
  performanceRatioPercent: number; // PR (e.g. 82.4%)
  rating: 'excellent' | 'good' | 'moderate' | 'poor';
  ratingLabel: string;
  ratingColor: string;
  optimalTiltAngle: number; // Calculated dynamically for location latitude & current season
  annualOptimalTilt: number;
  currentTiltAngle: number;
  tiltAngleDifference: number;
  tiltEfficiencyPercent: number;
  soilingLossPercent: number;
  temperatureLossPercent: number;
  actualOutputKw: number;
  theoreticalOptimalKw: number;
  lostPowerKw: number;
  lostDailyKwh: number;
  lostDailyCost: number;
  lostMonthlyCost: number;
  maintenanceUrgency: 'none' | 'recommended' | 'urgent';
  cleaningAdvice: string;
  tiltAdvice: string;
  dustLevelLabel: string;
}
