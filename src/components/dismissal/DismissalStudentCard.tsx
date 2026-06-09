import React from 'react';
import type { DismissalRequest } from '../../lib/dismissalTypes';
import { User } from 'lucide-react';

type Props = {
  request: Pick<
    DismissalRequest,
    'studentName' | 'className' | 'registrationNumber' | 'photoUrl' | 'parentName' | 'requestedByName' | 'pickupPersonName' | 'token'
  >;
  compact?: boolean;
};

export default function DismissalStudentCard({ request, compact = false }: Props) {
  const pickup = request.pickupPersonName || request.requestedByName || request.parentName;

  return (
    <div className={`flex items-start gap-3 ${compact ? '' : 'p-3 rounded-xl bg-white/80 border border-slate-100'}`}>
      <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
        {request.photoUrl ? (
          <img src={request.photoUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <User size={20} className="text-slate-400" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-slate-900 truncate">{request.studentName}</p>
        <p className="text-xs text-slate-500">{request.className}</p>
        {request.registrationNumber && (
          <p className="text-[10px] font-mono text-slate-400 mt-0.5">
            #{request.registrationNumber}
          </p>
        )}
        {!compact && pickup && (
          <p className="text-[10px] text-slate-500 mt-1">المستلم: {pickup}</p>
        )}
      </div>
    </div>
  );
}
