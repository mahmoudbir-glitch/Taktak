/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info, X, ChevronRight, Zap } from 'lucide-react';
import { SmartAlert } from '../types/solar';

interface AndroidNotificationBannerProps {
  alert: SmartAlert | null;
  onDismiss: () => void;
  onViewAlerts: () => void;
}

export const AndroidNotificationBanner: React.FC<AndroidNotificationBannerProps> = ({
  alert,
  onDismiss,
  onViewAlerts,
}) => {
  useEffect(() => {
    if (!alert) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 6000);
    return () => clearTimeout(timer);
  }, [alert, onDismiss]);

  if (!alert) return null;

  const isCritical = alert.severity === 'critical';
  const isWarning = alert.severity === 'warning';

  return (
    <div className="fixed top-3 left-4 right-4 z-50 max-w-md mx-auto pointer-events-auto animate-in fade-in slide-in-from-top-6 duration-300">
      <div 
        className={`relative overflow-hidden rounded-2xl p-4 shadow-2xl backdrop-blur-xl border ${
          isCritical
            ? 'bg-rose-950/95 border-rose-500/80 shadow-rose-900/40 text-rose-50'
            : isWarning
            ? 'bg-amber-950/95 border-amber-500/80 shadow-amber-900/40 text-amber-50'
            : 'bg-slate-900/95 border-cyan-500/80 shadow-cyan-900/30 text-slate-100'
        }`}
      >
        {/* Top meta strip */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-slate-950">
              <Zap className="w-3 h-3 fill-current" />
            </div>
            <span className="font-bold tracking-tight text-[11px] opacity-90">شمسك Solar Guard • الآن</span>
          </div>
          <button 
            onClick={onDismiss}
            className="p-1 rounded-full hover:bg-white/10 transition-colors opacity-70 hover:opacity-100"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${
            isCritical ? 'bg-rose-600/30 text-rose-300' : isWarning ? 'bg-amber-600/30 text-amber-300' : 'bg-cyan-600/30 text-cyan-300'
          }`}>
            {isCritical ? (
              <AlertCircle className="w-5 h-5 animate-bounce" />
            ) : isWarning ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <Info className="w-5 h-5" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm leading-tight truncate">{alert.title}</h4>
            <p className="text-xs opacity-85 mt-0.5 line-clamp-2 leading-relaxed">{alert.message}</p>
            
            {alert.recommendedAction && (
              <div className="mt-2 text-[11px] font-medium bg-black/25 px-2 py-1 rounded-lg border border-white/10">
                💡 التوصية: {alert.recommendedAction}
              </div>
            )}
          </div>
        </div>

        {/* Action button */}
        <div className="mt-3 pt-2 flex items-center justify-end gap-2 text-xs font-bold border-t border-white/10">
          <button
            onClick={onDismiss}
            className="px-2.5 py-1 rounded-lg hover:bg-white/10 transition-colors opacity-80"
          >
            تجاهل
          </button>
          <button
            onClick={() => {
              onDismiss();
              onViewAlerts();
            }}
            className="px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 transition-colors flex items-center gap-1"
          >
            <span>فحص التفاصيل</span>
            <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </button>
        </div>
      </div>
    </div>
  );
};
