/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Wifi, Battery, Smartphone, Monitor, Bell, Radio, SunMedium, Eye } from 'lucide-react';

interface AndroidFrameProps {
  children: React.ReactNode;
  activeAlertCount?: number;
  batterySoc?: number;
  inverterConnected?: boolean;
  highContrast?: boolean;
  onToggleHighContrast?: () => void;
}

export const AndroidFrame: React.FC<AndroidFrameProps> = ({
  children,
  activeAlertCount = 0,
  batterySoc = 82,
  inverterConnected = true,
  highContrast = false,
  onToggleHighContrast,
}) => {
  const [isPhoneFrame, setIsPhoneFrame] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setCurrentTime(d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start py-0 sm:py-4 px-0 sm:px-4 font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* View Switcher Toolbar (Floating Top Pill on larger screens) */}
      <header className="w-full max-w-4xl mb-3 hidden sm:flex items-center justify-between px-4 py-2 bg-slate-900/80 border border-slate-800 rounded-2xl backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black text-sm shadow-md shadow-amber-500/30">
            ☀️
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-200 leading-tight">شمسك (Shamsak Solar)</h1>
            <p className="text-[11px] text-slate-400">تطبيق مراقبة محول الطاقة الشمسي للأندرويد</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Sunlight High Contrast Toggle */}
          <button
            onClick={onToggleHighContrast}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
              highContrast
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-400/20 font-black'
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:text-amber-300'
            }`}
            title="وضع التباين العالي تحت أشعة الشمس المباشرة"
          >
            <SunMedium className="w-3.5 h-3.5" />
            <span>{highContrast ? 'التباين العالي: مفعّل ☀️' : 'تباين الشمس'}</span>
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
            <span className={`w-2 h-2 rounded-full ${inverterConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-slate-300 font-mono text-[11px]">{inverterConnected ? 'متصل بالمحول' : 'غير متصل'}</span>
          </div>

          <div className="flex items-center bg-slate-950 rounded-xl p-1 border border-slate-800 text-xs">
            <button
              onClick={() => setIsPhoneFrame(false)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all font-medium ${
                !isPhoneFrame
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>عرض كامل</span>
            </button>
            <button
              onClick={() => setIsPhoneFrame(true)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all font-medium ${
                isPhoneFrame
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>إطار أندرويد</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div 
        className={`w-full transition-all duration-300 flex flex-col ${
          highContrast ? 'high-contrast border-2 border-white/60 shadow-2xl' : ''
        } ${
          isPhoneFrame
            ? 'max-w-[420px] rounded-[44px] border-[10px] border-slate-800 bg-slate-950 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden relative'
            : 'max-w-4xl rounded-2xl sm:border border-slate-800/80 bg-slate-950 sm:shadow-2xl'
        }`}
        style={isPhoneFrame ? { height: '860px' } : undefined}
      >
        {/* Android Native Status Bar */}
        <div className="w-full bg-slate-950/95 px-6 pt-3 pb-2 flex items-center justify-between text-xs font-mono text-slate-300 select-none border-b border-slate-800/40 z-30 sticky top-0 backdrop-blur-md">
          {/* Right side in RTL: Clock + App Status */}
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-wider text-slate-100">{currentTime || '12:00'}</span>
            {activeAlertCount > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[10px]">
                <Bell className="w-2.5 h-2.5 animate-pulse" />
                <span>{activeAlertCount}</span>
              </span>
            )}
          </div>

          {/* Center Punch-hole Camera */}
          <div className="w-3.5 h-3.5 rounded-full bg-black border border-slate-700/60 shadow-inner flex items-center justify-center">
            <div className="w-1 h-1 rounded-full bg-cyan-950/80" />
          </div>

          {/* Left side in RTL: System Icons (Wifi, 5G, Battery, Quick Sunlight Toggle) */}
          <div className="flex items-center gap-2 text-slate-400">
            <button
              onClick={onToggleHighContrast}
              className={`p-1 rounded-lg border text-[10px] font-sans flex items-center gap-1 transition-all ${
                highContrast
                  ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-amber-400'
              }`}
              title="تبديل وضع التباين العالي تحت أشعة الشمس"
            >
              <SunMedium className="w-3 h-3" />
              <span className="hidden sm:inline">{highContrast ? 'شمس' : 'تباين'}</span>
            </button>
            <span className="text-[10px] font-bold text-slate-300">5G</span>
            <Wifi className="w-3.5 h-3.5 text-slate-300" />
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-mono text-emerald-400 font-bold">{Math.round(batterySoc)}%</span>
              <Battery className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Content Body */}
        {/* In phone-frame mode the screen scrolls inside the frame so the bottom nav (sticky) stays in it */}
        <main className={`flex-1 flex flex-col min-h-0 ${isPhoneFrame ? 'overflow-y-auto' : ''}`}>
          {children}
        </main>

        {/* Android Bottom Navigation Pill / Gesture Bar */}
        <div className="w-full py-2 bg-slate-950 flex items-center justify-center border-t border-slate-800/30">
          <div className="w-32 h-1 rounded-full bg-slate-700/70 hover:bg-slate-500 transition-colors cursor-pointer" />
        </div>
      </div>
    </div>
  );
};
