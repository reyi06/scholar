/**
 * Registers the service worker.
 *
 * Only in production: during development it would cache the app shell and
 * fight hot module replacement. Registration failures are swallowed — not being
 * installable must never break the site.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return
  if (!('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Offline support is a bonus, not a requirement.
    })
  })
}
