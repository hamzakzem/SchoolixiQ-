import { Bell } from 'lucide-react';
import BrandLogo from '../BrandLogo';
import { useLanguage } from '../../lib/LanguageContext';

type Props = {
  subtitle?: string;
  onNotifications?: () => void;
};

export default function MobileMockupHeader({ subtitle, onNotifications }: Props) {
  const { isRtl } = useLanguage();

  return (
    <header
      className="lg:hidden fixed top-0 inset-x-0 z-[60] bg-[#0B2345] text-white shadow-lg safe-area-top"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="flex items-center justify-between px-4 py-3 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0 p-1">
            <BrandLogo size="sm" className="max-h-7 brightness-0 invert" alt="SchoolixiQ" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black tracking-tight leading-none">SchoolixiQ</p>
            {subtitle ? (
              <p className="text-[10px] text-white/70 font-bold truncate mt-0.5">{subtitle}</p>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onNotifications}
          className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 active:scale-95 transition-transform"
          aria-label={isRtl ? 'الإشعارات' : 'Notifications'}
        >
          <Bell size={20} />
        </button>
      </div>
    </header>
  );
}
