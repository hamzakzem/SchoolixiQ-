import React, { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../lib/AuthContext';
import { useLanguage } from '../../lib/LanguageContext';
import { Shield, Clock, User, FileText, LogIn } from 'lucide-react';
import { motion } from 'motion/react';

type AuditRow = {
  id: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  actorId?: string;
  actorRole?: string;
  schoolId?: string;
  beforeSummary?: string;
  afterSummary?: string;
  performedBy?: string;
  uid?: string;
  details?: Record<string, unknown>;
  createdAt?: { toDate?: () => Date };
  timestamp?: { toDate?: () => Date };
};

function formatWhen(row: AuditRow): string {
  const ts = row.createdAt?.toDate?.() || row.timestamp?.toDate?.();
  if (!ts) return '—';
  return ts.toLocaleString('ar-IQ', { dateStyle: 'short', timeStyle: 'short' });
}

type LoginRow = {
  id: string;
  userId?: string;
  role?: string;
  event?: string;
  email?: string;
  userAgentSummary?: string;
  createdAt?: { toDate?: () => Date };
};

function LoginLogsPanel({
  scopedSchoolId,
  isSuperAdmin,
  schoolIdFilter,
  isRtl,
}: {
  scopedSchoolId: string | null;
  isSuperAdmin: boolean;
  schoolIdFilter?: string | null;
  isRtl: boolean;
}) {
  const [rows, setRows] = useState<LoginRow[]>([]);

  useEffect(() => {
    if (!isSuperAdmin && !scopedSchoolId) return;
    const base =
      isSuperAdmin && !schoolIdFilter
        ? query(collection(db, 'login_logs'), limit(80))
        : query(
            collection(db, 'login_logs'),
            where('schoolId', '==', scopedSchoolId),
            limit(80),
          );
    return onSnapshot(base, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as LoginRow));
      list.sort((a, b) => (b.createdAt?.toDate?.()?.getTime() || 0) - (a.createdAt?.toDate?.()?.getTime() || 0));
      setRows(list.slice(0, 50));
    });
  }, [isSuperAdmin, scopedSchoolId, schoolIdFilter]);

  if (rows.length === 0) {
    return (
      <p className="text-slate-400 font-bold text-sm">
        {isRtl ? 'لا توجد جلسات مسجّلة بعد' : 'No session logs yet'}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div
          key={row.id}
          className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3 py-2 text-xs font-bold"
        >
          <span className="flex items-center gap-1 text-slate-700 dark:text-slate-200">
            <LogIn size={12} />
            {row.event || 'login'} · {row.role} · {row.email || row.userId}
          </span>
          <span className="text-slate-400">
            {row.userAgentSummary} · {row.createdAt?.toDate?.()?.toLocaleString('ar-IQ') || '—'}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AuditLogsViewer({
  schoolIdFilter,
  title,
}: {
  schoolIdFilter?: string | null;
  title?: string;
}) {
  const { profile } = useAuth();
  const { isRtl } = useLanguage();
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = profile?.role === 'superadmin';
  const scopedSchoolId = schoolIdFilter ?? profile?.schoolId ?? null;

  useEffect(() => {
    if (!isSuperAdmin && !scopedSchoolId) {
      setLoading(false);
      return;
    }

    const base =
      isSuperAdmin && !schoolIdFilter
        ? query(collection(db, 'audit_logs'), limit(150))
        : query(
            collection(db, 'audit_logs'),
            where('schoolId', '==', scopedSchoolId),
            limit(150),
          );

    const unsub = onSnapshot(
      base,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AuditRow));
        rows.sort((a, b) => {
          const ta =
            a.createdAt?.toDate?.()?.getTime() ||
            a.timestamp?.toDate?.()?.getTime() ||
            0;
          const tb =
            b.createdAt?.toDate?.()?.getTime() ||
            b.timestamp?.toDate?.()?.getTime() ||
            0;
          return tb - ta;
        });
        setLogs(rows.slice(0, 100));
        setLoading(false);
      },
      () => setLoading(false),
    );

    return () => unsub();
  }, [isSuperAdmin, scopedSchoolId, schoolIdFilter]);

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Shield className="text-[#0B2345] dark:text-[#D4A64A]" size={24} />
          {title || (isRtl ? 'سجل التدقيق' : 'Audit Logs')}
        </h1>
        <p className="text-sm font-bold text-slate-500 mt-1">
          {isRtl
            ? 'آخر 100 إجراء مسجّل — لا تُخزَّن كلمات المرور أو الأسرار'
            : 'Last 100 logged actions — passwords and secrets are never stored'}
        </p>
      </div>

      {loading ? (
        <p className="text-slate-400 font-bold">{isRtl ? 'جاري التحميل...' : 'Loading...'}</p>
      ) : logs.length === 0 ? (
        <p className="text-slate-400 font-bold">{isRtl ? 'لا توجد سجلات بعد' : 'No audit entries yet'}</p>
      ) : (
        <div className="space-y-3">
          {logs.map((row, i) => (
            <motion.div
              key={row.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.4) }}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="text-xs font-black text-[#0B2345] dark:text-[#D4A64A] uppercase">
                  {row.action || (row.details?.action as string) || 'action'}
                </span>
                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                  <Clock size={12} />
                  {formatWhen(row)}
                </span>
              </div>
              <div className="flex flex-wrap gap-3 text-xs font-bold text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1">
                  <User size={12} />
                  {row.actorRole || '—'} · {row.performedBy || row.uid || row.actorId || '—'}
                </span>
                <span className="flex items-center gap-1">
                  <FileText size={12} />
                  {row.entityType || '—'}
                  {row.entityId ? ` #${String(row.entityId).slice(0, 12)}` : ''}
                </span>
              </div>
              {(row.beforeSummary || row.afterSummary) && (
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  {row.beforeSummary && <span>{row.beforeSummary} → </span>}
                  {row.afterSummary}
                </p>
              )}
            </motion.div>
          ))}
        </div>
      )}

      <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
        <h2 className="text-lg font-black text-slate-900 dark:text-white mb-3">
          {isRtl ? 'سجل الدخول والجلسات' : 'Login & Session Logs'}
        </h2>
        <LoginLogsPanel
          scopedSchoolId={scopedSchoolId}
          isSuperAdmin={isSuperAdmin}
          schoolIdFilter={schoolIdFilter}
          isRtl={isRtl}
        />
      </div>
    </div>
  );
}
