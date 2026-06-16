import React, { useMemo } from 'react';
import {
  formatLastActivityAr,
  presenceStatusLabel,
  resolveSchoolPresenceStatus,
  type SchoolPresenceRecord,
} from '../../lib/schoolPresence';

const DOT: Record<string, string> = {
  online: 'bg-emerald-500',
  recent: 'bg-amber-500',
  offline: 'bg-slate-400',
  unknown: 'bg-slate-300',
};

export function SchoolPresenceBadge({
  presence,
  compact = false,
}: {
  presence?: SchoolPresenceRecord | null;
  compact?: boolean;
}) {
  const status = useMemo(
    () => resolveSchoolPresenceStatus(presence),
    [presence],
  );
  const lastActivity = useMemo(
    () =>
      formatLastActivityAr(
        presence?.lastHeartbeatAt || presence?.lastSeenAt || null,
      ),
    [presence],
  );

  const label = presenceStatusLabel(status);
  const dotClass = DOT[status] || DOT.unknown;

  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-300"
        title={`${label} — آخر نشاط: ${lastActivity}`}
      >
        <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} aria-hidden />
        <span>{label}</span>
      </span>
    );
  }

  return (
    <div
      className="flex flex-col items-start gap-1 min-w-[8.5rem]"
      title={`آخر نشاط: ${lastActivity}`}
    >
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200">
        <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} aria-hidden />
        <span>{label}</span>
      </span>
      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
        آخر نشاط: {lastActivity}
      </span>
      {presence?.lastActiveUserName ? (
        <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[160px]">
          {presence.lastActiveUserName}
          {presence.lastActiveRole ? ` · ${presence.lastActiveRole}` : ''}
        </span>
      ) : null}
    </div>
  );
}
