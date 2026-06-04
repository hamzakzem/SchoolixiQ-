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
        className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200/80 dark:border-red-900/40 text-red-600 dark:text-red-400 font-bold text-sm shadow-sm active:scale-[0.98] transition-transform"
      >
        <LogOut size={20} strokeWidth={2.25} />
        {t('logout')}
      </button>
    </div>
  );
}
