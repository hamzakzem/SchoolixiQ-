import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X, RefreshCw, Trash2, Filter, Database } from 'lucide-react';
import {
  clearSyncedOfflineOperations,
  listOfflineOperations,
  retryFailedOfflineOperations,
  syncOfflineQueue,
} from '../lib/offline/offlineSync';
import { useOfflineStatus } from '../lib/offline/useOfflineStatus';
import { useAuth } from '../lib/AuthContext';
import { getDataCacheMeta } from '../lib/offline/offlineDataCache';
import { formatCacheAge } from '../lib/offline/offlineStatus';
import type { OfflineModule, OfflineQueuedOperation } from '../lib/offline/offlineTypes';

const STATUS_LABELS: Record<string, string> = {
  pending: 'بانتظار الرفع',
  syncing: 'جاري الرفع',
  synced: 'تمت المزامنة',
  failed: 'فشل',
  blocked: 'محظور',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  syncing: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
  synced: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  blocked: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
};

const MODULE_OPTIONS: Array<OfflineModule | 'all'> = [
  'all',
  'attendance',
  'students',
  'payments',
  'messages',
  'homework',
  'grades',
  'behavior',
  'inventory',
  'payroll',
  'schedules',
  'market',
  'super_admin',
];

type Props = {
  open: boolean;
  onClose: () => void;
};

export function OfflineOperationsPanel({ open, onClose }: Props) {
  const { user } = useAuth();
  const {
    counts,
    isSyncing,
    isOnline,
    lastDataCacheUpdate,
    lastAppShellCacheUpdate,
    offlineDataStale,
  } = useOfflineStatus();
  const [operations, setOperations] = useState<OfflineQueuedOperation[]>([]);
  const [moduleFilter, setModuleFilter] = useState<OfflineModule | 'all'>('all');
  const [loading, setLoading] = useState(false);
  const [cacheMeta, setCacheMeta] = useState<{
    entryCount: number;
    collections: string[];
  } | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const items = await listOfflineOperations(50);
      setOperations(items);
      if (user?.uid) {
        const meta = await getDataCacheMeta(user.uid);
        setCacheMeta({ entryCount: meta.entryCount, collections: meta.collections });
      }
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh, counts.total, isSyncing]);

  const filtered = useMemo(() => {
    if (moduleFilter === 'all') return operations.slice(0, 20);
    return operations.filter((op) => op.module === moduleFilter).slice(0, 20);
  }, [operations, moduleFilter]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-slate-900 sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">عمليات دون اتصال</h2>
            <p className="text-xs text-slate-500">
              {isOnline ? 'متصل' : 'غير متصل'} · بانتظار {counts.pending} · فشل {counts.failed} · محظور {counts.blocked}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs dark:border-slate-700 dark:bg-slate-800/50">
          <div className="mb-2 flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200">
            <Database size={14} />
            حالة التخزين المحلي
          </div>
          <div className="grid gap-1 text-slate-600 dark:text-slate-300 sm:grid-cols-2">
            <div>آخر تحديث للبيانات: {formatCacheAge(lastDataCacheUpdate)}</div>
            <div>آخر تحديث للواجهة: {formatCacheAge(lastAppShellCacheUpdate)}</div>
            <div>عدد مجموعات البيانات: {cacheMeta?.entryCount ?? 0}</div>
            <div>
              {offlineDataStale ? 'يعرض آخر نسخة محفوظة' : 'البيانات محدثة من الشبكة'}
            </div>
          </div>
          {cacheMeta?.collections?.length ? (
            <p className="mt-2 text-[11px] text-slate-500">
              المخزّن: {cacheMeta.collections.join(' · ')}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <button
            type="button"
            disabled={!isOnline || isSyncing}
            onClick={() => void syncOfflineQueue().then(refresh)}
            className="inline-flex items-center gap-1 rounded-xl bg-sky-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            إعادة محاولة المزامنة
          </button>
          <button
            type="button"
            disabled={counts.failed === 0}
            onClick={() => void retryFailedOfflineOperations().then(refresh)}
            className="inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold disabled:opacity-50"
          >
            إعادة المحاولات الفاشلة
          </button>
          <button
            type="button"
            disabled={counts.synced === 0}
            onClick={() => void clearSyncedOfflineOperations().then(refresh)}
            className="inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold disabled:opacity-50"
          >
            <Trash2 size={14} />
            مسح المزامَن
          </button>
          <label className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <Filter size={14} />
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value as OfflineModule | 'all')}
              className="rounded-lg border bg-transparent px-2 py-1"
            >
              {MODULE_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m === 'all' ? 'كل الوحدات' : m}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <p className="text-sm text-slate-500">جاري التحميل...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-500">لا توجد عمليات محلية حالياً.</p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((op) => (
                <li
                  key={op.id}
                  className="rounded-2xl border border-slate-200 p-3 text-sm dark:border-slate-700"
                >
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_COLORS[op.status]}`}>
                      {STATUS_LABELS[op.status] ?? op.status}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold dark:bg-slate-800">
                      {op.module}
                    </span>
                    <span className="text-[11px] text-slate-500">{op.operation}</span>
                  </div>
                  <div className="font-semibold text-slate-800 dark:text-slate-100">{op.collection}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {new Date(op.updatedAt).toLocaleString('ar-IQ')} · محاولات {op.retryCount}
                  </div>
                  {op.errorMessage && (
                    <div className="mt-1 text-xs text-red-600 dark:text-red-300">{op.errorMessage}</div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
