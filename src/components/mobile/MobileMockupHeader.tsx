import { Bell } from 'lucide-react';
import BrandLogo from '../BrandLogo';
import { useLanguage } from '../../lib/LanguageContext';
import { mobileTokens } from './mobileUiKit';

type Props = {
  subtitle?: string;
  schoolName?: string;
  schoolLogoUrl?: string | null;
  /** Platform brand when no school (e.g. super admin) */
  onNotifications?: () => void;
};

export default function MobileMockupHeader({
  subtitle,
  schoolName,
  schoolLogoUrl,
  onNotifications,
}: Props) {
  const { isRtl } = useLanguage();
  const displayName = schoolName || subtitle || 'SchoolixiQ';
  const showSchoolLogo = Boolean(schoolLogoUrl);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-[60] ${mobileTokens.headerH} bg-gradient-to-r from-[#0B2345] via-[#0f2d52] to-[#0B2345] text-white shadow-[0_4px_24px_rgba(11,35,69,0.45)] safe-area-top`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="h-full flex items-center justify-between px-4 gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-[52px] h-[52px] rounded-2xl bg-white p-1 shadow-lg ring-2 ring-white/25 shrink-0 flex items-center justify-center overflow-hidden">
            {showSchoolLogo ? (
              <img
                src={schoolLogoUrl!}
                alt={displayName}
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <BrandLogo size="sm" className="max-h-9 max-w-full" alt="SchoolixiQ" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-white/60 uppercase tracking-wider leading-none">
              SchoolixiQ
            </p>
            <p className="text-[15px] font-black tracking-tight truncate mt-1 leading-tight">
              {displayName}
            </p>
            {subtitle && schoolName && subtitle !== schoolName ? (
              <p className="text-[10px] text-white/55 font-bold truncate mt-0.5">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onNotifications}
          className="w-11 h-11 rounded-2xl bg-white/12 hover:bg-white/18 border border-white/15 flex items-center justify-center shrink-0 active:scale-95 transition-all"
          aria-label={isRtl ? 'الإشعارات' : 'Notifications'}
        >
          <Bell size={20} strokeWidth={2.25} />
        </button>
      </div>
    </header>
  );
}
