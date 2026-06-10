import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { DismissalStatus } from '../../lib/dismissalTypes';
import { DISMISSAL_STATUS_LABELS } from '../../lib/dismissalTypes';
import { prefersReducedMotion } from '../../lib/motion';

const STATUS_STYLES: Record<DismissalStatus, string> = {
  waiting: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  called: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900/40',
  ready: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40',
  completed: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/40',
  cancelled: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-900/40',
  expired: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500 border-slate-200 dark:border-slate-700',
};

type Props = {
  status: DismissalStatus;
  size?: 'sm' | 'md';
  locale?: 'ar' | 'en';
};

export function DismissalStatusBadge({ status, size = 'sm', locale = 'ar' }: Props) {
  const label = DISMISSAL_STATUS_LABELS[status][locale];
  const reduced = prefersReducedMotion();
  const sizeClass = size === 'md' ? 'text-xs px-3 py-1.5' : 'text-[10px] px-2 py-1';

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={status}
        initial={reduced ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={reduced ? undefined : { opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        className={`inline-flex items-center font-bold rounded-full border ${sizeClass} ${STATUS_STYLES[status]}`}
      >
        {label}
      </motion.span>
    </AnimatePresence>
  );
}
