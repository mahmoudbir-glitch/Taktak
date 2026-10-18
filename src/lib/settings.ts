/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * User settings, kept in this browser only.
 */

import type { Place } from '../services/weather';

export interface AppSettings {
  /** Usable battery capacity, for the remaining-time estimate */
  batteryCapacityKwh: number;
  /** Rated power of the solar panels, for the production forecast */
  pvCapacityKw: number;
  /** Where the panels are, for the forecast */
  place: Place;
  /** Price of one kWh from the grid or generator, for the savings page */
  pricePerKwh: number;
  currency: string;
  /** What the system cost, for the payback estimate (0 = not set) */
  systemCost: number;
  /** Alert when the battery is at or below this percentage */
  lowBatteryPercent: number;
  /** Alert when the house load reaches this many kW */
  highLoadKw: number;
  /** Play a short tone with new alerts */
  sound: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  batteryCapacityKwh: 4.8,
  pvCapacityKw: 5,
  place: { name: 'بيروت، لبنان', latitude: 33.894, longitude: 35.502 },
  pricePerKwh: 0.25,
  currency: '$',
  systemCost: 0,
  lowBatteryPercent: 20,
  highLoadKw: 4,
  sound: true,
};

const KEY = 'shamsak.settings.v2';

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable: settings last for this visit */
  }
}
