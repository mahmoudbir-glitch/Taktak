/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Last line of defence: a rendering error shows a reload card
 * instead of a blank white screen.
 */

import React from 'react';

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Taktak UI error', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-[#f4f6fc] p-6">
        <div className="energy-card max-w-sm p-6 text-center">
          <h1 className="text-lg font-black text-slate-900">حدث خطأ في العرض</h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">إعداداتك محفوظة. أعد تحميل التطبيق للمتابعة.</p>
          <p className="mt-3 rounded-xl bg-slate-50 p-2 text-[11px] text-slate-400" dir="ltr">{this.state.error.message}</p>
          <button type="button" onClick={() => location.reload()} className="mt-4 h-11 w-full rounded-xl bg-slate-900 text-sm font-black text-white">
            إعادة التحميل
          </button>
        </div>
      </div>
    );
  }
}
