import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck } from 'lucide-react';
import {
  resolveDismissalStatus,
  DISMISSAL_STATUS_LABELS,
  type DismissalRequest,
  type DismissalStatus,
  type DismissalViewerRole,
} from '../../lib/dismissalTypes';
import { prefersReducedMotion } from '../../lib/motion';
import { DismissalActionHighlight } from './DismissalActionHighlight';
import { DismissalStepper, DismissalTimelineToggle } from './DismissalStepper';
import { DismissalTimeline } from './DismissalTimeline';
import '../../styles/dismissal-workflow.css';

type TimelineMode = 'hidden' | 'collapsed' | 'visible';
type StepperMode = 'full' | 'compact' | 'hidden';

const ROLE_DEFAULTS: Record<
  DismissalViewerRole,
  { stepper: StepperMode; timeline: TimelineMode }
> = {
  parent: { stepper: 'full', timeline: 'visible' },
  guard: { stepper: 'compact', timeline: 'collapsed' },
  manager: { stepper: 'full', timeline: 'visible' },
  admin: { stepper: 'compact', timeline: 'collapsed' },
};

type Props = {
  request?: DismissalRequest | null;
  locale?: 'ar' | 'en';
  title: string;
  subtitle?: string;
  viewerRole?: DismissalViewerRole;
  embedded?: boolean;
  stepperMode?: StepperMode;
  timelineMode?: TimelineMode;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function DismissalWorkflow({
  request,
  locale = 'ar',
  title,
  subtitle,
  viewerRole,
  embedded = false,
  stepperMode,
  timelineMode,
  headerExtra,
  children,
  footer,
}: Props) {
  const isRtl = locale === 'ar';
  const reduced = prefersReducedMotion();
  const defaults = viewerRole ? ROLE_DEFAULTS[viewerRole] : null;
  const resolvedStepper = stepperMode ?? defaults?.stepper ?? 'full';
  const resolvedTimeline = timelineMode ?? defaults?.timeline ?? 'visible';

  const SectionWrap = reduced ? 'section' : motion.section;
  const sectionMotion = reduced
    ? {}
    : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 } };

  return (
    <div
      className={`dw-root ${embedded ? 'dw-root--embedded' : ''}`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="dw-shell">
        <header className="dw-header dw-fade-in">
          <div>
            <h1 className="dw-header__title flex items-center gap-2">
              <ShieldCheck size={22} className="text-[var(--dw-gold-400)]" aria-hidden />
              {title}
            </h1>
            {subtitle && <p className="dw-header__subtitle">{subtitle}</p>}
          </div>
          {headerExtra}
        </header>

        {request && (
          <DismissalActionHighlight
            request={request}
            locale={locale}
            viewerRole={viewerRole}
          />
        )}

        {request && resolvedStepper !== 'hidden' && (
          <SectionWrap
            className="dw-glass-card dw-glass-card--flat dw-glass-card--no-lift"
            aria-label={isRtl ? 'المرحلة الحالية' : 'Current stage'}
            {...sectionMotion}
          >
            <DismissalStepper
              request={request}
              locale={locale}
              mode={resolvedStepper}
            />
          </SectionWrap>
        )}

        <div>{children}</div>

        {request && resolvedTimeline !== 'hidden' && (
          <SectionWrap
            className="dw-glass-card dw-glass-card--no-lift"
            aria-label={isRtl ? 'سجل الأحداث' : 'Event history'}
            {...(reduced ? {} : { ...sectionMotion, transition: { duration: 0.35, delay: 0.08 } })}
          >
            {resolvedTimeline === 'collapsed' ? (
              <DismissalTimelineToggle request={request} locale={locale} defaultOpen={false}>
                <DismissalTimeline request={request} locale={locale} variant="enterprise" />
              </DismissalTimelineToggle>
            ) : (
              <DismissalTimeline request={request} locale={locale} variant="enterprise" />
            )}
          </SectionWrap>
        )}

        {footer}
      </div>
    </div>
  );
}

export function DismissalWorkflowListShell({
  locale = 'ar',
  title,
  subtitle,
  headerExtra,
  stats,
  children,
}: {
  locale?: 'ar' | 'en';
  title: string;
  subtitle?: string;
  headerExtra?: React.ReactNode;
  stats?: { label: string; value: number }[];
  children: React.ReactNode;
}) {
  const isRtl = locale === 'ar';
  return (
    <div className="dw-root dw-root--embedded" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="dw-shell">
        <header className="dw-header dw-fade-in">
          <div>
            <h1 className="dw-header__title flex items-center gap-2">
              <ShieldCheck size={22} className="text-[var(--dw-gold-400)]" aria-hidden />
              {title}
            </h1>
            {subtitle && <p className="dw-header__subtitle">{subtitle}</p>}
          </div>
          {headerExtra}
        </header>
        {stats && stats.length > 0 && (
          <div className="dw-stat-row dw-fade-in" role="group" aria-label={isRtl ? 'إحصائيات' : 'Stats'}>
            {stats.map((s) => (
              <div key={s.label} className="dw-stat">
                <div className="dw-stat__value">{s.value}</div>
                <div className="dw-stat__label">{s.label}</div>
              </div>
            ))}
          </div>
        )}
        <div className="dw-panel-grid">{children}</div>
      </div>
    </div>
  );
}

/** Drill-down list row — status only, no stepper/timeline overload */
export function DismissalListRow({
  request,
  locale = 'ar',
  onSelect,
  selected,
}: {
  request: DismissalRequest;
  locale?: 'ar' | 'en';
  onSelect?: () => void;
  selected?: boolean;
}) {
  const status = resolveDismissalStatus(request);
  const isRtl = locale === 'ar';
  const statusLabel = DISMISSAL_STATUS_LABELS[status]?.[locale] || status;

  return (
    <button
      type="button"
      className={`dw-list-row ${selected ? 'dw-list-row--selected' : ''}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span className="font-semibold text-white text-sm">{request.studentName}</span>
      <span className="dw-badge dw-badge--pending text-[10px]">{statusLabel}</span>
      <span className="text-[10px] text-[var(--dw-slate-muted)]">{request.className}</span>
    </button>
  );
}

export function dismissalStatusTone(status: DismissalStatus): 'pending' | 'success' | 'danger' {
  if (status === 'DISMISSED') return 'success';
  if (status === 'REJECTED' || status === 'EXPIRED') return 'danger';
  return 'pending';
}
