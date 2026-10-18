/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Solar monitor: live readings from the SmartESS cloud, alerts, settings.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BatteryFull, Bell, CloudSun, Coins, Home, LayoutGrid, RefreshCw, SlidersHorizontal, WifiOff } from 'lucide-react';
import {
  SmartessClientError, SmartessDevice, SmartessSession, SmartessSnapshot,
  fetchSnapshot, getServerConfig, loadSession, parseSmartessTime, saveSession,
} from './services/smartessClient';
import { playAlertSound } from './services/sound';
import { AppSettings, loadSettings, saveSettings } from './lib/settings';
import { AppAlert, evaluateAlerts, newAlertState } from './lib/alerts';
import { timeOf } from './lib/format';
import { HistoryPoint, addReading, loadDay } from './lib/history';
import { showAlertNotification } from './services/notify';
import { Forecast, Place, fetchForecast } from './services/weather';
import { HomeView } from './components/HomeView';
import { BatteryView } from './components/BatteryView';
import { ForecastView } from './components/ForecastView';
import { SavingsView } from './components/SavingsView';
import { AlertsView } from './components/AlertsView';
import { SettingsView } from './components/SettingsView';
import { Logo } from './components/ui';

type Tab = 'home' | 'battery' | 'forecast' | 'savings' | 'alerts' | 'settings';

/** SmartESS refreshes every few minutes; once a minute is plenty */
const POLL_MS = 60_000;
const STALE_MS = 20 * 60 * 1000;
const ALERTS_KEY = 'taktak.alerts.v1';

function loadAlerts(): AppAlert[] {
  try {
    const raw = localStorage.getItem(ALERTS_KEY);
    return raw ? (JSON.parse(raw) as AppAlert[]) : [];
  } catch {
    return [];
  }
}

function useOnline() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}

export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [session, setSession] = useState<SmartessSession | null>(() => loadSession());
  const [devices, setDevices] = useState<SmartessDevice[]>(() => {
    const s = loadSession();
    return s?.device ? [s.device] : [];
  });
  const [serverCredentials, setServerCredentials] = useState<boolean | null>(null);
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [snapshot, setSnapshot] = useState<SmartessSnapshot | null>(null);
  const [readingAt, setReadingAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState<AppAlert[]>(loadAlerts);
  const [history, setHistory] = useState<HistoryPoint[]>(() => loadDay());
  const online = useOnline();
  const [unread, setUnread] = useState(0);

  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [forecastError, setForecastError] = useState<string | null>(null);

  const alertState = useRef(newAlertState());
  const alertsRef = useRef(alerts);
  alertsRef.current = alerts;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Alerts survive a reload
  useEffect(() => {
    try { localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts.slice(0, 100))); } catch { /* storage unavailable */ }
  }, [alerts]);

  useEffect(() => {
    getServerConfig()
      .then((c) => setServerCredentials(c.serverCredentials))
      .catch(() => setServerCredentials(false));
  }, []);

  const canFetch = Boolean(session) || serverCredentials === true;
  const needsLogin = !session && serverCredentials === false;

  const refresh = useCallback(async () => {
    if (!canFetch || !navigator.onLine) return;
    setLoading(true);
    try {
      const s = await fetchSnapshot(session);
      const at = parseSmartessTime(s.updatedAt);
      setSnapshot(s);
      setReadingAt(at);
      setError(null);
      setHistory(addReading(s, at));
      // After a reload the alert memory starts empty: don't repeat what was already shown in the last 30 minutes
      const keyOf = (a: AppAlert) => a.id.slice(0, a.id.lastIndexOf('-'));
      const recent = new Set(alertsRef.current.filter((a) => Date.now() - a.at < 30 * 60_000).map(keyOf));
      const fresh = evaluateAlerts(s, at, settingsRef.current, alertState.current).filter((a) => !recent.has(keyOf(a)));
      if (fresh.length) {
        setAlerts((prev) => [...fresh, ...prev].slice(0, 100));
        setUnread((n) => n + fresh.length);
        if (settingsRef.current.sound) playAlertSound(fresh[0].severity);
        if (settingsRef.current.notify) fresh.forEach((a) => void showAlertNotification(a));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطأ غير معروف');
      // An expired or rejected session: ask to log in again
      if (err instanceof SmartessClientError && err.code === 'NO_AUTH') {
        saveSession(null);
        setSession(null);
      }
    } finally {
      setLoading(false);
    }
  }, [canFetch, session]);

  // Poll while the page is visible; fetch again as soon as it comes back into view
  useEffect(() => {
    if (!canFetch) return;
    void refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [canFetch, refresh]);

  // Back online: fetch at once instead of waiting for the next minute
  useEffect(() => {
    if (online && canFetch) void refresh();
  }, [online]); // eslint-disable-line react-hooks/exhaustive-deps

  // Weather forecast: on start, when the place or panel size changes, and every 30 minutes
  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetchForecast(settings.place, settings.pvCapacityKw)
        .then((f) => { if (!cancelled) { setForecast(f); setForecastError(null); } })
        .catch((err) => { if (!cancelled) setForecastError(err instanceof Error ? err.message : 'تعذر جلب التوقعات'); });
    void load();
    const timer = setInterval(load, 30 * 60_000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [settings.place, settings.pvCapacityKw]);

  const handleLoggedIn = (s: SmartessSession, list: SmartessDevice[]) => {
    saveSession(s);
    setSession(s);
    setDevices(list);
    setError(null);
    setTab('home');
  };

  const handleDeviceChange = (device: SmartessDevice) => {
    if (!session) return;
    const next = { ...session, device };
    saveSession(next);
    setSession(next);
    setSnapshot(null);
  };

  const handleLogout = () => {
    saveSession(null);
    setSession(null);
    setDevices([]);
    setSnapshot(null);
    setReadingAt(null);
  };

  const handleSettings = (next: AppSettings) => {
    setSettings(next);
    saveSettings(next);
  };

  const handlePlace = (place: Place) => {
    setForecast(null);
    handleSettings({ ...settings, place });
  };

  // Header status: what the numbers on screen are worth
  const stale = readingAt != null && Date.now() - readingAt > STALE_MS;
  const readingText = readingAt ? `آخر قراءة ${timeOf(readingAt)}` : 'متصل';
  const status =
    !online ? { dot: 'bg-slate-300', text: 'لا يوجد إنترنت' }
    : needsLogin ? { dot: 'bg-slate-300', text: 'غير مربوط' }
    : error && !snapshot ? { dot: 'bg-rose-600', text: 'لا يوجد اتصال' }
    : !snapshot ? { dot: 'bg-slate-300', text: 'جاري الاتصال…' }
    : !snapshot.online || stale || error ? { dot: 'bg-amber-500', text: readingText }
    : { dot: 'bg-emerald-500', text: readingText };

  const isLive = Boolean(snapshot && snapshot.online && !stale && !error);

  // One colour per page, like the tab that opens it (header gradient, tab line, icon)
  const TABS: { id: Tab; label: string; Icon: typeof Home; line: string; text: string; grad: string }[] = [
    { id: 'home', label: 'الرئيسية', Icon: LayoutGrid, line: 'border-indigo-500', text: 'text-indigo-600', grad: 'from-indigo-400 to-indigo-600' },
    { id: 'battery', label: 'البطارية', Icon: BatteryFull, line: 'border-emerald-500', text: 'text-emerald-600', grad: 'from-emerald-500 to-emerald-700' },
    { id: 'forecast', label: 'التوقعات', Icon: CloudSun, line: 'border-amber-500', text: 'text-amber-600', grad: 'from-amber-500 to-orange-600' },
    { id: 'savings', label: 'التوفير', Icon: Coins, line: 'border-teal-500', text: 'text-teal-600', grad: 'from-teal-500 to-teal-700' },
    { id: 'settings', label: 'الإعدادات', Icon: SlidersHorizontal, line: 'border-rose-500', text: 'text-rose-600', grad: 'from-rose-400 to-rose-600' },
  ];
  const headerGrad = TABS.find((t) => t.id === tab)?.grad ?? 'from-slate-500 to-slate-700';

  return (
    <div className="min-h-screen w-full bg-[linear-gradient(165deg,#eef4ff_0%,#f4f6fc_40%,#effaf6_72%,#fff8e5_100%)] text-slate-900">
      <header className={`sticky top-0 z-40 rounded-b-[1.5rem] bg-gradient-to-l pt-[env(safe-area-inset-top)] text-white shadow-[0_8px_24px_rgba(15,23,42,0.14)] transition-colors ${headerGrad}`}>
        <div className="mx-auto flex min-h-[4.5rem] max-w-md items-center justify-between gap-3 px-3 py-2.5">
          <button type="button" onClick={() => setTab('home')} className="flex min-w-0 items-center gap-2.5 text-start" aria-label="Taktak">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/90 shadow-sm"><Logo size={34} /></span>
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <span className="truncate text-xl font-black leading-tight">Taktak</span>
                <span title={status.text} className={`h-2.5 w-2.5 rounded-full ring-2 ring-white/80 ${status.dot}`} />
              </span>
              <span className="block truncate text-xs font-extrabold text-white/90">{status.text}</span>
            </span>
          </button>
          <div className="flex items-center gap-2">
            {canFetch && (
              <button type="button" onClick={() => void refresh()} disabled={loading} aria-label="تحديث"
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30 disabled:opacity-60">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button type="button" aria-label="التنبيهات" onClick={() => { setTab('alerts'); setUnread(0); }}
              className={`relative flex h-10 w-10 items-center justify-center rounded-2xl ring-1 ring-white/30 ${tab === 'alerts' ? 'bg-white text-slate-800' : 'bg-white/15'}`}>
              <Bell className="h-4 w-4" />
              {unread > 0 && <span className="absolute end-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md px-3 py-3 pb-28">
        {!online && (
          <p className="mb-3 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-600">
            <WifiOff className="h-4 w-4 shrink-0 text-slate-400" />
            لا يوجد اتصال بالإنترنت. تظهر آخر قراءة، والتحديث يعود تلقائياً.
          </p>
        )}
        {tab === 'home' && (
          <HomeView
            snapshot={snapshot}
            readingAt={readingAt}
            isLive={isLive}
            error={error}
            needsLogin={needsLogin}
            settings={settings}
            history={history}
            onLoggedIn={handleLoggedIn}
            onOpenBattery={() => setTab('battery')}
            onOpenForecast={() => setTab('forecast')}
          />
        )}
        {tab === 'battery' && <BatteryView snapshot={snapshot} settings={settings} history={history} />}
        {tab === 'forecast' && (
          <ForecastView
            forecast={forecast}
            error={forecastError}
            pvCapacityKw={settings.pvCapacityKw}
            onPlaceChange={handlePlace}
          />
        )}
        {tab === 'savings' && <SavingsView snapshot={snapshot} forecast={forecast} settings={settings} />}
        {tab === 'alerts' && <AlertsView alerts={alerts} onClear={() => setAlerts([])} />}
        {tab === 'settings' && (
          <SettingsView
            session={session}
            serverCredentials={serverCredentials === true}
            devices={devices}
            settings={settings}
            onSettingsChange={handleSettings}
            onLoggedIn={handleLoggedIn}
            onDeviceChange={handleDeviceChange}
            onLogout={handleLogout}
          />
        )}
      </main>

      <nav aria-label="التنقل السفلي" className="fixed inset-x-0 bottom-0 z-50 rounded-t-[1.25rem] border-t border-slate-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_24px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {TABS.map(({ id, label, Icon, line, text }) => {
            const active = tab === id;
            return (
              <button key={id} type="button" onClick={() => setTab(id)} aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 border-t-[3px] pb-2.5 pt-2 text-[11px] transition-colors active:scale-95 ${
                  active ? `${line} font-black ${text}` : 'border-transparent font-bold text-slate-500'
                }`}>
                <Icon className={`h-[22px] w-[22px] ${active ? text : 'text-slate-400'}`} strokeWidth={active ? 2.5 : 2} />
                <span className="leading-none">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
