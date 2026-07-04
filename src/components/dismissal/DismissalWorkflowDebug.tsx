import React, { useState } from 'react';
import { Bug, ChevronDown, ChevronUp } from 'lucide-react';
import {
  deriveDismissalState,
  getDismissalEvents,
  reconcileDismissalRequest,
  resolveDismissalStatus,
  type DismissalRequest,
} from '../../lib/dismissalTypes';

type Props = {
  request: DismissalRequest;
  locale?: 'ar' | 'en';
};

/** Admin observability — event log vs derived state */
export function DismissalWorkflowDebug({ request, locale = 'ar' }: Props) {
  const [open, setOpen] = useState(false);
  const isRtl = locale === 'ar';
  const events = getDismissalEvents(request);
  const reconciled = reconcileDismissalRequest(request);
  const derived = resolveDismissalStatus(request);

  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-[10px] font-bold text-slate-500 hover:bg-slate-100"
      >
        <span className="flex items-center gap-1">
          <Bug size={12} />
          {isRtl ? 'تشخيص سير العمل' : 'Workflow debug'}
        </span>
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2 text-[10px] font-mono text-slate-600" dir="ltr">
          <p>
            stored: <strong>{String(request.status)}</strong> → derived:{' '}
            <strong className="text-emerald-700">{derived}</strong>
            {reconciled.statusDrift && (
              <span className="text-amber-600 ml-2">DRIFT DETECTED</span>
            )}
          </p>
          <p>events: {events.length} | processing: {String(request.isProcessing)}</p>
          <ol className="list-decimal list-inside space-y-1 max-h-32 overflow-y-auto">
            {events.map((ev, i) => (
              <li key={ev.eventId || i}>
                {ev.type}
                {ev.eventId ? ` [${ev.eventId.slice(0, 8)}]` : ''}
                {ev.byName ? ` — ${ev.byName}` : ''}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
