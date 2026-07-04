import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  Shield,
  Building2,
  Flag,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
  Circle,
} from 'lucide-react';
import {
  DISMISSAL_EVENT_LABELS,
  getDismissalEvents,
  eventTypeToRoleLabel,
  type DismissalRequest,
} from '../../lib/dismissalTypes';
import { prefersReducedMotion } from '../../lib/motion';
import '../../styles/dismissal-workflow.css';

const EVENT_ICONS: Record<string, React.ElementType> = {
  REQUEST_CREATED: User,
  GUARD_VERIFIED: Shield,
  GUARD_REJECTED: Shield,
  MANAGER_APPROVED: Building2,
  MANAGER_REJECTED: Building2,
  DISMISSED: Flag,
  SYSTEM_RECONCILE: Settings,
};

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
  variant?: 'default' | 'enterprise';
};

/** HISTORY ONLY — what happened (events, timestamps, actors). No workflow state duplication. */
export function DismissalTimeline({
  request,
  locale = 'ar',
  compact = false,
  variant = 'enterprise',
}: Props) {
  const reduced = prefersReducedMotion();
  const isRtl = locale === 'ar';

  const events = useMemo(() => {
    const list = getDismissalEvents(request).filter(
      (e) => !compact || e.type !== 'SYSTEM_RECONCILE',
    );
    return [...list].reverse();
  }, [request, compact]);

  if (variant !== 'enterprise') {
    return null;
  }

  return (
    <div
      className="dw-timeline"
      dir={isRtl ? 'rtl' : 'ltr'}
      aria-label={isRtl ? 'ماذا حدث؟' : 'What happened?'}
    >
      <p className="dw-timeline__purpose">
        {isRtl ? 'ماذا حدث؟' : 'What happened?'}
      </p>
      {events.length === 0 ? (
        <p className="dw-empty">{isRtl ? 'لا أحداث مسجلة بعد' : 'No events yet'}</p>
      ) : (
        <ul className="dw-timeline__list" role="list">
          <AnimatePresence initial={false}>
            {events.map((ev, idx) => {
              const Icon = EVENT_ICONS[ev.type] || Circle;
              const isLatest = idx === 0;
              const isReject = ev.type.includes('REJECTED');
              const itemClass = [
                'dw-timeline__item',
                isLatest ? 'dw-timeline__item--latest' : 'dw-timeline__item--done',
                isReject ? 'dw-timeline__item--reject' : '',
              ]
                .filter(Boolean)
                .join(' ');

              const ItemWrap = reduced ? 'li' : motion.li;
              const motionProps = reduced
                ? {}
                : {
                    initial: { opacity: 0, x: isRtl ? 8 : -8 },
                    animate: { opacity: 1, x: 0 },
                    transition: { duration: 0.2, delay: Math.min(idx * 0.03, 0.15) },
                  };

              return (
                <ItemWrap
                  key={ev.eventId || `${ev.type}-${idx}`}
                  className={itemClass}
                  role="listitem"
                  {...motionProps}
                >
                  <div className="dw-timeline__node" aria-hidden>
                    {isReject ? (
                      <XCircle size={14} />
                    ) : (
                      <Icon size={14} />
                    )}
                  </div>
                  <div className="dw-timeline__body">
                    <p className="dw-timeline__type">
                      {DISMISSAL_EVENT_LABELS[ev.type]?.[locale] || ev.type}
                    </p>
                    <div className="dw-timeline__meta">
                      <span>{eventTypeToRoleLabel(ev.type, locale)}</span>
                      {ev.byName && <span>{ev.byName}</span>}
                      {eventTime(ev) && (
                        <span className="flex items-center gap-1">
                          <Clock size={10} aria-hidden />
                          {eventTime(ev)}
                        </span>
                      )}
                    </div>
                    {ev.metadata &&
                      typeof ev.metadata === 'object' &&
                      'reason' in ev.metadata && (
                        <p className="text-[10px] text-[var(--dw-rose)] mt-1">
                          {String((ev.metadata as { reason?: string }).reason)}
                        </p>
                      )}
                  </div>
                </ItemWrap>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
