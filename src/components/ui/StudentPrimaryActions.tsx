import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { IconButton } from './IconButton';
import { cn } from '../../lib/cn';

export interface StudentPrimaryActionsProps {
  onEdit: () => void;
  onDelete: () => void;
  disabled?: boolean;
  className?: string;
  showLabels?: boolean;
}

export function StudentPrimaryActions({
  onEdit,
  onDelete,
  disabled = false,
  className,
  showLabels = false,
}: StudentPrimaryActionsProps) {
  if (showLabels) {
    return (
      <div className={cn('sq-student-actions-bar', className)}>
        <button
          type="button"
          disabled={disabled}
          onClick={onEdit}
          className="sq-student-action-btn sq-student-action-edit"
        >
          <Edit2 size={16} />
          <span>تعديل</span>
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onDelete}
          className="sq-student-action-btn sq-student-action-delete"
        >
          <Trash2 size={16} />
          <span>حذف</span>
        </button>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-1.5 shrink-0', className)}>
      <IconButton
        title="تعديل بيانات الطالب"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className="sq-icon-btn-edit"
      >
        <Edit2 size={17} />
      </IconButton>
      <IconButton
        tone="danger"
        title="حذف الطالب"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <Trash2 size={17} />
      </IconButton>
    </div>
  );
}
