import React from 'react';
import { CheckCircle, Circle, Lock, XCircle, User, Shield, Building2, Flag } from 'lucide-react';
import {
  DISMISSAL_WORKFLOW_NODES,
  getDismissalEvents,
  getWorkflowNodeStates,
  type DismissalRequest,
  type WorkflowNodeState,
} from '../../lib/dismissalTypes';

const NODE_ICONS = [User, Shield, Building2, Flag];

const STATE_STYLES: Record<
  WorkflowNodeState,
  { node: string; ring: string; line: string; icon: string }
> = {
  completed: {
    node: 'bg-emerald-500 text-white border-emerald-600 shadow-emerald-200',
    ring: 'ring-emerald-200',
    line: 'bg-emerald-400',
    icon: 'text-white',
  },
  current: {
    node: 'bg-amber-500 text-white border-amber-600 shadow-amber-200 animate-pulse',
    ring: 'ring-amber-300 ring-4',
    line: 'bg-amber-300',
    icon: 'text-white',
  },
  blocked: {
    node: 'bg-slate-100 text-slate-400 border-slate-200',
    ring: 'ring-slate-100',
    line: 'bg-slate-200',
    icon: 'text-slate-400',
  },
  rejected: {
    node: 'bg-rose-500 text-white border-rose-600 shadow-rose-200',
    ring: 'ring-rose-200',
    line: 'bg-rose-300',
    icon: 'text-white',
  },
};

type Props = {
  request: DismissalRequest;
  locale?: 'ar' | 'en';
  showLegend?: boolean;
};

function NodeIcon({ state }: { state: WorkflowNodeState }) {
  if (state === 'completed') return <CheckCircle size={18} className="text-white" />;
  if (state === 'rejected') return <XCircle size={18} className="text-white" />;
  if (state === 'blocked') return <Lock size={14} className="text-slate-400" />;
  return <Circle size={14} className="text-white fill-white/30" />;
}

export function DismissalWorkflowGraph({ request, locale = 'ar', showLegend = true }: Props) {
  const nodeStates = getWorkflowNodeStates(request);
  const events = getDismissalEvents(request);
  const isRtl = locale === 'ar';

  return (
    <div className="space-y-3" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between gap-2 px-1">
        {DISMISSAL_WORKFLOW_NODES.map((node, i) => {
          const state = nodeStates[i];
          const styles = STATE_STYLES[state];
          const Icon = NODE_ICONS[i];
          const ev = node.eventType ? events.find((e) => e.type === node.eventType) : null;
          const label = locale === 'ar' ? node.labelAr : node.labelEn;

          return (
            <React.Fragment key={node.id}>
              <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                <div
                  className={`relative flex items-center justify-center w-11 h-11 rounded-2xl border-2 shadow-sm ${styles.node} ${styles.ring}`}
                  title={label}
                >
                  <Icon size={16} className={styles.icon} />
                  <span className="absolute -bottom-1 -right-1">
                    <NodeIcon state={state} />
                  </span>
                </div>
                <span
                  className={`text-[10px] font-black text-center leading-tight truncate w-full ${
                    state === 'current'
                      ? 'text-amber-700'
                      : state === 'completed'
                        ? 'text-emerald-700'
                        : state === 'rejected'
                          ? 'text-rose-700'
                          : 'text-slate-400'
                  }`}
                >
                  {label}
                </span>
                {ev?.byName && (
                  <span className="text-[9px] text-slate-400 truncate w-full text-center">
                    {ev.byName}
                  </span>
                )}
              </div>
              {i < DISMISSAL_WORKFLOW_NODES.length - 1 && (
                <div
                  className={`h-1 flex-1 rounded-full min-w-[12px] max-w-[40px] mb-6 ${
                    nodeStates[i] === 'completed' ? STATE_STYLES.completed.line : STATE_STYLES.blocked.line
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {showLegend && (
        <div className="flex flex-wrap gap-3 text-[9px] font-bold text-slate-500 px-1">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {isRtl ? 'مكتمل' : 'Done'}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            {isRtl ? 'الخطوة الحالية' : 'Current'}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-200" />
            {isRtl ? 'محجوب' : 'Blocked'}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            {isRtl ? 'مرفوض' : 'Rejected'}
          </span>
        </div>
      )}

      {request.statusDrift && (
        <p className="text-[10px] font-bold text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
          {isRtl
            ? 'تم تصحيح حالة الطلب من سجل الأحداث تلقائياً'
            : 'Status auto-corrected from event log'}
        </p>
      )}
    </div>
  );
}
