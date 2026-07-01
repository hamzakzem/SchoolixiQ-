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
  const toneClass =
    status === 'active'
      ? 'sx-school-status-badge--active'
      : status === 'suspended'
        ? 'sx-school-status-badge--suspended'
        : status === 'archived'
          ? 'sx-school-status-badge--archived'
          : 'sx-school-status-badge--inactive';

  return (
    <span className={`sx-school-status-badge ${toneClass}`}>
      {getSchoolStatusLabel(status, isRtl)}
    </span>
  );
}

export function SchoolLifecycleButtons({
  school,
  isRtl,
  compact = false,
  onPermanentDeleted,
}: {
  school: SchoolRow;
  isRtl: boolean;
  compact?: boolean;
  onPermanentDeleted?: (schoolId: string) => void;
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
  const btn = 'sx-school-action-btn';

  return (
    <div className={`sx-school-record-actions__inner flex flex-wrap items-center justify-center gap-2 ${compact ? '' : 'max-w-[420px]'}`}>
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
          className={`${btn} sx-school-action-btn--warning`}
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
          className={`${btn} sx-school-action-btn--success`}
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
          className={`${btn} sx-school-action-btn--ghost`}
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
          className={`${btn} sx-school-action-btn--info`}
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
          className={`${btn} sx-school-action-btn--danger`}
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
                  setConfirmName('');
                  onPermanentDeleted?.(school.id);
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
