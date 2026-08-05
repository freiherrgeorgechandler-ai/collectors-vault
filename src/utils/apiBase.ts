import { Capacitor } from '@capacitor/core';

/** True when running inside a Capacitor native shell (Android/iOS APK). */
export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * API origin for native APK builds (must point at your Express server).
 * Browser builds always use same-origin (empty string).
 */
export function getApiBase(): string {
  if (!isNativeApp()) return '';
  return String(import.meta.env.VITE_API_BASE_URL || '')
    .trim()
    .replace(/\/$/, '');
}

/** Build a full API path that works in browser and Capacitor. */
export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  const base = getApiBase();
  return base ? `${base}${p}` : p;
}

/**
 * Resolve image / asset URLs for display.
 * Relative `/api/icons/...` paths need the server base inside the APK.
 */
export function resolveMediaUrl(src: string | undefined | null): string {
  if (!src) return '';
  if (
    src.startsWith('data:') ||
    src.startsWith('blob:') ||
    src.startsWith('http://') ||
    src.startsWith('https://')
  ) {
    return src;
  }
  if (src.startsWith('/')) {
    const base = getApiBase();
    if (base) return `${base}${src}`;
    if (typeof window !== 'undefined') return `${window.location.origin}${src}`;
    return src;
  }
  return src;
}
