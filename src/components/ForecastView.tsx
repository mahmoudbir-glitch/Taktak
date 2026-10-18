/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BarChart3, Lightbulb, MapPin, Search } from 'lucide-react';
import type { Forecast, Place } from '../services/weather';
import { currentPlace, searchPlaces } from '../services/weather';
import { ltr } from '../lib/format';
import { Button, Card, CardHead, Collapsible, InfoList, StatBox, inputClass } from './ui';

interface ForecastViewProps {
  forecast: Forecast | null;
  error: string | null;
  pvCapacityKw: number;
  onPlaceChange: (p: Place) => void;
}

/** One practical tip from the forecast */
function advice(f: Forecast, pvKw: number): string {
  if (!f.peak) return 'لا شمس متبقية اليوم. اعتمد على البطارية بحمل خفيف حتى الصباح.';
  const strong = f.peak.expectedKw >= pvKw * 0.5;
  if (strong) return `أفضل وقت لتشغيل الأحمال الثقيلة (الغسالة، السخان، المكواة) حول الساعة ${f.peak.label}، حين يصل الإنتاج إلى ${ltr(`${f.peak.expectedKw.toFixed(1)} kW`)}.`;
  if (f.peak.cloud >= 60) return 'غيوم كثيفة متوقعة؛ الإنتاج ضعيف اليوم، فوزّع الأحمال الثقيلة ووفّر البطارية.';
  return `إنتاج متوسط اليوم، وذروته ${f.peak.label}. شغّل الأحمال الثقيلة وقتها واحدة بعد الأخرى.`;
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

  const hours = forecast?.hours.slice(0, 30).filter((h) => h.irradiance > 0).slice(0, 12) ?? [];
  const maxKw = Math.max(pvCapacityKw * 0.8, ...hours.map((h) => h.expectedKw), 0.1);

  return (
    <div className="space-y-3">
      <Card className="p-4">
        <CardHead
          icon={<MapPin className="h-5 w-5" />}
          title={forecast?.place ?? '—'}
          subtitle={`ألواح بقدرة ${ltr(`${pvCapacityKw} kW`)}`}
          tone="sun"
          right={
            <button type="button" onClick={() => setEditing((v) => !v)} className="rounded-xl bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700">
              {editing ? 'إلغاء' : 'تغيير'}
            </button>
          }
        />
        {editing && (
          <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
            <form onSubmit={search} className="flex gap-2">
              <input className={inputClass} placeholder="اسم المدينة" value={query} onChange={(e) => setQuery(e.target.value)} />
              <Button type="submit" disabled={busy || query.trim().length < 2} aria-label="بحث"><Search className="h-4 w-4" /></Button>
            </form>
            {results.map((p) => (
              <button key={`${p.latitude},${p.longitude}`} type="button" onClick={() => choose(p)}
                className="block w-full rounded-xl border border-slate-200 px-4 py-2.5 text-start text-sm font-semibold hover:bg-slate-50">
                {p.name}
              </button>
            ))}
            <Button variant="plain" onClick={useGps} className="w-full">استخدام موقعي الحالي</Button>
            {placeError && <p className="text-sm font-semibold text-rose-600">{placeError}</p>}
          </div>
        )}
      </Card>

      {error && !forecast && <Card><p className="p-5 text-sm font-semibold text-rose-600">{error}</p></Card>}
      {!forecast && !error && <Card><p className="p-5 text-sm font-semibold text-slate-500">جاري جلب التوقعات…</p></Card>}

      {forecast && (
        <>
          <section className="energy-card grid grid-cols-3 gap-2 p-2.5">
            <StatBox label="باقي اليوم" value={forecast.todayRemainingKwh.toFixed(1)} unit="kWh" tone="sun" />
            <StatBox label="غداً" value={forecast.tomorrowKwh.toFixed(1)} unit="kWh" tone="sun" />
            <StatBox label="الذروة" value={forecast.peak ? forecast.peak.label : '—'} tone="neutral" foot={forecast.peak ? <bdi dir="ltr">{forecast.peak.expectedKw.toFixed(2)} kW</bdi> : undefined} />
          </section>

          <section className="energy-card flex items-start gap-3 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 ring-1 ring-indigo-100"><Lightbulb className="h-5 w-5" /></span>
            <div>
              <h2 className="text-sm font-black text-slate-900">نصيحة اليوم</h2>
              <p className="mt-0.5 text-xs font-semibold leading-5 text-slate-600">{advice(forecast, pvCapacityKw)}</p>
            </div>
          </section>

          <Collapsible icon={<BarChart3 className="h-5 w-5" />} title="الإنتاج بالساعة" subtitle="الساعات المشمسة القادمة" tone="sun" defaultOpen>
            {hours.length === 0 ? (
              <p className="py-4 text-sm font-semibold text-slate-500">لا شمس في الساعات القادمة. التوقعات تعود مع الصباح.</p>
            ) : (
              <ul className="pt-2">
                {hours.map((h) => (
                  <li key={h.at} className="flex items-center gap-3 py-1.5 text-sm">
                    <span className="w-16 shrink-0 font-bold text-slate-500 tabular-nums">{h.dayOffset ? `غداً ${h.label}` : h.label}</span>
                    <span className="h-3 flex-1 overflow-hidden rounded-full bg-amber-50">
                      <span className={`block h-full rounded-full ${forecast.peak?.at === h.at ? 'bg-amber-500' : 'bg-amber-300'}`}
                        style={{ width: `${Math.min(100, (h.expectedKw / maxKw) * 100)}%` }} />
                    </span>
                    <span className="w-16 shrink-0 text-end font-black tabular-nums text-slate-800"><bdi dir="ltr">{h.expectedKw.toFixed(2)}</bdi></span>
                  </li>
                ))}
              </ul>
            )}
          </Collapsible>

          {forecast.peak && (
            <Collapsible icon={<MapPin className="h-5 w-5" />} title="الطقس وقت الذروة" tone="neutral">
              <InfoList
                rows={[
                  ['الإشعاع الشمسي', `${forecast.peak.irradiance} W/m²`],
                  ['الغيوم', `${forecast.peak.cloud}%`],
                  ['الحرارة', `${forecast.peak.tempC} °C`],
                ]}
              />
            </Collapsible>
          )}
          <p className="px-1 text-[11px] font-semibold text-slate-400">التوقعات من Open-Meteo حسب الإشعاع الشمسي وقدرة الألواح في الإعدادات.</p>
        </>
      )}
    </div>
  );
};
