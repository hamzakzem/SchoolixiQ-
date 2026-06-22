import React from 'react';
import { CloudOff, WifiOff } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useOfflineStatus } from '../lib/offline/useOfflineStatus';
import { formatCacheAge } from '../lib/offline/offlineStatus';
import { UserRole } from '../types';

export function OfflineModeBanner() {
  const { user, profile, offlineStale } = useAuth();
  const { isOnline, lastDataCacheUpdate } = useOfflineStatus();

  if (!user || !profile) return null;

  const showStale = !isOnline || offlineStale;
  if (!showStale) return null;

  const isSuperAdmin = profile.role === UserRole.SUPERADMIN;

  return (
    <div
      className="sticky top-0 z-[110] border-b border-amber-300/50 bg-amber-50/95 px-4 py-2 text-sm text-amber-950 backdrop-blur-md dark:border-amber-500/30 dark:bg-amber-950/90 dark:text-amber-100"
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2">
        <WifiOff size={16} className="shrink-0" />
        <span className="font-bold">
          أنت تعمل بدون إنترنت — بعض البيانات قد تكون غير محدثة
        </span>
        <span className="text-xs opacity-80">
          آخر تحديث: {formatCacheAge(lastDataCacheUpdate)}
        </span>
        <span className="w-full text-xs opacity-90 sm:w-auto">
          قد لا تظهر البيانات الجديدة حتى عودة الإنترنت
        </span>
        {isSuperAdmin && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/80 px-2 py-0.5 text-xs font-bold dark:bg-amber-900/60">
            <CloudOff size={12} />
            إجراءات السوبر أدمن تحتاج إنترنت
          </span>
        )}
      </div>
    </div>
  );
}
