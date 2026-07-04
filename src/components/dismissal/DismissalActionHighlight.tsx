import React from 'react';
import { AlertCircle, CheckCircle2, XCircle, Shield, User, Building2 } from 'lucide-react';
import {
  getDismissalActionRequired,
  type DismissalRequest,
  type DismissalViewerRole,
} from '../../lib/dismissalTypes';
import '../../styles/dismissal-workflow.css';

const ROLE_ICONS: Record<string, React.ElementType> = {
  guard: Shield,
  manager: Building2,
  parent: User,
  system: CheckCircle2,
};

type Props = {
  request: DismissalRequest;
  locale?: 'ar' | 'en';
  viewerRole?: DismissalViewerRole;
};

/** Decision layer — what is required NOW (not history) */
export function DismissalActionHighlight({ request, locale = 'ar', viewerRole }: Props) {
  const action = getDismissalActionRequired(request, locale, viewerRole);
  if (!action) return null;

  const isRtl = locale === 'ar';
  const Icon = ROLE_ICONS[action.responsibleRole] || AlertCircle;
  const toneClass =
    action.tone === 'done'
      ? 'dw-action-highlight--done'
      : action.tone === 'rejected'
        ? 'dw-action-highlight--rejected'
        : 'dw-action-highlight--active';

  return (
    <div
      className={`dw-action-highlight ${toneClass}`}
      role="status"
      aria-live="polite"
      aria-label={isRtl ? 'المطلوب الآن' : 'Required action'}
    >
      <div className="dw-action-highlight__icon" aria-hidden>
        {action.tone === 'done' ? (
          <CheckCircle2 size={22} />
        ) : action.tone === 'rejected' ? (
          <XCircle size={22} />
        ) : (
          <AlertCircle size={22} />
        )}
      </div>
      <div className="dw-action-highlight__body">
        <p className="dw-action-highlight__eyebrow">
          {isRtl ? 'المطلوب الآن' : 'Required now'}
        </p>
        <p className="dw-action-highlight__action">{action.actionLabel}</p>
        {action.tone === 'active' && (
          <p className="dw-action-highlight__responsible">
            <Icon size={14} aria-hidden />
            <span>
              {isRtl ? 'المسؤول حالياً:' : 'Responsible:'}{' '}
              <strong>{action.responsibleLabel}</strong>
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
