import React from 'react';
import { CheckCircle, Circle, XCircle, Clock } from 'lucide-react';
import {
  DISMISSAL_EVENT_LABELS,
  DISMISSAL_TIMELINE_STEPS,
  DISMISSAL_STATUS_LABELS,
  getDismissalEvents,
  resolveDismissalStatus,
  type DismissalRequest,
  type DismissalStatus,
} from '../../lib/dismissalTypes';

function eventTime(ev: { timestamp?: { seconds?: number } | null }) {
  const s = ev.timestamp?.seconds;
  if (!s) return null;
  return new Date(s * 1000).toLocaleString('ar-IQ', {
    hour: '2-digit',
    minute: '2-digit',
    day: 'numeric',
    month: 'short',
  });
}

type Props = {
  request: DismissalRequest;
  locale?: 'ar' | 'en';
  compact?: boolean;
};

export function DismissalTimeline({ request, locale = 'ar', compact = false }: Props) {
  const events = getDismissalEvents(request);
  const derived = resolveDismissalStatus(request);
  const isRejected = derived === 'REJECTED';
  const rejectEvent = events.find(
    (e) => e.type === 'GUARD_REJECTED' || e.type === 'MANAGER_REJECTED',
  );

  const steps = isRejected
    ? [
        ...DISMISSAL_TIMELINE_STEPS.slice(0, 1),
        { key: rejectEvent?.type || 'GUARD_REJECTED', status: 'REJECTED' as DismissalStatus },
      ]
    : DISMISSAL_TIMELINE_STEPS;

  const statusOrder: DismissalStatus[] = [
    'REQUESTED',
    'GUARD_VERIFIED',
    'APPROVED',
    'DISMISSED',
  ];
  const currentIdx = statusOrder.indexOf(
    derived === 'GUARD_REVIEWING' ? 'REQUESTED' : derived === 'MANAGER_REVIEWING' ? 'APPROVED' : derived,
  );

  return (
    <div className={`${compact ? 'space-y-2' : 'space-y-3'}`} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      {!compact && (
        <p className="text-xs font-bold text-slate-500">
          {DISMISSAL_STATUS_LABELS[derived]?.[locale]}
        </p>
      )}
      <ol className="relative border-r-2 border-slate-200 dark:border-slate-700 mr-3 space-y-4">
        {steps.map((step, idx) => {
          const ev = events.find((e) => e.type === step.key);
          const done = !!ev || (currentIdx >= 0 && idx <= currentIdx && !isRejected);
          const rejected = isRejected && step.status === 'REJECTED';
          const pending = !done && !rejected;

          return (
            <li key={step.key} className="mr-4 pr-2">
              <span
                className={`absolute flex items-center justify-center w-6 h-6 rounded-full -right-3 ring-4 ring-white dark:ring-slate-900 ${
                  rejected
                    ? 'bg-rose-100 text-rose-600'
                    : done
                      ? 'bg-emerald-100 text-emerald-600'
                      : 'bg-slate-100 text-slate-400'
                }`}
              >
                {rejected ? (
                  <XCircle size={14} />
                ) : done ? (
                  <CheckCircle size={14} />
                ) : (
                  <Circle size={12} />
                )}
              </span>
              <div className="flex flex-col gap-0.5">
                <span
                  className={`text-sm font-bold ${
                    pending ? 'text-slate-400' : 'text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {DISMISSAL_EVENT_LABELS[step.key]?.[locale] || step.key}
                </span>
                {ev?.byName && (
                  <span className="text-[10px] text-slate-500">{ev.byName}</span>
                )}
                {ev && eventTime(ev) && (
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock size={10} />
                    {eventTime(ev)}
                  </span>
                )}
                {rejected && request.rejectReason && (
                  <span className="text-[10px] text-rose-600">{request.rejectReason}</span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
