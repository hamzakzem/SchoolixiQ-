import React from 'react';
import { BellRing, CalendarClock, Check, Phone, UserRound, X } from 'lucide-react';
import {
  formatTuitionAmountLabel,
  formatTuitionDueLabel,
  type TuitionReminderDisplayRow,
  type TuitionReminderFilterKey,
} from '../../../lib/tuitionModel';
import { getTuitionBucketLabel } from '../../../lib/tuitionReminderLabels';
import '../../../styles/tuition-reminders.css';

export type ReminderFilterTab = { key: TuitionReminderFilterKey; label: string };

/** Horizontal, scrollable filter pills with counts. */
export function ReminderFilterChips({
  tabs,
  value,
  counts,
  onChange,
}: {
  tabs: ReminderFilterTab[];
  value: TuitionReminderFilterKey;
  counts: Partial<Record<TuitionReminderFilterKey, number>>;
  onChange: (key: TuitionReminderFilterKey) => void;
}) {
  return (
    <div className="sx-trm-chips" role="tablist" aria-label="تصفية الأقساط">
      {tabs.map((tab) => {
        const active = value === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active}
            className={`sx-trm-chip${active ? ' is-active' : ''}`}
            onClick={() => onChange(tab.key)}
          >
            <span>{tab.label}</span>
            <span className="sx-trm-chip__count">{counts[tab.key] ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Checkbox drawn by CSS so it reads the same in light and dark mode. */
export function ReminderCheck({ checked, mixed = false }: { checked: boolean; mixed?: boolean }) {
  return (
    <span className={`sx-trm-check${checked || mixed ? ' is-on' : ''}`} aria-hidden>
      {checked ? <Check size={13} strokeWidth={3} /> : mixed ? <span className="sx-trm-check__dash" /> : null}
    </span>
  );
}

function ChannelPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`sx-trm-channel${ok ? ' is-ok' : ''}`}>
      {ok ? <Check size={11} strokeWidth={3} aria-hidden /> : <X size={11} strokeWidth={3} aria-hidden />}
      {label}
    </span>
  );
}

type CardProps = {
  row: TuitionReminderDisplayRow;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: () => void;
  /** Per-row buttons (WhatsApp, send, restore…) */
  actions?: React.ReactNode;
  /** Extra line such as the reminder count on the full dashboard */
  extraMeta?: React.ReactNode;
};

/** One unpaid installment: who, how much, how late, and how the parent can be reached. */
export function TuitionReminderCard({ row, selectable, selected = false, onToggle, actions, extraMeta }: CardProps) {
  const initial = (row.studentName || '?').trim().charAt(0);
  const identity = (
    <>
      {selectable ? <ReminderCheck checked={selected} /> : null}
      <span className="sx-trm-card__avatar" aria-hidden>{initial}</span>
      <span className="sx-trm-card__who">
        <span className="sx-trm-card__name">{row.studentName}</span>
        {row.className && row.className !== '—' ? (
          <span className="sx-trm-card__class">{row.className}</span>
        ) : null}
      </span>
      <span className="sx-trm-card__money">
        <span className="sx-trm-card__amount">
          {formatTuitionAmountLabel(row.amount)}
          <small> د.ع</small>
        </span>
        <span className={`sx-trm-badge sx-trm-badge--${row.bucket}`}>
          {getTuitionBucketLabel(row.bucket, row.delayDays)}
        </span>
      </span>
    </>
  );

  return (
    <article className={`sx-trm-card${selected ? ' is-selected' : ''}${row.isRestricted ? ' is-restricted' : ''}`}>
      {selectable ? (
        <label className="sx-trm-card__top">
          <input
            type="checkbox"
            className="sr-only"
            checked={selected}
            onChange={onToggle}
            aria-label={`تحديد ${row.studentName}`}
          />
          {identity}
        </label>
      ) : (
        <div className="sx-trm-card__top">{identity}</div>
      )}

      <div className="sx-trm-card__meta">
        <span className="sx-trm-meta">
          <CalendarClock size={14} aria-hidden />
          {formatTuitionDueLabel(row.dueDate)}
        </span>
        <span className="sx-trm-meta">
          <UserRound size={14} aria-hidden />
          {row.hasLinkedParent ? row.parentName : 'بدون ولي أمر'}
        </span>
        {row.parentPhone ? (
          <span className="sx-trm-meta" dir="ltr">
            <Phone size={14} aria-hidden />
            {row.parentPhone}
          </span>
        ) : null}
        <span className="sx-trm-meta">
          <BellRing size={14} aria-hidden />
          {row.lastReminderAt
            ? `آخر تذكير ${row.lastReminderAt.toLocaleDateString('ar-IQ-u-nu-latn')}`
            : 'لم يُذكَّر بعد'}
        </span>
        {extraMeta}
      </div>

      <div className="sx-trm-card__foot">
        <div className="sx-trm-card__channels">
          <ChannelPill ok={row.hasLinkedParent} label="حساب ولي الأمر" />
          <ChannelPill ok={row.hasWhatsApp} label="واتساب" />
          {row.isRestricted ? <span className="sx-trm-channel is-warn">مقيّد</span> : null}
        </div>
        {actions ? <div className="sx-trm-card__actions">{actions}</div> : null}
      </div>
    </article>
  );
}
