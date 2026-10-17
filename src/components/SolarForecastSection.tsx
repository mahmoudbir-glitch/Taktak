/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Sun, CloudSun, Cloud, Wind, Sparkles, 
  TrendingUp, Clock, Zap, Lightbulb, Compass, 
  MapPin, Navigation, Search, RefreshCw, Radio, Check, X, Loader2
} from 'lucide-react';
import { SolarForecastSummary, WeatherType, HourlySolarForecast, GeoLocation } from '../types/solar';
import { CITY_PRESETS, searchCities } from '../services/weatherApi';

interface SolarForecastProps {
  forecast: SolarForecastSummary;
  location: GeoLocation;
  isLoadingWeather?: boolean;
  onWeatherChange: (weather: WeatherType) => void;
  onLocationChange: (loc: GeoLocation) => void;
  onRequestGps: () => void;
  onRefreshWeather?: () => void;
}

export const SolarForecastSection: React.FC<SolarForecastProps> = ({
  forecast,
  location,
  isLoadingWeather = false,
  onWeatherChange,
  onLocationChange,
  onRequestGps,
  onRefreshWeather,
}) => {
  const [selectedHour, setSelectedHour] = useState<HourlySolarForecast | null>(
    forecast.hourlyForecasts[0] || null
  );
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeoLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const getWeatherIcon = (weather: WeatherType) => {
    switch (weather) {
      case 'sunny':
        return <Sun className="w-5 h-5 text-amber-400 animate-spin-slow" />;
      case 'partly_cloudy':
        return <CloudSun className="w-5 h-5 text-amber-300" />;
      case 'cloudy':
        return <Cloud className="w-5 h-5 text-slate-400" />;
      case 'hazy':
        return <Wind className="w-5 h-5 text-amber-600/80" />;
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const results = await searchCities(query);
      setSearchResults(results);
    } finally {
      setIsSearching(false);
    }
  };

  const maxKw = Math.max(...forecast.hourlyForecasts.map(h => h.expectedKw), 7.0);

  return (
    <div className="bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800/80 rounded-3xl p-4 sm:p-5 shadow-2xl backdrop-blur-xl relative overflow-hidden">
      {/* Background subtle solar flare glow */}
      <div className="absolute top-0 right-1/4 w-72 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Real Geographic Location & Weather API Banner */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 mb-3.5 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-100 truncate">
                {forecast.locationName || `${location.cityName}، ${location.countryName}`}
              </span>
              <span className={`px-2 py-0.2 rounded-full text-[9px] font-mono font-bold flex items-center gap-1 ${
                forecast.source === 'live_api'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${forecast.source === 'live_api' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span>{forecast.source === 'live_api' ? 'بيانات حية Open-Meteo' : 'محاكاة شمسية'}</span>
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
              <span>إحداثيات: {location.latitude.toFixed(2)}°N, {location.longitude.toFixed(2)}°E</span>
              {forecast.currentIrradianceWm2 !== undefined && (
                <>
                  <span>•</span>
                  <span className="text-amber-400 font-bold">إشعاع شمسي مقاس: {forecast.currentIrradianceWm2} W/m²</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Location Action Buttons */}
        <div className="flex items-center gap-1.5 mr-auto sm:mr-0">
          <button
            onClick={onRequestGps}
            disabled={isLoadingWeather}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-cyan-300 hover:text-cyan-200 text-xs font-bold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
            title="تحديد الموقع عبر GPS للهاتف"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span className="text-[11px]">موقعي GPS</span>
          </button>

          <button
            onClick={() => setShowLocationModal(true)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-bold flex items-center gap-1 transition-all active:scale-95"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px]">تغيير المدينة</span>
          </button>

          {onRefreshWeather && (
            <button
              onClick={onRefreshWeather}
              disabled={isLoadingWeather}
              className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 transition-all active:scale-95 disabled:opacity-50"
              title="تحديث بيانات الطقس والإشعاع"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingWeather ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Header and Title */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-800/70">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>توقعات الإنتاج الشمسي الحية (Solar Radiation Forecast)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  WMO Satellite Data
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                توقعات دقيقة مبنية على محطات الرصد وكمية الإشعاع المباشر والمنتشر (Direct & Diffuse Irradiance)
              </p>
            </div>
          </div>
        </div>

        {/* Live Weather Indicator */}
        <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800/80 text-xs">
          <div className="flex items-center gap-1.5">
            {getWeatherIcon(forecast.currentWeather)}
            <span className="font-bold text-slate-200">{forecast.weatherLabel}</span>
          </div>
          {forecast.lastUpdated && (
            <span className="text-[10px] text-slate-500 font-mono">({forecast.lastUpdated})</span>
          )}
        </div>
      </div>

      {/* Key Forecast Summary Badges (3 items) */}
      <div className="grid grid-cols-3 gap-2.5 mb-4">
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-2.5 text-center">
          <span className="text-[10px] text-slate-400 block mb-0.5 flex items-center justify-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>متوقع لبقية اليوم</span>
          </span>
          <span className="text-base sm:text-lg font-black font-mono text-amber-400 block">
            +{forecast.estimatedRemainingTodayKwh}
          </span>
          <span className="text-[9px] text-slate-500">كيلوواط.ساعة (kWh)</span>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-2.5 text-center">
          <span className="text-[10px] text-slate-400 block mb-0.5 flex items-center justify-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span>ذروة التوليد المتوقعة</span>
          </span>
          <span className="text-base sm:text-lg font-black font-mono text-emerald-400 block">
            {forecast.peakKw} kW
          </span>
          <span className="text-[9px] text-slate-400 font-bold font-mono">في {forecast.peakHour}</span>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-2.5 text-center">
          <span className="text-[10px] text-slate-400 block mb-0.5 flex items-center justify-center gap-1">
            <Compass className="w-3 h-3 text-cyan-400" />
            <span>معدل الإشعاع الشمسي</span>
          </span>
          <span className="text-xs sm:text-sm font-bold font-mono text-slate-200 block truncate">
            {forecast.currentIrradianceWm2 ? `${forecast.currentIrradianceWm2} W/m²` : '960 W/m²'}
          </span>
          <span className="text-[9px] text-slate-500 font-mono">حقيقي ومقاس</span>
        </div>
      </div>

      {/* Hourly Timeline Cards (Horizontal Scrollable Strip) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span className="flex items-center gap-1 font-bold text-slate-300">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>منحنى الإشعاع الشمسي للساعات القادمة:</span>
          </span>
          <span className="text-[11px] text-slate-500 font-mono">انقر على أي ساعة لعرض تفاصيل الإشعاع</span>
        </div>

        {/* Scrollable Container */}
        <div className="flex items-stretch gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar">
          {forecast.hourlyForecasts.map((hourData, index) => {
            const isSelected = selectedHour?.hour === hourData.hour;
            const barHeightPercent = Math.max(8, Math.round((hourData.expectedKw / maxKw) * 100));

            return (
              <div
                key={index}
                onClick={() => setSelectedHour(hourData)}
                className={`flex-shrink-0 w-24 sm:w-28 rounded-2xl p-2.5 border cursor-pointer transition-all flex flex-col justify-between items-center text-center relative ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500/80 shadow-lg shadow-amber-500/10'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Peak Badge */}
                {hourData.isPeakHour && (
                  <span className="absolute -top-2 px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black tracking-tight shadow">
                    الذروة ⭐
                  </span>
                )}

                {/* Relative label + Hour */}
                <div className="w-full">
                  <span className={`text-[10px] font-mono block ${index === 0 ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>
                    {hourData.relativeLabel}
                  </span>
                  <span className="text-xs font-bold text-slate-200 block mt-0.5">
                    {hourData.hourLabel}
                  </span>
                </div>

                {/* Weather icon */}
                <div className="my-2 p-1.5 rounded-xl bg-slate-900 border border-slate-800">
                  {getWeatherIcon(hourData.weather)}
                </div>

                {/* Expected Power Meter Bar */}
                <div className="w-full h-12 bg-slate-900 rounded-lg p-1 flex items-end justify-center mb-1">
                  <div 
                    className={`w-full rounded-md transition-all duration-300 ${
                      hourData.expectedKw === 0
                        ? 'bg-slate-700 h-1'
                        : hourData.isPeakHour
                        ? 'bg-gradient-to-t from-amber-600 via-amber-500 to-amber-300'
                        : 'bg-gradient-to-t from-amber-600 to-amber-400'
                    }`}
                    style={{ height: `${hourData.expectedKw === 0 ? 4 : barHeightPercent}%` }}
                  />
                </div>

                {/* Expected kW */}
                <div className="w-full">
                  <span className="text-xs font-black font-mono text-amber-400 block">
                    {hourData.expectedKw} <span className="text-[10px] font-sans text-slate-400">kW</span>
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono block mt-0.5">
                    {hourData.irradianceWm2} W/m²
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Hour Details Card */}
      {selectedHour && (
        <div className="mt-3 p-3 bg-slate-950/70 rounded-2xl border border-slate-800/90 text-xs flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              تفاصيل {selectedHour.hourLabel} ({selectedHour.relativeLabel})
            </span>
            <span className="text-slate-300 text-[11px]">
              الإشعاع الشمسي المقاس: <strong className="text-amber-300 font-mono">{selectedHour.irradianceWm2} W/m²</strong>
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
            <span>نسبة السحب: <strong className="text-slate-200">{selectedHour.cloudCoverPercent}%</strong></span>
            <span>حرارة الجو: <strong className="text-slate-200">{selectedHour.tempCelsius}°C</strong></span>
            <span>الكفاءة المتوقعة: <strong className="text-emerald-400">{selectedHour.efficiencyPercent}%</strong></span>
          </div>
        </div>
      )}

      {/* Smart Actionable Recommendation Banner */}
      <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-2.5">
        <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-200/90 leading-relaxed">
          <strong className="font-bold text-amber-300 block mb-0.5">توصية شمسك الذكية للاستهلاك:</strong>
          <span>{forecast.smartAdvice}</span>
        </div>
      </div>

      {/* City & Geographic Location Selector Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <span>اختيار الموقع الجغرافي لجلب إشعاع الشمس الحقيقي</span>
              </h3>
              <button
                onClick={() => setShowLocationModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* GPS quick button inside modal */}
            <button
              onClick={() => {
                onRequestGps();
                setShowLocationModal(false);
              }}
              className="w-full py-2.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 hover:bg-cyan-900/50 text-cyan-300 font-bold text-xs flex items-center justify-center gap-2 transition-all"
            >
              <Navigation className="w-4 h-4" />
              <span>استخدام موقعي الفعلي عبر GPS</span>
            </button>

            {/* Search Input */}
            <div className="relative">
              <label className="text-xs font-bold text-slate-300 block mb-1">
                ابحث عن أي مدينة أو منطقة:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="مثال: الرياض، دبي، مكة، طرابلس..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
                <Search className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                {isSearching && (
                  <Loader2 className="w-4 h-4 text-cyan-400 animate-spin absolute left-3 top-1/2 -translate-y-1/2" />
                )}
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-2 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/60 max-h-40 overflow-y-auto">
                  {searchResults.map((res, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        onLocationChange(res);
                        setShowLocationModal(false);
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                      className="p-2.5 hover:bg-slate-800 cursor-pointer text-xs flex items-center justify-between"
                    >
                      <span className="font-bold text-slate-200">{res.cityName}</span>
                      <span className="text-[10px] text-slate-400">{res.countryName}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Preset Arab Cities */}
            <div>
              <span className="text-xs font-bold text-slate-400 block mb-2">أو اختر من المدن الشائعة:</span>
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                {CITY_PRESETS.map((city) => (
                  <button
                    key={city.cityName}
                    onClick={() => {
                      onLocationChange(city);
                      setShowLocationModal(false);
                    }}
                    className={`p-2 rounded-xl border text-right text-xs transition-all flex items-center justify-between ${
                      location.cityName === city.cityName
                        ? 'bg-cyan-500/15 border-cyan-500 text-cyan-300 font-bold'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span>{city.cityName}</span>
                    <span className="text-[10px] text-slate-500 font-mono truncate">{city.countryName.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
