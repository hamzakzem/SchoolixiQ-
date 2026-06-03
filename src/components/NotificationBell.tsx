import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { NotificationCenter } from './NotificationCenter';
import { useNotifications } from '../hooks/useNotifications';
import { useAuth } from '../lib/AuthContext';

type Props = {
  activeTabSetter?: (tabName: string) => void;
  userRole?: string;
  className?: string;
  /** Sticky header slot — keeps bell aligned with language/theme controls */
  variant?: 'header' | 'compact';
};

export const NotificationBell: React.FC<Props> = ({
  activeTabSetter,
  userRole,
  className = '',
  variant = 'header',
}) => {
  const { profile } = useAuth();
  const { unreadCount } = useNotifications();
  const [open, setOpen] = useState(false);

  const role = (userRole || profile?.role || 'parent').toLowerCase();

  const buttonClass =
    variant === 'compact'
      ? `relative w-8 h-8 rounded border transition-all flex items-center justify-center shrink-0 shadow-sm ${
          open
            ? 'bg-[#0B2345] border-indigo-700 text-white'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
        }`
      : variant === 'header'
        ? `relative w-11 h-11 rounded-xl md:rounded-2xl border transition-all flex items-center justify-center shrink-0 ${
            open
              ? 'bg-[#0B2345] border-indigo-600 text-white shadow-lg shadow-indigo-200'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-indigo-200 hover:text-[#0B2345]'
          }`
        : `relative p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-[#0B2345] ${open ? 'bg-[#0B2345] text-white' : 'bg-white dark:bg-slate-800'}`;

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={buttonClass}
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell size={variant === 'compact' ? 16 : 18} className="pointer-events-none" />
        {unreadCount > 0 && (
          <span
            className={`pointer-events-none absolute top-0 end-0 bg-red-500 border-2 border-white dark:border-slate-900 rounded-full font-black text-white flex items-center justify-center -translate-y-1/2 translate-x-1/2 rtl:-translate-x-1/2 ${
              variant === 'compact'
                ? 'min-w-[1rem] h-4 px-0.5 text-[9px]'
                : 'min-w-[1.25rem] h-5 px-1 text-[10px]'
            }`}
            aria-hidden
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <NotificationCenter
          onClose={() => setOpen(false)}
          activeTabSetter={activeTabSetter}
          userRole={role}
        />
      )}
    </div>
  );
};

export default NotificationBell;
