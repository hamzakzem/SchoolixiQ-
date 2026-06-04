import { Calendar, Home, MessageSquare, Settings } from 'lucide-react';
import { useLanguage } from '../../lib/LanguageContext';
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
      className="fixed bottom-0 inset-x-0 z-[60] safe-area-bottom"
      dir={isRtl ? 'rtl' : 'ltr'}
      aria-label={isRtl ? 'التنقل' : 'Navigation'}
    >
      <div className="mx-3 mb-2 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-[0_-2px_28px_rgba(11,35,69,0.12)]">
        <div className="grid grid-cols-4 h-[60px] px-1">
          {items.map(({ id, icon: Icon, labelAr, labelEn }) => {
            const on = active === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onChange(id)}
                className={`relative flex flex-col items-center justify-center gap-0.5 rounded-xl mx-0.5 my-1 transition-all duration-200 ${
                  on ? 'text-white' : 'text-slate-400'
                }`}
              >
                {on ? (
                  <span className="absolute inset-0 rounded-xl bg-gradient-to-b from-[#0f2d52] to-[#0B2345] shadow-md" />
                ) : null}
                <span className="relative flex flex-col items-center gap-0.5">
                  <Icon size={22} strokeWidth={on ? 2.5 : 2} />
                  <span className="text-[10px] font-bold leading-none">
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
