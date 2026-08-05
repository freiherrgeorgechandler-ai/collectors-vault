import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { isNativeApp } from '../utils/apiBase';

/** Shows when offline — collection stays usable; AI is blocked separately. */
export const OfflineBanner: React.FC = () => {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div className="bg-zinc-900 border-b border-amber-500/40 px-4 py-2 text-[11px] text-amber-200 flex items-center justify-center gap-2">
      <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <span>
        You are offline — your vault stays available locally.
        {isNativeApp() ? ' AI scan works again when you reconnect.' : ' AI features need internet.'}
      </span>
    </div>
  );
};
