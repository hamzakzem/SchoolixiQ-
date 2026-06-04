import { LogOut } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { useLanguage } from '../../lib/LanguageContext';

type Props = {
  className?: string;
};

/** Logout control for native app shell (sidebar is hidden). */
export default function MobileLogoutButton({ className = '' }: Props) {
  const { t, isRtl } = useLanguage();

  const onLogout = () => {
    const msg = isRtl
      ? 'هل تريد تسجيل الخروج من الحساب؟'
      : 'Do you want to sign out?';
    if (!window.confirm(msg)) return;
    void auth.signOut();
  };

  return (
    <div className={`px-4 pt-2 pb-8 ${className}`}>
      <button
        type="button"
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-gradient-to-b from-red-50 to-white dark:from-red-950/40 dark:to-slate-900 border border-red-200/90 dark:border-red-800/50 text-red-600 dark:text-red-400 font-bold text-sm shadow-[0_4px_20px_rgba(220,38,38,0.12)] active:scale-[0.98] transition-all duration-200"
      >
        <LogOut size={20} strokeWidth={2.25} />
        {t('logout')}
      </button>
    </div>
  );
}
