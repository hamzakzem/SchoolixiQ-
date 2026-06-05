import { useState } from 'react';
import { ArrowLeft, ArrowRight, Bell, Search } from 'lucide-react';
import { motion } from 'motion/react';
import BrandLogo from '../BrandLogo';
import { useLanguage } from '../../lib/LanguageContext';
import { mobileTokens } from './mobileUiKit';
import MobileModuleSearch, { type MobileModuleItem } from './MobileModuleSearch';

type Props = {
  /** Current screen — shown prominently (not duplicated school name) */
  sectionTitle?: string;
  schoolName?: string;
  schoolLogoUrl?: string | null;
  onNotifications?: () => void;
  modules?: MobileModuleItem[];
  onNavigateModule?: (tabId: string) => void;
  /** When provided, a back button is shown at the start of the header. */
  onBack?: () => void;
};

export default function MobileMockupHeader({
  sectionTitle,
  schoolName,
  schoolLogoUrl,
  onNotifications,
  modules = [],
  onNavigateModule,
  onBack,
}: Props) {
  const { isRtl } = useLanguage();
  const [searchOpen, setSearchOpen] = useState(false);
  const showSchoolLogo = Boolean(schoolLogoUrl);
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;
  const title =
    sectionTitle?.trim() ||
    (isRtl ? 'SchoolixiQ' : 'SchoolixiQ');
  const showSearch = modules.length > 0 && onNavigateModule;

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-[60] ${mobileTokens.headerH} text-white safe-area-top`}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B2345] via-[#0f2d52] to-[#0B2345]" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#D4A64A]/50 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_100%_0%,rgba(212,166,74,0.15),transparent)] pointer-events-none" />
        <div className="relative h-full flex items-center gap-2 px-3 shadow-[0_8px_32px_rgba(11,35,69,0.35)]">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {onBack ? (
              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={onBack}
                className="w-10 h-10 rounded-xl bg-white/12 border border-white/20 backdrop-blur-md flex items-center justify-center shrink-0"
                aria-label={isRtl ? 'رجوع' : 'Back'}
              >
                <BackIcon size={20} strokeWidth={2.5} />
              </motion.button>
            ) : null}
            <div className="w-11 h-11 rounded-xl bg-white p-0.5 shadow-md ring-1 ring-[#D4A64A]/30 shrink-0 flex items-center justify-center overflow-hidden">
              {showSchoolLogo ? (
                <img
                  src={schoolLogoUrl!}
                  alt=""
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <BrandLogo size="sm" className="max-h-9 max-w-full" alt="" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[8px] font-bold text-[#D4A64A] uppercase tracking-[0.2em] leading-none">
                SchoolixiQ
              </p>
              <p className="text-[14px] font-black tracking-tight truncate mt-0.5 leading-snug">
                {title}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {showSearch ? (
              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={() => setSearchOpen(true)}
                className="w-11 h-11 rounded-xl bg-white/12 border border-white/20 backdrop-blur-md flex items-center justify-center"
                aria-label={isRtl ? 'بحث الأقسام' : 'Search sections'}
              >
                <Search size={20} strokeWidth={2.25} />
              </motion.button>
            ) : null}
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={onNotifications}
              className="w-11 h-11 rounded-xl bg-white/12 border border-white/20 backdrop-blur-md flex items-center justify-center"
              aria-label={isRtl ? 'الإشعارات' : 'Notifications'}
            >
              <Bell size={20} strokeWidth={2.25} />
            </motion.button>
          </div>
        </div>
      </header>
      {showSearch ? (
        <MobileModuleSearch
          open={searchOpen}
          onClose={() => setSearchOpen(false)}
          modules={modules}
          onSelect={onNavigateModule!}
          schoolName={schoolName}
        />
      ) : null}
    </>
  );
}
