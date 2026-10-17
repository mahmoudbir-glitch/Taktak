/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GeoLocation, SolarForecastSummary, HourlySolarForecast, WeatherType } from '../types/solar';
import { generateSolarForecast } from './solarSim';

export const CITY_PRESETS: GeoLocation[] = [
  { cityName: 'الرياض', countryName: 'المملكة العربية السعودية', latitude: 24.7136, longitude: 46.6753 },
  { cityName: 'جدة', countryName: 'المملكة العربية السعودية', latitude: 21.5433, longitude: 39.1728 },
  { cityName: 'الدمام', countryName: 'المملكة العربية السعودية', latitude: 26.4207, longitude: 50.0888 },
  { cityName: 'المدينة المنورة', countryName: 'المملكة العربية السعودية', latitude: 24.5247, longitude: 39.5692 },
  { cityName: 'دبي', countryName: 'الإمارات العربية المتحدة', latitude: 25.2048, longitude: 55.2708 },
  { cityName: 'أبوظبي', countryName: 'الإمارات العربية المتحدة', latitude: 24.4539, longitude: 54.3773 },
  { cityName: 'القاهرة', countryName: 'جمهورية مصر العربية', latitude: 30.0444, longitude: 31.2357 },
  { cityName: 'عمّان', countryName: 'المملكة الأردنية الهاشمية', latitude: 31.9454, longitude: 35.9284 },
  { cityName: 'الكويت', countryName: 'دولة الكويت', latitude: 29.3759, longitude: 47.9774 },
  { cityName: 'الدوحة', countryName: 'دولة قطر', latitude: 25.2854, longitude: 51.5310 },
  { cityName: 'مسقط', countryName: 'سلطنة عمان', latitude: 23.5880, longitude: 58.3829 },
];

export const DEFAULT_LOCATION: GeoLocation = CITY_PRESETS[0];

function mapWmoCodeToWeatherType(code: number): { type: WeatherType; label: string } {
  if (code === 0) {
    return { type: 'sunny', label: 'سماء صافية ومشمسة تماماً' };
  } else if (code >= 1 && code <= 3) {
    return { type: 'partly_cloudy', label: 'غيوم متفرقة وسحب عابرة' };
  } else if (code === 45 || code === 48) {
    return { type: 'hazy', label: 'عوالق ترابية وضباب خفيف' };
  } else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return { type: 'cloudy', label: 'سحب ماطرة وغيوم كثيفة' };
  } else if (code >= 95) {
    return { type: 'cloudy', label: 'عواصف رعدية وغيوم داكنة' };
  }
  return { type: 'partly_cloudy', label: 'طقس معتدل مع سحب' };
}

export async function fetchRealSolarForecast(
  location: GeoLocation,
  systemCapacityKw = 8.0
): Promise<SolarForecastSummary> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,cloud_cover,weather_code,shortwave_radiation_instant&hourly=temperature_2m,cloud_cover,weather_code,shortwave_radiation_instant,direct_normal_irradiance,diffuse_radiation&timezone=auto&forecast_days=2`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Open-Meteo HTTP error: ${response.status}`);
    }

    const data = await response.json();

    const currentShortwave: number = data.current?.shortwave_radiation_instant ?? 0;
    const currentWeatherCode: number = data.current?.weather_code ?? 0;

    const { type: currentWeatherType, label: weatherLabel } = mapWmoCodeToWeatherType(currentWeatherCode);

    // Parse hourly data
    const now = new Date();
    const hourlyTimes: string[] = data.hourly?.time || [];
    const hourlyRadiation: number[] = data.hourly?.shortwave_radiation_instant || [];
    const hourlyCloud: number[] = data.hourly?.cloud_cover || [];
    const hourlyTemps: number[] = data.hourly?.temperature_2m || [];
    const hourlyCodes: number[] = data.hourly?.weather_code || [];

    // Hourly times are in the location's local timezone (timezone=auto), so match
    // against the API's own "current.time" rather than the browser's UTC clock.
    const currentIsoPrefix: string =
      typeof data.current?.time === 'string' ? data.current.time.slice(0, 13) : now.toISOString().slice(0, 13);
    let currentIndex = hourlyTimes.findIndex(t => t.startsWith(currentIsoPrefix));
    if (currentIndex === -1) currentIndex = now.getHours();

    const hourlyForecasts: HourlySolarForecast[] = [];
    let remainingKwh = 0;
    let maxForecastKw = 0;
    let peakForecastHour = '12:00 م';

    // Forecast for current hour + next 7 hours
    for (let offset = 0; offset <= 7; offset++) {
      const idx = currentIndex + offset;
      if (idx >= hourlyTimes.length) break;

      const timeStr = hourlyTimes[idx];
      const rad = hourlyRadiation[idx] ?? 0; // W/m2
      const cloud = hourlyCloud[idx] ?? 0;
      const temp = Math.round(hourlyTemps[idx] ?? 28);
      const code = hourlyCodes[idx] ?? 0;

      // "YYYY-MM-DDTHH:MM" in the location's local time; read the hour directly
      const hourVal = Number(timeStr.slice(11, 13));

      // Standard Test Conditions: 1000 W/m2 generates rated capacity
      // Real AC derating: inverter efficiency ~97% + temp loss (-0.4%/°C above 25°C)
      const tempDerate = temp > 25 ? 1 - ((temp - 25) * 0.004) : 1;
      const nominalPower = (rad / 1000) * systemCapacityKw * 0.96 * tempDerate;
      const expectedKw = Number(Math.max(0, Math.min(systemCapacityKw, nominalPower)).toFixed(2));

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

      const weatherMap = mapWmoCodeToWeatherType(code);

      hourlyForecasts.push({
        hour: hourFormatted,
        hourLabel,
        relativeLabel,
        expectedKw,
        irradianceWm2: Math.round(rad),
        cloudCoverPercent: cloud,
        tempCelsius: temp,
        weather: weatherMap.type,
        efficiencyPercent: Math.round(Math.min(99, Math.max(70, 97 * tempDerate))),
        isPeakHour: false,
      });
    }

    // Mark peak hour
    hourlyForecasts.forEach(h => {
      if (h.expectedKw === maxForecastKw && maxForecastKw > 0.5) {
        h.isPeakHour = true;
      }
    });

    // Smart advice
    let smartAdvice = `بيانات حية مباشرة عبر Open-Meteo Solar API لـ ${location.cityName}. `;
    if (currentWeatherType === 'sunny' && maxForecastKw > 4.5) {
      smartAdvice += `إشعاع شمسي ممتاز يصل ذروته عند ${peakForecastHour}؛ يُنصح بتشغيل المكيفات الإضافية وسخانات المياه للاستفادة الكاملة من الفائض الشمسي المجاني.`;
    } else if (currentWeatherType === 'cloudy') {
      smartAdvice += `الطقس غائم مع حجب لضوء الشمس المباشر؛ يُنصح بالاعتماد على بنك البطاريات وترشيد الأحمال الثقيلة لتفادي السحب من الشبكة.`;
    } else {
      smartAdvice += `استقرار في معدل الإشعاع الشمسي (${Math.round(currentShortwave)} W/m²)؛ النظام يغذي أحمال المنزل بكفاءة ذاتية عالية.`;
    }

    return {
      estimatedRemainingTodayKwh: Number(remainingKwh.toFixed(1)),
      peakHour: peakForecastHour,
      peakKw: maxForecastKw,
      currentWeather: currentWeatherType,
      weatherLabel,
      smartAdvice,
      hourlyForecasts,
      locationName: `${location.cityName}، ${location.countryName}`,
      source: 'live_api',
      lastUpdated: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      currentIrradianceWm2: Math.round(currentShortwave),
    };
  } catch (err) {
    console.warn('Real weather API failed or offline, using robust solar physics fallback:', err);
    const fallback = generateSolarForecast();
    return {
      ...fallback,
      locationName: `${location.cityName} (محاكاة)`,
      source: 'fallback',
      lastUpdated: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      currentIrradianceWm2: 920,
    };
  }
}

export async function searchCities(query: string): Promise<GeoLocation[]> {
  if (!query || query.trim().length < 2) return [];

  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=6&language=ar`;
  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    if (!data.results) return [];

    return data.results.map((item: { name: string; country?: string; admin1?: string; latitude: number; longitude: number }) => ({
      cityName: item.name,
      countryName: item.country || item.admin1 || '',
      latitude: item.latitude,
      longitude: item.longitude,
    }));
  } catch (e) {
    console.error('Failed to search cities:', e);
    return [];
  }
}

export async function getUserGpsLocation(): Promise<GeoLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported by browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: Number(position.coords.latitude.toFixed(4)),
          longitude: Number(position.coords.longitude.toFixed(4)),
          cityName: 'موقعي الحالي (GPS)',
          countryName: 'تحديد دقيق بالإحداثيات',
          isGps: true,
        });
      },
      (error) => {
        reject(error);
      },
      { timeout: 7000, enableHighAccuracy: false }
    );
  });
}
