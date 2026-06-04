import { Bell } from 'lucide-react';
import { motion } from 'motion/react';
import BrandLogo from '../BrandLogo';
import { useLanguage } from '../../lib/LanguageContext';
import { mobileTokens } from './mobileUiKit';

type Props = {
  subtitle?: string;
  schoolName?: string;
  schoolLogoUrl?: string | null;
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
      className={`fixed top-0 inset-x-0 z-[60] ${mobileTokens.headerH} text-white safe-area-top`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-[#0B2345] via-[#0f2d52] to-[#0B2345]" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#D4A64A]/50 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_100%_0%,rgba(212,166,74,0.15),transparent)] pointer-events-none" />
      <div className="relative h-full flex items-center gap-2.5 px-3.5 shadow-[0_8px_32px_rgba(11,35,69,0.35)]">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="w-14 h-14 rounded-2xl bg-white p-1 shadow-lg ring-2 ring-[#D4A64A]/35 shrink-0 flex items-center justify-center overflow-hidden"
          >
            {showSchoolLogo ? (
              <img
                src={schoolLogoUrl!}
                alt={displayName}
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <BrandLogo size="sm" className="max-h-10 max-w-full" alt="SchoolixiQ" />
            )}
          </motion.div>
          <div className="min-w-0">
            <p className="text-[9px] font-bold text-[#D4A64A] uppercase tracking-[0.18em] leading-none">
              SchoolixiQ
            </p>
            <p className="text-[15px] font-black tracking-tight truncate mt-1 leading-snug">
              {displayName}
            </p>
          </div>
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={onNotifications}
          className="w-12 h-12 rounded-2xl bg-white/12 border border-white/20 backdrop-blur-md flex items-center justify-center shrink-0 transition-colors hover:bg-white/20"
          aria-label={isRtl ? 'الإشعارات' : 'Notifications'}
        >
          <Bell size={22} strokeWidth={2.25} className="text-white" />
        </motion.button>
      </div>
    </header>
  );
}
