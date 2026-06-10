import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useLanguage } from '../lib/LanguageContext';
import { fetchSchoolHealthSnapshot, type SchoolHealthSnapshot } from '../lib/schoolHealth';
import { ClipboardCheck, UserX, Wallet, AlertTriangle, ShieldCheck } from 'lucide-react';
import { AnimatedCounter } from './ui/AnimatedCounter';
import { motion } from 'motion/react';

const CARDS: Array<{
  key: keyof SchoolHealthSnapshot;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  ar: string;
  en: string;
  tone: string;
}> = [
  { key: 'attendanceToday', icon: ClipboardCheck, ar: 'حضور اليوم', en: 'Attendance today', tone: 'text-emerald-600' },
  { key: 'absencesToday', icon: UserX, ar: 'غياب اليوم', en: 'Absences today', tone: 'text-rose-600' },
  { key: 'overdueTuition', icon: Wallet, ar: 'أقساط متأخرة', en: 'Overdue tuition', tone: 'text-amber-600' },
  { key: 'behaviorIncidents', icon: AlertTriangle, ar: 'مخالفات اليوم', en: 'Behavior today', tone: 'text-orange-600' },
  { key: 'activeDismissals', icon: ShieldCheck, ar: 'طلبات تسريح نشطة', en: 'Active dismissals', tone: 'text-indigo-600' },
];

export default function SchoolHealthIndicators({
  onNavigate,
}: {
  onNavigate?: (tab: string) => void;
}) {
  const { profile } = useAuth();
  const { isRtl } = useLanguage();
  const [health, setHealth] = useState<SchoolHealthSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.schoolId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetchSchoolHealthSnapshot(profile.schoolId)
      .then((snap) => {
        if (!cancelled) setHealth(snap);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profile?.schoolId]);

  const tabForKey: Partial<Record<keyof SchoolHealthSnapshot, string>> = {
    attendanceToday: 'attendance',
    absencesToday: 'attendance',
    overdueTuition: 'tuition',
    behaviorIncidents: 'behavior',
    activeDismissals: 'dismissal_gate',
  };

  return (
    <div className="mb-8" dir={isRtl ? 'rtl' : 'ltr'}>
      <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4">
        {isRtl ? 'مؤشرات صحة المدرسة' : 'School Health Indicators'}
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {CARDS.map((card, i) => {
          const Icon = card.icon;
          const value = health?.[card.key] ?? null;
          const tab = tabForKey[card.key];
          const Wrapper = tab && onNavigate ? 'button' : 'div';
          return (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Wrapper
                type={tab && onNavigate ? 'button' : undefined}
                onClick={tab && onNavigate ? () => onNavigate(tab) : undefined}
                className={`w-full text-right p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm ${
                  tab && onNavigate ? 'hover:border-[#D4A64A]/40 cursor-pointer' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">
                    {isRtl ? card.ar : card.en}
                  </span>
                  <Icon size={16} className={card.tone} />
                </div>
                <p className={`text-2xl font-black tabular-nums ${card.tone}`}>
                  {loading ? '—' : <AnimatedCounter value={value ?? 0} />}
                </p>
              </Wrapper>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
