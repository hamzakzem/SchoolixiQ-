import { Calendar, Home, MessageSquare, Settings } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../../lib/LanguageContext';
import { mobileTokens } from './mobileUiKit';
import type { DashboardRole, MobileNavId } from './mobileNavMaps';

type Props = {
  role: DashboardRole;
  active: MobileNavId;
  onChange: (nav: MobileNavId) => void;
};

const items: { id: MobileNavId; icon: typeof Home; labelAr: string; labelEn: string }[] = [
  { id: 'home', icon: Home, labelAr: 'الرئيسية', labelEn: 'Home' },
  { id: 'messages', icon: MessageSquare, labelAr: 'الرسائل', labelEn: 'Messages' },
  { id: 'calendar', icon: Calendar, labelAr: 'التقويم', labelEn: 'Calendar' },
  { id: 'settings', icon: Settings, labelAr: 'الإعدادات', labelEn: 'Settings' },
];

export default function MobileMockupBottomNav({ active, onChange }: Props) {
  const { isRtl } = useLanguage();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-[60] safe-area-bottom pointer-events-none"
      dir={isRtl ? 'rtl' : 'ltr'}
      aria-label={isRtl ? 'التنقل' : 'Navigation'}
    >
      <div
        className={`mx-3 mb-2.5 rounded-[1.35rem] bg-white/92 backdrop-blur-2xl border border-slate-200/80 ${mobileTokens.navShadow} pointer-events-auto`}
      >
        <div className="relative grid grid-cols-4 h-[62px] px-1.5">
          {items.map(({ id, icon: Icon, labelAr, labelEn }) => {
            const on = active === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onChange(id)}
                className={`relative flex flex-col items-center justify-center gap-0.5 rounded-xl mx-0.5 my-1.5 transition-colors duration-300 z-[1] ${
                  on ? 'text-white' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {on ? (
                  <motion.span
                    layoutId="sq-mobile-nav-pill"
                    className="absolute inset-0 rounded-xl bg-gradient-to-b from-[#12325c] to-[#0B2345] shadow-[0_4px_16px_rgba(11,35,69,0.45)] ring-1 ring-white/10"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                ) : null}
                <span className="relative flex flex-col items-center gap-0.5 py-0.5">
                  <Icon size={21} strokeWidth={on ? 2.5 : 2} />
                  <span className="text-[9px] font-bold leading-none tracking-wide">
                    {isRtl ? labelAr : labelEn}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
