/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MapPin } from 'lucide-react';
import type { Forecast, Place } from '../services/weather';
import { currentPlace, searchPlaces } from '../services/weather';
import { Button, Card, Row, cardClass, inputClass } from './ui';

interface ForecastViewProps {
  forecast: Forecast | null;
  error: string | null;
  pvCapacityKw: number;
  onPlaceChange: (p: Place) => void;
}

export const ForecastView: React.FC<ForecastViewProps> = ({ forecast, error, pvCapacityKw, onPlaceChange }) => {
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setResults(await searchPlaces(query).catch(() => []));
    setBusy(false);
  };

  const choose = (p: Place) => {
    onPlaceChange(p);
    setEditing(false);
    setResults([]);
    setQuery('');
  };

  const useGps = async () => {
    setPlaceError(null);
    try {
      choose(await currentPlace());
    } catch (err) {
      setPlaceError(err instanceof Error ? err.message : 'تعذر تحديد الموقع');
    }
  };

  // Next 12 hours with sun, as a bar list
  const hours = forecast?.hours.slice(0, 24).filter((h) => h.irradiance > 0).slice(0, 12) ?? [];
  const maxKw = Math.max(pvCapacityKw * 0.8, ...hours.map((h) => h.expectedKw), 0.1);

  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="flex items-center gap-2 text-sm text-slate-700">
            <MapPin className="w-4 h-4 text-slate-400" />
            {forecast?.place ?? '—'}
          </span>
          <button type="button" onClick={() => setEditing((v) => !v)} className="text-sm font-bold text-slate-900">
            {editing ? 'إلغاء' : 'تغيير'}
          </button>
        </div>
        {editing && (
          <div className="px-4 pb-4 space-y-2 border-t border-slate-100 pt-3">
            <form onSubmit={search} className="flex gap-2">
              <input className={inputClass} placeholder="اسم المدينة" value={query} onChange={(e) => setQuery(e.target.value)} />
              <Button type="submit" disabled={busy || query.trim().length < 2}>بحث</Button>
            </form>
            {results.map((p) => (
              <button
                key={`${p.latitude},${p.longitude}`}
                type="button"
                onClick={() => choose(p)}
                className="block w-full text-start px-4 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 hover:bg-slate-50"
              >
                {p.name}
              </button>
            ))}
            <Button variant="plain" onClick={useGps} className="w-full">استخدام موقعي الحالي</Button>
            {placeError && <p className="text-sm text-rose-700">{placeError}</p>}
          </div>
        )}
      </Card>

      {error && !forecast && <Card><p className="p-4 text-sm text-rose-700">{error}</p></Card>}
      {!forecast && !error && <Card><p className="p-4 text-sm text-slate-500">جاري جلب التوقعات…</p></Card>}

      {forecast && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className={`${cardClass} p-4`}>
              <p className="text-xs font-bold text-slate-500">باقي اليوم</p>
              <p className="mt-2"><span className="text-3xl font-bold tabular-nums">{forecast.todayRemainingKwh.toFixed(1)}</span><span className="text-sm text-slate-500 ms-1">kWh</span></p>
            </div>
            <div className={`${cardClass} p-4`}>
              <p className="text-xs font-bold text-slate-500">غداً</p>
              <p className="mt-2"><span className="text-3xl font-bold tabular-nums">{forecast.tomorrowKwh.toFixed(1)}</span><span className="text-sm text-slate-500 ms-1">kWh</span></p>
            </div>
          </div>

          <Card title={`الإنتاج المتوقع بالساعة (ألواح ${pvCapacityKw} kW)`}>
            {hours.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">لا شمس في الساعات القادمة. التوقعات تعود مع الصباح.</p>
            ) : (
              <ul className="px-4 py-2">
                {hours.map((h) => (
                  <li key={h.at} className="flex items-center gap-3 py-1.5 text-sm">
                    <span className="w-14 text-slate-500 tabular-nums">{h.dayOffset ? `غداً ${h.label}` : h.label}</span>
                    <span className="flex-1 h-2.5 bg-amber-50 rounded-full overflow-hidden">
                      <span
                        className={`block h-full rounded-full ${forecast.peak?.at === h.at ? 'bg-amber-500' : 'bg-amber-300'}`}
                        style={{ width: `${Math.min(100, (h.expectedKw / maxKw) * 100)}%` }}
                      />
                    </span>
                    <span className="w-16 text-end font-semibold tabular-nums">{h.expectedKw.toFixed(2)} kW</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {forecast.peak && (
            <Card>
              <Row label="ذروة الإنتاج اليوم" value={`${forecast.peak.label} • ${forecast.peak.expectedKw.toFixed(2)} kW`} />
              <Row label="الغيوم وقت الذروة" value={`${forecast.peak.cloud}%`} />
            </Card>
          )}
          <p className="text-xs text-slate-400 px-1">التوقعات من Open-Meteo حسب الإشعاع الشمسي وقدرة الألواح المحددة في الإعدادات.</p>
        </>
      )}
    </div>
  );
};
