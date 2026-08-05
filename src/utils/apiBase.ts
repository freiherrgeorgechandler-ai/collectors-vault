import { Capacitor } from '@capacitor/core';

const API_BASE_OVERRIDE_KEY = 'collectors_vault_api_base';

/** True when running inside a Capacitor native shell (Android/iOS APK). */
export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function normalizeBase(url: string): string {
  return String(url || '')
    .trim()
    .replace(/\/$/, '');
}

/** Default API origin baked into the APK build. */
export function getDefaultApiBase(): string {
  return normalizeBase(String(import.meta.env.VITE_API_BASE_URL || ''));
}

/** User override saved on device (native APK only). */
export function getSavedApiBase(): string {
  try {
    return normalizeBase(localStorage.getItem(API_BASE_OVERRIDE_KEY) || '');
  } catch {
    return '';
  }
}

export function setSavedApiBase(url: string): void {
  const normalized = normalizeBase(url);
  try {
    if (normalized) localStorage.setItem(API_BASE_OVERRIDE_KEY, normalized);
    else localStorage.removeItem(API_BASE_OVERRIDE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * API origin for native APK builds (must point at your Express server).
 * Browser builds always use same-origin (empty string).
 */
export function getApiBase(): string {
  if (!isNativeApp()) return '';
  return getSavedApiBase() || getDefaultApiBase();
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

/** Quick connectivity check used by the sign-in screen. */
export async function testApiConnection(baseOverride?: string): Promise<{ ok: boolean; detail: string }> {
  const base = normalizeBase(baseOverride ?? getApiBase());
  if (!base && isNativeApp()) {
    return { ok: false, detail: 'Server URL is empty.' };
  }
  const url = `${base || ''}/api/ai/status`.replace(/([^:]\/)\/+/g, '$1');
  try {
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) return { ok: false, detail: `Server responded ${res.status}` };
    return { ok: true, detail: `Connected to ${base || 'this site'}` };
  } catch (err: any) {
    return {
      ok: false,
      detail: `Cannot open ${base || url}. ${err?.message || 'Network error'}`,
    };
  }
}
