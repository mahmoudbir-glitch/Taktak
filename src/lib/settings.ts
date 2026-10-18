/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * User settings, kept in this browser only.
 */

export interface AppSettings {
  /** Usable battery capacity, for the remaining-time estimate */
  batteryCapacityKwh: number;
  /** Alert when the battery is at or below this percentage */
  lowBatteryPercent: number;
  /** Alert when the house load reaches this many kW */
  highLoadKw: number;
  /** Play a short tone with new alerts */
  sound: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  batteryCapacityKwh: 4.8,
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
