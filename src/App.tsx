/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Solar monitor: live readings from the SmartESS cloud, alerts, settings.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, Home, RefreshCw, Settings } from 'lucide-react';
import {
  SmartessClientError, SmartessDevice, SmartessSession, SmartessSnapshot,
  fetchSnapshot, getServerConfig, loadSession, parseSmartessTime, saveSession,
} from './services/smartessClient';
import { playAlertSound } from './services/sound';
import { AppSettings, loadSettings, saveSettings } from './lib/settings';
import { AppAlert, evaluateAlerts, newAlertState } from './lib/alerts';
import { timeOf } from './lib/format';
import { HomeView } from './components/HomeView';
import { AlertsView } from './components/AlertsView';
import { SettingsView } from './components/SettingsView';

type Tab = 'home' | 'alerts' | 'settings';

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

  // Header status: what the numbers on screen are worth
  const stale = readingAt != null && Date.now() - readingAt > STALE_MS;
  const readingText = readingAt ? `آخر قراءة ${timeOf(readingAt)}` : 'متصل';
  const status =
    needsLogin ? { dot: 'bg-slate-300', text: 'غير مربوط' }
    : error && !snapshot ? { dot: 'bg-rose-600', text: 'لا يوجد اتصال' }
    : !snapshot ? { dot: 'bg-slate-300', text: 'جاري الاتصال…' }
    : !snapshot.online || stale || error ? { dot: 'bg-amber-500', text: readingText }
    : { dot: 'bg-emerald-600', text: readingText };

  const navItem = (id: Tab, label: string, Icon: typeof Home, badge = 0) => (
    <button
      type="button"
      onClick={() => {
        setTab(id);
        if (id === 'alerts') setUnread(0);
      }}
      className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs ${
        tab === id ? 'text-slate-900 font-bold' : 'text-slate-400'
      }`}
    >
      <span className="relative">
        <Icon className="w-5 h-5" />
        {badge > 0 && <span className="absolute -top-0.5 -end-1 w-2 h-2 rounded-full bg-rose-600" />}
      </span>
      {label}
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f5f7] text-slate-900">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="max-w-md mx-auto h-14 px-4 flex items-center justify-between">
          <h1 className="text-base font-bold">شمسك</h1>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className={`w-2 h-2 rounded-full ${status.dot}`} />
              {status.text}
            </span>
            {canFetch && (
              <button
                type="button"
                onClick={() => void refresh()}
                disabled={loading}
                aria-label="تحديث"
                className="w-9 h-9 flex items-center justify-center rounded-md border border-slate-200 text-slate-600 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-md mx-auto px-4 py-4">
        {tab === 'home' && (
          <HomeView
            snapshot={snapshot}
            error={error}
            needsLogin={needsLogin}
            settings={settings}
            onLoggedIn={handleLoggedIn}
          />
        )}
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

      <nav className="sticky bottom-0 bg-white border-t border-slate-200">
        <div className="max-w-md mx-auto flex">
          {navItem('home', 'الرئيسية', Home)}
          {navItem('alerts', 'التنبيهات', Bell, unread)}
          {navItem('settings', 'الإعدادات', Settings)}
        </div>
      </nav>
    </div>
  );
}
