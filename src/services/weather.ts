/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Solar production forecast from Open-Meteo (free, no key).
 */

export interface Place {
  name: string;
  latitude: number;
  longitude: number;
}

export interface ForecastHour {
  /** epoch ms of the hour start */
  at: number;
  /** "14:00" in the place's local time */
  label: string;
  dayOffset: 0 | 1;
  irradiance: number;
  cloud: number;
  tempC: number;
  expectedKw: number;
}

export interface Forecast {
  place: string;
  hours: ForecastHour[];
  /** kWh expected for the rest of today and for tomorrow */
  todayRemainingKwh: number;
  tomorrowKwh: number;
  peak: ForecastHour | null;
}

/** Share of rated PV power reaching the AC side (wiring, heat, inverter) */
const PERFORMANCE_RATIO = 0.8;

export async function fetchForecast(place: Place, pvCapacityKw: number): Promise<Forecast> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
    '&hourly=shortwave_radiation,cloud_cover,temperature_2m&timezone=auto&forecast_days=2';
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`خدمة الطقس لا تستجيب (HTTP ${res.status})`);
  const data = await res.json();

  const times: string[] = data.hourly?.time ?? [];
  const rad: number[] = data.hourly?.shortwave_radiation ?? [];
  const cloud: number[] = data.hourly?.cloud_cover ?? [];
  const temp: number[] = data.hourly?.temperature_2m ?? [];
  const offsetSec: number = data.utc_offset_seconds ?? 0;
  const firstDay = times[0]?.slice(0, 10);

  const hours: ForecastHour[] = times.map((t, i) => {
    const at = Date.parse(`${t}:00Z`) - offsetSec * 1000; // local wall time → real instant
    const tempC = temp[i] ?? 25;
    const derate = tempC > 25 ? 1 - (tempC - 25) * 0.004 : 1;
    const irradiance = rad[i] ?? 0;
    return {
      at,
      label: t.slice(11, 16),
      dayOffset: t.slice(0, 10) === firstDay ? 0 : 1,
      irradiance: Math.round(irradiance),
      cloud: Math.round(cloud[i] ?? 0),
      tempC: Math.round(tempC),
      expectedKw: Math.max(0, (irradiance / 1000) * pvCapacityKw * PERFORMANCE_RATIO * derate),
    };
  });

  // Open-Meteo radiation is the mean of the preceding hour, so the hour ending now is "current"
  const now = Date.now();
  const upcoming = hours.filter((h) => h.at >= now - 3600_000);
  const sum = (list: ForecastHour[]) => list.reduce((a, h) => a + h.expectedKw, 0);
  const todayLeft = upcoming.filter((h) => h.dayOffset === 0);
  const peak = todayLeft.length
    ? todayLeft.reduce((best, h) => (h.expectedKw > best.expectedKw ? h : best))
    : null;

  return {
    place: place.name,
    hours: upcoming,
    todayRemainingKwh: sum(todayLeft),
    tomorrowKwh: sum(hours.filter((h) => h.dayOffset === 1)),
    peak: peak && peak.expectedKw > 0.05 ? peak : null,
  };
}

export async function searchPlaces(query: string): Promise<Place[]> {
  if (query.trim().length < 2) return [];
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=6&language=ar`,
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results ?? []).map((r: { name: string; country?: string; latitude: number; longitude: number }) => ({
    name: r.country ? `${r.name}، ${r.country}` : r.name,
    latitude: r.latitude,
    longitude: r.longitude,
  }));
}

export function currentPlace(): Promise<Place> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('المتصفح لا يدعم تحديد الموقع'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({
        name: 'موقعي الحالي',
        latitude: Number(p.coords.latitude.toFixed(3)),
        longitude: Number(p.coords.longitude.toFixed(3)),
      }),
      () => reject(new Error('لم يُسمح بتحديد الموقع')),
      { timeout: 8000 },
    );
  });
}
