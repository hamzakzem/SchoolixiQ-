import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Archive, PauseCircle, PlayCircle, RotateCcw, Trash2 } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import {
  archiveSchool,
  getSchoolStatusLabel,
  permanentDeleteSchool,
  reactivateSchool,
  restoreArchivedSchool,
  suspendSchool,
} from '../../lib/schoolLifecycle';
import { logAction } from '../../lib/auditLog';

type SchoolRow = {
  id: string;
  name: string;
  status?: string;
  isDeleted?: boolean;
};

export function SchoolStatusBadge({
  school,
  isRtl,
}: {
  school: SchoolRow;
  isRtl: boolean;
}) {
  const status = school.status || 'inactive';
  const tone =
    status === 'active'
      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 border-emerald-100'
      : status === 'suspended'
        ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 border-amber-100'
        : status === 'archived'
          ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 border-slate-200'
          : 'bg-red-50 dark:bg-red-950/30 text-red-600 border-red-100';

  return (
    <span
      className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wide border ${tone}`}
    >
      {getSchoolStatusLabel(status, isRtl)}
    </span>
  );
}

export function SchoolLifecycleButtons({
  school,
  isRtl,
  compact = false,
}: {
  school: SchoolRow;
  isRtl: boolean;
  compact?: boolean;
}) {
  const { profile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [permanentOpen, setPermanentOpen] = useState(false);
  const [confirmName, setConfirmName] = useState('');

  const actor = {
    uid: profile?.uid || '',
    name: profile?.name || profile?.email || 'superadmin',
  };

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(true);
    const loading = toast.loading(label);
    try {
      await fn();
      toast.dismiss(loading);
      toast.success(isRtl ? 'تم بنجاح' : 'Done');
    } catch (e: unknown) {
      toast.dismiss(loading);
      toast.error(e instanceof Error ? e.message : 'فشل الإجراء');
    } finally {
      setBusy(false);
    }
  };

  const status = school.status || 'inactive';
  const btn =
    'px-2.5 py-1.5 rounded-xl text-[10px] font-black border transition-all disabled:opacity-50';

  return (
    <div className={`flex flex-wrap items-center justify-center gap-1.5 ${compact ? '' : 'max-w-[420px]'}`}>
      {status === 'active' && (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            run(isRtl ? 'جاري التعطيل...' : 'Suspending...', async () => {
              await suspendSchool(school.id, actor);
              await logAction({
                schoolId: school.id,
                actorId: actor.uid,
                actorRole: profile?.role || 'superadmin',
                action: 'update',
                entityType: 'schools',
                entityId: school.id,
                beforeSummary: 'active',
                afterSummary: 'suspended',
              });
            })
          }
          className={`${btn} bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100`}
          title={isRtl ? 'تعطيل مؤقت' : 'Suspend'}
        >
          <PauseCircle size={12} className="inline ml-1" />
          {isRtl ? 'تعطيل مؤقت' : 'Suspend'}
        </button>
      )}

      {status === 'suspended' && (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            run(isRtl ? 'جاري التفعيل...' : 'Reactivating...', async () => {
              await reactivateSchool(school.id, actor);
              await logAction({
                schoolId: school.id,
                actorId: actor.uid,
                actorRole: profile?.role || 'superadmin',
                action: 'update',
                entityType: 'schools',
                entityId: school.id,
                beforeSummary: 'suspended',
                afterSummary: 'active',
              });
            })
          }
          className={`${btn} bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100`}
        >
          <PlayCircle size={12} className="inline ml-1" />
          {isRtl ? 'إعادة التفعيل' : 'Reactivate'}
        </button>
      )}

      {(status === 'active' || status === 'suspended' || status === 'inactive') && (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            run(isRtl ? 'جاري الأرشفة...' : 'Archiving...', async () => {
              await archiveSchool(school.id, actor);
              await logAction({
                schoolId: school.id,
                actorId: actor.uid,
                actorRole: profile?.role || 'superadmin',
                action: 'update',
                entityType: 'schools',
                entityId: school.id,
                afterSummary: 'archived',
              });
            })
          }
          className={`${btn} bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100`}
        >
          <Archive size={12} className="inline ml-1" />
          {isRtl ? 'أرشفة' : 'Archive'}
        </button>
      )}

      {status === 'archived' && (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            run(isRtl ? 'جاري الاستعادة...' : 'Restoring...', async () => {
              await restoreArchivedSchool(school.id, actor);
              await logAction({
                schoolId: school.id,
                actorId: actor.uid,
                actorRole: profile?.role || 'superadmin',
                action: 'restore',
                entityType: 'schools',
                entityId: school.id,
                afterSummary: 'active',
              });
            })
          }
          className={`${btn} bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100`}
        >
          <RotateCcw size={12} className="inline ml-1" />
          {isRtl ? 'استعادة' : 'Restore'}
        </button>
      )}

      {!permanentOpen ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setConfirmName('');
            setPermanentOpen(true);
          }}
          className={`${btn} bg-red-50 text-red-700 border-red-200 hover:bg-red-100`}
        >
          <Trash2 size={12} className="inline ml-1" />
          {isRtl ? 'حذف نهائي' : 'Delete'}
        </button>
      ) : (
        <div className="w-full flex flex-col gap-2 p-2 rounded-xl border border-red-200 bg-red-50/50 dark:bg-red-950/20">
          <p className="text-[10px] font-bold text-red-800 dark:text-red-300 text-right">
            {isRtl
              ? `اكتب اسم المدرسة للتأكيد: ${school.name}`
              : `Type school name to confirm: ${school.name}`}
          </p>
          <input
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-red-200 text-xs font-bold"
            dir="auto"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || confirmName.trim() !== school.name.trim()}
              onClick={() =>
                run(isRtl ? 'جاري الحذف النهائي...' : 'Deleting...', async () => {
                  await permanentDeleteSchool({
                    schoolId: school.id,
                    confirmName: confirmName.trim(),
                  });
                  setPermanentOpen(false);
                })
              }
              className="flex-1 py-2 bg-red-600 text-white rounded-lg text-[10px] font-black disabled:opacity-50"
            >
              {isRtl ? 'تأكيد الحذف النهائي' : 'Confirm permanent delete'}
            </button>
            <button
              type="button"
              onClick={() => setPermanentOpen(false)}
              className="px-3 py-2 bg-white dark:bg-slate-800 rounded-lg text-[10px] font-black"
            >
              {isRtl ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
