import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { User, Shield, Building2, Flag, CheckCircle, Lock, XCircle, ChevronDown } from 'lucide-react';
import {
  DISMISSAL_WORKFLOW_NODES,
  getWorkflowNodeStates,
  getDismissalCurrentStepIndex,
  type DismissalRequest,
  type WorkflowNodeState,
} from '../../lib/dismissalTypes';
import { prefersReducedMotion } from '../../lib/motion';
import '../../styles/dismissal-workflow.css';

const STEP_ICONS = [User, Shield, Building2, Flag];

const NODE_CLASS: Record<WorkflowNodeState, string> = {
  completed: 'dw-stepper__node--completed',
  current: 'dw-stepper__node--current',
  blocked: 'dw-stepper__node--blocked',
  rejected: 'dw-stepper__node--rejected',
};

type Props = {
  request: DismissalRequest;
  locale?: 'ar' | 'en';
  /** full = 4 nodes | compact = progress bar + current step label only */
  mode?: 'full' | 'compact';
};

function StepStatusIcon({ state }: { state: WorkflowNodeState }) {
  if (state === 'completed') return <CheckCircle size={18} aria-hidden />;
  if (state === 'rejected') return <XCircle size={18} aria-hidden />;
  if (state === 'blocked') return <Lock size={14} aria-hidden />;
  return null;
}

/** STATE ONLY — where are we in the workflow (no event names / history) */
export function DismissalStepper({ request, locale = 'ar', mode = 'full' }: Props) {
  const nodeStates = getWorkflowNodeStates(request);
  const isRtl = locale === 'ar';
  const reduced = prefersReducedMotion();
  const stepIdx = getDismissalCurrentStepIndex(request);
  const currentNode = DISMISSAL_WORKFLOW_NODES[stepIdx];
  const currentLabel = currentNode
    ? locale === 'ar'
      ? currentNode.labelAr
      : currentNode.labelEn
    : '';

  const fillWidth = useMemo(() => {
    const completed = nodeStates.filter((s) => s === 'completed').length;
    const base = (completed / Math.max(DISMISSAL_WORKFLOW_NODES.length - 1, 1)) * 100;
    return Math.min(100, base + (nodeStates.includes('current') ? 12 : 0));
  }, [nodeStates]);

  if (mode === 'compact') {
    return (
      <div
        className="dw-stepper dw-stepper--compact"
        dir={isRtl ? 'rtl' : 'ltr'}
        aria-label={isRtl ? 'المرحلة الحالية' : 'Current stage'}
      >
        <div className="dw-stepper__compact-label">
          <span className="text-[var(--dw-slate-muted)]">
            {isRtl ? 'المرحلة' : 'Stage'} {stepIdx + 1}/{DISMISSAL_WORKFLOW_NODES.length}
          </span>
          <strong className="text-white">{currentLabel}</strong>
        </div>
        <div className="dw-stepper__track dw-stepper__track--compact" aria-hidden>
          <div
            className="dw-stepper__track-fill"
            style={{ width: `${fillWidth}%`, animation: reduced ? 'none' : undefined }}
          />
        </div>
      </div>
    );
  }

  return (
    <nav
      className="dw-stepper"
      aria-label={isRtl ? 'أين نحن الآن في المسار' : 'Current workflow position'}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <p className="dw-stepper__purpose">
        {isRtl ? 'أين نحن الآن؟' : 'Where are we now?'}
      </p>
      <div className="dw-stepper__track" aria-hidden>
        {reduced ? (
          <div className="dw-stepper__track-fill" style={{ width: `${fillWidth}%` }} />
        ) : (
          <motion.div
            className="dw-stepper__track-fill"
            initial={{ width: 0 }}
            animate={{ width: `${fillWidth}%` }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          />
        )}
      </div>

      <ol className="dw-stepper__steps" role="list">
        {DISMISSAL_WORKFLOW_NODES.map((node, i) => {
          const state = nodeStates[i];
          const Icon = STEP_ICONS[i];
          const label = locale === 'ar' ? node.labelAr : node.labelEn;

          const StepWrap = reduced ? 'li' : motion.li;
          const motionProps = reduced
            ? {}
            : {
                initial: { opacity: 0, y: 8 },
                animate: { opacity: 1, y: 0 },
                transition: { delay: i * 0.04, duration: 0.25 },
              };

          return (
            <StepWrap
              key={node.id}
              className="dw-stepper__step"
              role="listitem"
              aria-current={state === 'current' ? 'step' : undefined}
              aria-label={`${label}: ${state}`}
              {...motionProps}
            >
              <div className={`dw-stepper__node ${NODE_CLASS[state]}`}>
                <Icon size={18} aria-hidden />
                <span className="absolute -bottom-1 -left-1 scale-75">
                  <StepStatusIcon state={state} />
                </span>
              </div>
              <span className="dw-stepper__label">{label}</span>
            </StepWrap>
          );
        })}
      </ol>
    </nav>
  );
}

/** Collapsible history section — for guard focus mode */
export function DismissalTimelineToggle({
  request,
  locale = 'ar',
  defaultOpen = false,
  children,
}: {
  request: DismissalRequest;
  locale?: 'ar' | 'en';
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const isRtl = locale === 'ar';

  return (
    <div className="dw-timeline-toggle">
      <button
        type="button"
        className="dw-timeline-toggle__btn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="dw-timeline-panel"
      >
        <span>{isRtl ? 'سجل ما حدث (اختياري)' : 'Event history (optional)'}</span>
        <ChevronDown
          size={16}
          className={`dw-timeline-toggle__chevron ${open ? 'dw-timeline-toggle__chevron--open' : ''}`}
          aria-hidden
        />
      </button>
      {open && (
        <div id="dw-timeline-panel" className="dw-timeline-toggle__panel">
          {children}
        </div>
      )}
    </div>
  );
}
