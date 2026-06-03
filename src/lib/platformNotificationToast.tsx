import toast from 'react-hot-toast';
import { Bell } from 'lucide-react';

type Options = {
  onClick?: () => void;
  durationMs?: number;
};

/** In-app banner when a push arrives while the app is open */
export function showPlatformNotificationToast(
  title: string,
  body: string,
  options?: Options,
): void {
  const heading = title?.trim() || 'schoolixiQ';
  const message = body?.trim() || '';

  toast.custom(
    (t) => (
      <button
        type="button"
        onClick={() => {
          toast.dismiss(t.id);
          options?.onClick?.();
        }}
        className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-sm w-full pointer-events-auto flex gap-3 rounded-2xl border border-slate-200/80 bg-white dark:bg-slate-900 p-4 shadow-xl shadow-indigo-500/10 text-start`}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0B2345] text-white">
          <Bell size={20} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-black text-slate-900 dark:text-white truncate">
            {heading}
          </span>
          {message ? (
            <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
              {message}
            </span>
          ) : null}
          <span className="block text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-1.5">
            {typeof document !== 'undefined' && document.documentElement.dir === 'rtl'
              ? 'اضغط للعرض'
              : 'Tap to open'}
          </span>
        </span>
      </button>
    ),
    { duration: options?.durationMs ?? 6000, position: 'top-center' },
  );
}
