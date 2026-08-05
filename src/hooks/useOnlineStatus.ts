import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';

function browserOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

/** Live online/offline flag for web + Capacitor. */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(browserOnline);

  useEffect(() => {
    let cancelled = false;
    let removeNative: (() => void) | undefined;

    const applyBrowser = () => {
      if (!cancelled) setOnline(navigator.onLine);
    };

    window.addEventListener('online', applyBrowser);
    window.addEventListener('offline', applyBrowser);

    (async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          const status = await Network.getStatus();
          if (!cancelled) setOnline(status.connected);
          const handle = await Network.addListener('networkStatusChange', (s) => {
            if (!cancelled) setOnline(s.connected);
          });
          removeNative = () => {
            void handle.remove();
          };
        } else {
          applyBrowser();
        }
      } catch {
        applyBrowser();
      }
    })();

    return () => {
      cancelled = true;
      window.removeEventListener('online', applyBrowser);
      window.removeEventListener('offline', applyBrowser);
      removeNative?.();
    };
  }, []);

  return online;
}

/** One-shot check before starting an AI / network request. */
export async function checkIsOnline(): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      const status = await Network.getStatus();
      return status.connected;
    }
  } catch {
    /* fall through */
  }
  return browserOnline();
}

export const AI_OFFLINE_MESSAGE =
  'AI needs an internet connection. Connect to Wi‑Fi or mobile data and try again.';
