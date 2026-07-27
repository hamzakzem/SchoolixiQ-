import React, { useState } from 'react';
import { UserPlus, ArrowRightLeft, XCircle, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  adminAssignConversation,
  adminTransferConversation,
  adminUnassignConversation,
  adminCloseConversation,
} from '../../lib/adminApi';
import { assignmentStatusLabel } from '../../lib/conversationAssignment';

export type ChatAssignmentPanelProps = {
  isRtl: boolean;
  conversationId: string;
  conversationLabel: string;
  assistants: Array<{ id: string; name: string }>;
  currentAssigneeId?: string | null;
  onUpdated?: () => void;
};

export function ChatAssignmentPanel({
  isRtl,
  conversationId,
  conversationLabel,
  assistants,
  currentAssigneeId,
  onUpdated,
}: ChatAssignmentPanelProps) {
  const [assigneeId, setAssigneeId] = useState(currentAssigneeId || assistants[0]?.id || '');
  const [transferToId, setTransferToId] = useState(assistants[1]?.id || assistants[0]?.id || '');
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(okMsg);
      onUpdated?.();
    } catch (e) {
      console.error(e);
      toast.error(isRtl ? 'تعذر تنفيذ العملية' : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#0B2345]/10 bg-white dark:bg-[#141c2e] p-3 space-y-3">
      <div>
        <p className="text-xs font-black text-[#0B2345]/55">{conversationLabel}</p>
        <p className="text-[10px] font-mono text-[#0B2345]/40 break-all mt-1">{conversationId}</p>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-bold text-[#0B2345]/55 block">
          {isRtl ? 'تعيين لمساعد' : 'Assign to assistant'}
        </label>
        <select
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
          className="w-full rounded-lg border border-[#0B2345]/15 px-2 py-2 text-sm bg-transparent"
        >
          {assistants.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <button
          type="button"
          disabled={busy || !assigneeId}
          onClick={() =>
            run(
              () => adminAssignConversation(conversationId, assigneeId),
              isRtl ? 'تم التعيين' : 'Assigned',
            )
          }
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#D4AF37] text-[#0B2345] py-2 text-xs font-bold disabled:opacity-50"
        >
          <UserPlus size={14} />
          {isRtl ? 'تعيين' : 'Assign'}
        </button>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-bold text-[#0B2345]/55 block">
          {isRtl ? 'تحويل إلى' : 'Transfer to'}
        </label>
        <select
          value={transferToId}
          onChange={(e) => setTransferToId(e.target.value)}
          className="w-full rounded-lg border border-[#0B2345]/15 px-2 py-2 text-sm bg-transparent"
        >
          {assistants.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <button
          type="button"
          disabled={busy || !transferToId}
          onClick={() =>
            run(
              () => adminTransferConversation(conversationId, transferToId, 'manual_transfer'),
              isRtl ? 'تم التحويل' : 'Transferred',
            )
          }
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#0B2345]/15 py-2 text-xs font-bold disabled:opacity-50"
        >
          <ArrowRightLeft size={14} />
          {isRtl ? 'تحويل' : 'Transfer'}
        </button>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            run(
              () => adminUnassignConversation(conversationId),
              isRtl ? 'أُلغي التعيين' : 'Unassigned',
            )
          }
          className="flex-1 flex items-center justify-center gap-1 rounded-lg border py-2 text-[10px] font-bold disabled:opacity-50"
        >
          <RefreshCw size={12} />
          {isRtl ? 'إلغاء التعيين' : 'Unassign'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            run(
              () => adminCloseConversation(conversationId),
              isRtl ? 'أُغلقت' : 'Closed',
            )
          }
          className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-rose-200 text-rose-600 py-2 text-[10px] font-bold disabled:opacity-50"
        >
          <XCircle size={12} />
          {isRtl ? 'إغلاق' : 'Close'}
        </button>
      </div>
    </div>
  );
}
