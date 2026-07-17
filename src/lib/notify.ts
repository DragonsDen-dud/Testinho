/**
 * Articles 40/41/42 — actual delivery mechanism. This app is local-first
 * with no account and no server (see Article 4's proxy, which exists only
 * for the AI feature and talks to nobody else) — there's deliberately no
 * push-notification backend here, since standing one up would contradict
 * the app's own premise. Delivery is the browser's own Notification API,
 * foreground-only (no service-worker push subscription): reminders only
 * fire while the app is open and polling, not truly in the background.
 * Telegram remains out of scope, as noted in the README.
 */

export type NotifyFn = (title: string, body: string) => void

export function canNotify(): boolean {
  return typeof Notification !== 'undefined' && Notification.permission === 'granted'
}

export function notificationPermissionState(): NotificationPermission | 'unsupported' {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.requestPermission()
}

export function deliverNotification(title: string, body: string): void {
  if (!canNotify()) return
  new Notification(title, { body })
}
