import React from 'react';
import { Bug } from 'lucide-react';
import type { TuitionReminderDiagnostics } from '../../../lib/tuitionReminderDebug';

const IS_DEV = import.meta.env.DEV;

type Props = {
  diagnostics: TuitionReminderDiagnostics;
  debugMode: boolean;
  onDebugModeChange: (value: boolean) => void;
};

/** Developer-only panel — hidden in production builds. */
export function TuitionReminderDiagnosticPanel({
  diagnostics,
  debugMode,
  onDebugModeChange,
}: Props) {
  if (!IS_DEV) return null;

  const { counts, debugRows } = diagnostics;

  return (
    <div className="space-y-2 border border-dashed border-slate-300 rounded-xl p-3 bg-slate-50/80">
      <label className="inline-flex items-center gap-2 text-[11px] font-bold text-slate-500 cursor-pointer">
        <input
          type="checkbox"
          checked={debugMode}
          onChange={(e) => onDebugModeChange(e.target.checked)}
          className="rounded border-slate-300"
        />
        <Bug size={12} />
        تشخيص للمطور (console: TuitionReminderDebug)
      </label>

      {debugMode && (
        <div className="overflow-x-auto max-h-48 text-[10px] font-mono text-slate-500" dir="ltr">
          <pre className="whitespace-pre-wrap">
            {JSON.stringify(
              {
                students: counts.studentsCount,
                installments: counts.installmentsCount,
                parents: counts.parentsCount,
                eligible: counts.rowsBeforeParentFilter,
                displayable: counts.rowsAfterParentFilter,
                buckets: counts.rowsByBucket,
                debugRows: debugRows.length,
              },
              null,
              2,
            )}
          </pre>
        </div>
      )}
    </div>
  );
}
