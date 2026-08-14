import { registerSW } from 'virtual:pwa-register';

/**
 * Service worker registration for the Lan Onasis Dashboard PWA.
 *
 * Design constraints:
 * - The SW precaches only public build-time shell assets (JS, CSS, HTML, icons).
 * - No API response, Authorization header, Supabase token, session, user memory,
 *   uploaded file, mutation payload, or diagnostic data is cached by the SW.
 * - `registerSW` with `immediate: false` waits for a stable network load before
 *   prompting, avoiding install banners during auth callbacks or flaky networks.
 * - The `onNeedRefresh` callback is exposed so the UI can show an explicit
 *   "Update available" toast. The old SW remains in control until the user
 *   accepts, preventing mid-session breaking changes.
 * - `onOfflineReady` is intentionally not celebrated as a feature because v1 does
 *   not provide offline access to tenant data; it only guarantees the shell.
 */
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  const updateSW = registerSW({
    immediate: false,
    onNeedRefresh() {
      // Dispatch a custom event the UI can listen for to show an update prompt.
      window.dispatchEvent(new CustomEvent('pwa-update-available'));
    },
    onOfflineReady() {
      // v1: shell is available offline; tenant data still requires network.
      // No celebratory UI. Diagnostics only.
      if (process.env.NODE_ENV === 'development') {
        console.info('[PWA] App shell cached for offline fallback.');
      }
    },
    onRegisteredSW(swUrl, registration) {
      if (process.env.NODE_ENV === 'development') {
        console.info('[PWA] Service worker registered:', swUrl);
      }
      if (registration) {
        // Surface registration for tests / diagnostics without leaking internals.
        (window as any).__lanonasis_sw_registration = registration;
      }
    },
    onRegisterError(error) {
      console.warn('[PWA] Service worker registration failed:', error);
    },
  });

  // Expose a safe reload helper the app can call after user accepts an update.
  (window as any).__lanonasis_sw_update = () => {
    void updateSW(true);
  };
}

/**
 * Safely unregister the service worker and clear its named caches.
 * Used for the PWA rollback path and for logout/session-expiry cleanup.
 */
export async function unregisterServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  const registration = await navigator.serviceWorker.ready.catch(() => null);
  if (registration) {
    await registration.unregister();
  }

  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map((name) => caches.delete(name)));
}
