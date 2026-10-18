/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Solar monitor: live readings from the SmartESS cloud, alerts, settings.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BatteryMedium, Bell, CloudSun, Coins, Home, RefreshCw, Settings } from 'lucide-react';
import {
  SmartessClientError, SmartessDevice, SmartessSession, SmartessSnapshot,
  fetchSnapshot, getServerConfig, loadSession, parseSmartessTime, saveSession,
} from './services/smartessClient';
import { playAlertSound } from './services/sound';
import { AppSettings, loadSettings, saveSettings } from './lib/settings';
import { AppAlert, evaluateAlerts, newAlertState } from './lib/alerts';
import { timeOf } from './lib/format';
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
  const [alerts, setAlerts] = useState<AppAlert[]>([]);
  const [unread, setUnread] = useState(0);

  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [forecastError, setForecastError] = useState<string | null>(null);

  const alertState = useRef(newAlertState());
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    getServerConfig()
      .then((c) => setServerCredentials(c.serverCredentials))
      .catch(() => setServerCredentials(false));
  }, []);

  const canFetch = Boolean(session) || serverCredentials === true;
  const needsLogin = !session && serverCredentials === false;

  const refresh = useCallback(async () => {
    if (!canFetch) return;
    setLoading(true);
    try {
      const s = await fetchSnapshot(session);
      const at = parseSmartessTime(s.updatedAt);
      setSnapshot(s);
      setReadingAt(at);
      setError(null);
      const fresh = evaluateAlerts(s, at, settingsRef.current, alertState.current);
      if (fresh.length) {
        setAlerts((prev) => [...fresh, ...prev].slice(0, 100));
        setUnread((n) => n + fresh.length);
        if (settingsRef.current.sound) playAlertSound(fresh[0].severity);
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
    needsLogin ? { dot: 'bg-slate-300', text: 'غير مربوط' }
    : error && !snapshot ? { dot: 'bg-rose-600', text: 'لا يوجد اتصال' }
    : !snapshot ? { dot: 'bg-slate-300', text: 'جاري الاتصال…' }
    : !snapshot.online || stale || error ? { dot: 'bg-amber-500', text: readingText }
    : { dot: 'bg-emerald-500', text: readingText };

  const iconBtn = (state: string) =>
    `w-10 h-10 flex items-center justify-center rounded-xl transition disabled:opacity-50 ${
      state === 'active' ? 'bg-teal-700 text-white' : 'bg-white text-slate-600 border border-[#dde6e4]'
    }`;

  const navItem = (id: Tab, label: string, Icon: typeof Home) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-[11px] font-bold transition ${
        tab === id ? 'bg-teal-50 text-teal-800' : 'text-slate-400'
      }`}
    >
      <Icon className="w-5 h-5" />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#f3f7f6] text-slate-900">
      <header className="sticky top-0 z-10 bg-[#f3f7f6]/90 backdrop-blur-md">
        <div className="max-w-md mx-auto px-4 pt-4 pb-3 flex items-center justify-between">
          <button type="button" onClick={() => setTab('home')} className="flex items-center gap-2.5 text-start">
            <Logo size={38} />
            <span>
              <span className="block text-lg leading-tight font-black tracking-tight">Taqati</span>
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                {status.text}
              </span>
            </span>
          </button>
          <div className="flex items-center gap-2">
            {canFetch && (
              <button
                type="button"
                onClick={() => void refresh()}
                disabled={loading}
                aria-label="تحديث"
                className={iconBtn('')}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button
              type="button"
              aria-label="التنبيهات"
              onClick={() => { setTab('alerts'); setUnread(0); }}
              className={`${iconBtn(tab === 'alerts' ? 'active' : '')} relative`}
            >
              <Bell className="w-4 h-4" />
              {unread > 0 && <span className="absolute top-2 end-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />}
            </button>
            <button
              type="button"
              aria-label="الإعدادات"
              onClick={() => setTab('settings')}
              className={iconBtn(tab === 'settings' ? 'active' : '')}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-md mx-auto px-4 pt-1 pb-28">
        {tab === 'home' && (
          <HomeView
            snapshot={snapshot}
            error={error}
            needsLogin={needsLogin}
            settings={settings}
            onLoggedIn={handleLoggedIn}
            onOpenBattery={() => setTab('battery')}
            onOpenForecast={() => setTab('forecast')}
          />
        )}
        {tab === 'battery' && <BatteryView snapshot={snapshot} settings={settings} />}
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

      <nav className="fixed bottom-3 inset-x-3 z-10">
        <div className="max-w-md mx-auto flex gap-1 p-1.5 bg-white/95 backdrop-blur-md border border-[#dde6e4] rounded-2xl shadow-[0_12px_32px_rgba(13,148,136,0.12)]">
          {navItem('home', 'الرئيسية', Home)}
          {navItem('battery', 'البطارية', BatteryMedium)}
          {navItem('forecast', 'التوقعات', CloudSun)}
          {navItem('savings', 'التوفير', Coins)}
        </div>
      </nav>
    </div>
  );
}
