import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
  assignmentStatusLabel,
  extractConversationAssignment,
} from '../../lib/conversationAssignment';
import { ChatPrivacyBadge } from './ChatPrivacyBadge';
import { ChatAssignmentPanel } from './ChatAssignmentPanel';

type ControlTab =
  | 'all'
  | 'unassigned'
  | 'assigned'
  | 'waiting'
  | 'overdue'
  | 'closed';

export type ChatControlCenterProps = {
  isRtl: boolean;
  isSuperAdmin: boolean;
};

export function ChatControlCenter({ isRtl, isSuperAdmin }: ChatControlCenterProps) {
  const [tab, setTab] = useState<ControlTab>('all');
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [assistants, setAssistants] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isSuperAdmin) return;
    const q = query(collection(db, 'conversations'));
    const unsub = onSnapshot(q, (snap) => {
      setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    const q = query(collection(db, 'users'), where('role', '==', 'platform_assistant'));
    const unsub = onSnapshot(q, (snap) => {
      setAssistants(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: String(data.name || data.displayName || data.email || d.id),
          };
        }),
      );
    });
    return () => unsub();
  }, [isSuperAdmin]);

  const filtered = useMemo(() => {
    const now = Date.now();
    return rows.filter((row) => {
      const a = extractConversationAssignment(row);
      const status = a?.status || 'unassigned';
      const overdue =
        a?.firstResponseDueAt &&
        typeof (a.firstResponseDueAt as { toMillis?: () => number }).toMillis === 'function' &&
        (a.firstResponseDueAt as { toMillis: () => number }).toMillis() < now &&
        status !== 'closed';

      if (tab === 'all') return true;
      if (tab === 'unassigned') return status === 'unassigned';
      if (tab === 'assigned') return status === 'assigned';
      if (tab === 'waiting') return status === 'waiting';
      if (tab === 'overdue') return !!overdue || status === 'escalated';
      if (tab === 'closed') return status === 'closed';
      return true;
    });
  }, [rows, tab]);

  if (!isSuperAdmin) return null;

  const tabs: { id: ControlTab; ar: string; en: string }[] = [
    { id: 'all', ar: 'الكل', en: 'All' },
    { id: 'unassigned', ar: 'غير مسندة', en: 'Unassigned' },
    { id: 'assigned', ar: 'مسندة', en: 'Assigned' },
    { id: 'waiting', ar: 'بانتظار الرد', en: 'Waiting' },
    { id: 'overdue', ar: 'متأخرة', en: 'Overdue' },
    { id: 'closed', ar: 'مغلقة', en: 'Closed' },
  ];

  const selected = filtered.find((r) => String(r.id) === selectedId);

  return (
    <div className="flex flex-col h-full min-h-0 border-s border-[#0B2345]/10 bg-white/80 dark:bg-[#0d1528]/80">
      <div className="shrink-0 p-3 border-b border-[#0B2345]/10">
        <h3 className="font-black text-sm text-[#0B2345] dark:text-white">
          {isRtl ? 'مركز تحكم المحادثات' : 'Chat Control Center'}
        </h3>
        <div className="flex flex-wrap gap-1 mt-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                tab === t.id ? 'bg-[#D4AF37]/20 text-[#0B2345]' : 'text-[#0B2345]/50'
              }`}
            >
              {isRtl ? t.ar : t.en}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-2 space-y-2">
        {filtered.map((row) => {
          const id = String(row.id);
          const assignment = extractConversationAssignment(row);
          const privacy = (row.conversationPrivacy as { visibility?: string } | undefined)?.visibility;
          const label = String(row.contactId || row.schoolId || id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSelectedId(id)}
              className={`w-full text-start rounded-xl border p-2.5 transition-colors ${
                selectedId === id ? 'border-[#D4AF37] bg-[#D4AF37]/10' : 'border-[#0B2345]/10'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold truncate">{label}</span>
                {assignment ? (
                  <span className="text-[9px] font-bold text-[#0B2345]/50 shrink-0">
                    {assignmentStatusLabel(assignment.status, isRtl)}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                <ChatPrivacyBadge visibility={privacy} isRtl={isRtl} />
              </div>
              {assignment?.assignedToName ? (
                <p className="text-[10px] text-[#0B2345]/55 mt-1 truncate">
                  {assignment.assignedToName}
                </p>
              ) : null}
            </button>
          );
        })}
      </div>

      {selected ? (
        <div className="shrink-0 p-2 border-t border-[#0B2345]/10 max-h-[45%] overflow-y-auto custom-scrollbar">
          <ChatAssignmentPanel
            isRtl={isRtl}
            conversationId={String(selected.id)}
            conversationLabel={String(selected.contactId || selected.schoolId || selected.id)}
            assistants={assistants}
            currentAssigneeId={extractConversationAssignment(selected)?.assignedToUserId}
          />
        </div>
      ) : null}
    </div>
  );
}
