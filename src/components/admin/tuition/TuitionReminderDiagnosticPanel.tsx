import React from 'react';
import { AlertTriangle, Bug } from 'lucide-react';
import {
  formatTuitionReminderEmptyReason,
  type TuitionReminderDebugRow,
  type TuitionReminderDiagnostics,
} from '../../../lib/tuitionReminderDebug';

type Props = {
  diagnostics: TuitionReminderDiagnostics;
  debugMode: boolean;
  onDebugModeChange: (value: boolean) => void;
  showWhenEmpty?: boolean;
};

export function TuitionReminderDiagnosticPanel({
  diagnostics,
  debugMode,
  onDebugModeChange,
  showWhenEmpty = true,
}: Props) {
  const { counts, emptyReason, debugRows } = diagnostics;
  const emptyText = formatTuitionReminderEmptyReason(emptyReason, counts);

  return (
    <div className="space-y-3">
      <label className="inline-flex items-center gap-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 cursor-pointer">
        <input
          type="checkbox"
          checked={debugMode}
          onChange={(e) => onDebugModeChange(e.target.checked)}
          className="rounded border-amber-300"
        />
        <Bug size={14} />
        وضع التشخيص (مؤقت) — يعرض كل الأقساط غير المدفوعة بغض النظر عن ربط ولي الأمر
      </label>

      {showWhenEmpty && emptyText && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-slate-800 mb-1">تشخيص: {emptyReason}</p>
              <p className="text-slate-600 leading-relaxed">{emptyText}</p>
              <p className="text-[11px] text-slate-400 mt-2 font-mono" dir="ltr">
                students={counts.studentsCount} installments={counts.installmentsCount} parents=
                {counts.parentsCount} unpaid={counts.unpaidInstallments} eligible=
                {counts.rowsBeforeParentFilter} displayable={counts.rowsAfterParentFilter}
              </p>
            </div>
          </div>
        </div>
      )}

      {debugMode && (
        <div className="rounded-xl border border-amber-200 overflow-hidden">
          <div className="px-4 py-2 bg-amber-50 text-xs font-bold text-amber-900">
            تشخيص — {debugRows.length} قسط غير مدفوع (console: [TuitionReminderDebug] DATA_COUNTS)
          </div>
          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-[11px] min-w-[900px]">
              <thead>
                <tr className="bg-slate-100 text-slate-600">
                  <th className="px-2 py-2 text-right">الطالب</th>
                  <th className="px-2 py-2 text-right">parentIds</th>
                  <th className="px-2 py-2 text-right">مرتبط؟</th>
                  <th className="px-2 py-2 text-right">bucket</th>
                  <th className="px-2 py-2 text-right">سبب الاستبعاد</th>
                  <th className="px-2 py-2 text-right">الحالة</th>
                  <th className="px-2 py-2 text-right">schoolId</th>
                </tr>
              </thead>
              <tbody>
                {debugRows.map((row) => (
                  <DebugRow key={row.installmentId} row={row} />
                ))}
                {debugRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-slate-400 font-bold">
                      لا أقساط غير مدفوعة في البيانات المحمّلة
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function DebugRow({ row }: { row: TuitionReminderDebugRow }) {
  const statusColors: Record<TuitionReminderDebugRow['displayStatus'], string> = {
    linked_parent_found: 'text-emerald-700 bg-emerald-50',
    no_parent_linked: 'text-rose-700 bg-rose-50',
    invalid_phone: 'text-amber-700 bg-amber-50',
    not_eligible: 'text-slate-600 bg-slate-100',
    shown: 'text-blue-700 bg-blue-50',
  };

  return (
    <tr className="border-t border-slate-100">
      <td className="px-2 py-2 font-bold">{row.studentName}</td>
      <td className="px-2 py-2 font-mono" dir="ltr">
        {row.parentIds.length ? row.parentIds.map((id) => id.slice(0, 8)).join(', ') : '—'}
      </td>
      <td className="px-2 py-2">{row.matchingParentFound ? 'نعم' : 'لا'}</td>
      <td className="px-2 py-2">{row.bucket || '—'}</td>
      <td className="px-2 py-2 font-mono text-[10px]" dir="ltr">
        {row.reasonExcluded}
      </td>
      <td className="px-2 py-2">
        <span className={`px-1.5 py-0.5 rounded ${statusColors[row.displayStatus]}`}>
          {row.displayStatus}
        </span>
      </td>
      <td className="px-2 py-2 font-mono text-[10px]" dir="ltr">
        {row.installmentSchoolId || '(none)'}
      </td>
    </tr>
  );
}
