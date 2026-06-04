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
      className="lg:hidden fixed bottom-0 inset-x-0 z-[60] bg-white border-t border-slate-200 shadow-[0_-4px_24px_rgba(11,35,69,0.08)] safe-area-bottom"
      dir={isRtl ? 'rtl' : 'ltr'}
      aria-label={isRtl ? 'التنقل' : 'Navigation'}
    >
      <div className="grid grid-cols-4 h-16">
        {items.map(({ id, icon: Icon, labelAr, labelEn }) => {
          const on = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-colors ${
                on ? 'text-[#0B2345]' : 'text-slate-400'
              }`}
            >
              <Icon size={22} strokeWidth={on ? 2.5 : 2} />
              <span>{isRtl ? labelAr : labelEn}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
