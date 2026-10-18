/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * System notifications for new alerts (shown while the app is open or
 * in the background on the phone, through the service worker when there is one).
 */

import type { AppAlert } from '../lib/alerts';

export const notifySupported = () => typeof window !== 'undefined' && 'Notification' in window;

export const notifyPermission = (): NotificationPermission | 'unsupported' =>
  notifySupported() ? Notification.permission : 'unsupported';

export async function askNotifyPermission(): Promise<boolean> {
  if (!notifySupported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  return (await Notification.requestPermission()) === 'granted';
}

export async function showAlertNotification(a: AppAlert): Promise<void> {
  if (!notifySupported() || Notification.permission !== 'granted') return;
  const options: NotificationOptions = {
    body: a.detail,
    tag: a.id,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    lang: 'ar',
    dir: 'rtl',
  };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(a.title, options);
    else new Notification(a.title, options);
  } catch {
    /* some browsers only allow notifications from the service worker */
  }
}
