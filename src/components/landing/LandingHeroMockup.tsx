import React from 'react';
import { motion } from 'motion/react';
import {
  BarChart3,
  Bell,
  LayoutDashboard,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { MOTION_EASE, prefersReducedMotion } from '../../lib/motion';

const GOLD = '#d4af37';

export function LandingHeroMockup({ compact = false }: { compact?: boolean }) {
  const reduced = prefersReducedMotion();

  return (
    <div className={`relative w-full mx-auto ${compact ? 'max-w-[420px]' : 'max-w-[520px] lg:mr-auto'}`}>
      <div
        className="absolute -top-8 -left-8 w-48 h-48 rounded-full opacity-40 blur-3xl pointer-events-none"
        style={{ background: `radial-gradient(circle, ${GOLD}40, transparent)` }}
      />

      <motion.div
        initial={reduced ? {} : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: MOTION_EASE }}
        className="landing-mockup-laptop relative z-10 landing-fade-up"
      >
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[rgba(212,175,55,0.2)] bg-[#081f3d]">
          <span className="w-2 h-2 rounded-full bg-red-400/70" />
          <span className="w-2 h-2 rounded-full bg-amber-400/70" />
          <span className="w-2 h-2 rounded-full bg-emerald-400/70" />
          <span className="mr-auto text-[9px] font-mono text-[#94a3b8]">admin.schoolixiq.com</span>
        </div>
        <div className={`flex ${compact ? 'min-h-[220px]' : 'min-h-[280px] sm:min-h-[320px]'}`}>
          <div className="w-14 shrink-0 bg-[#06182f] flex flex-col items-center py-5 gap-3 border-l border-[rgba(212,175,55,0.12)]">
            {[LayoutDashboard, Users, Wallet, Bell, BarChart3].map((Icon, i) => (
              <div
                key={i}
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${i === 0 ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'text-white/35'}`}
              >
                <Icon size={16} strokeWidth={1.5} />
              </div>
            ))}
          </div>
          <div className="flex-1 p-4 sm:p-5 bg-[#0b2345]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#94a3b8]">لوحة المدرسة</p>
            <p className="text-lg font-black text-white mt-0.5">ملخص اليوم</p>
            <div className="grid grid-cols-3 gap-2 mt-4 mb-4">
              {[
                { l: 'حضور', icon: UserCheck },
                { l: 'أقساط', icon: Wallet },
                { l: 'تبليغات', icon: Bell },
              ].map(({ l, icon: Icon }) => (
                <div key={l} className="rounded-xl border border-[rgba(212,175,55,0.2)] p-2.5 bg-[#081f3d]">
                  <Icon size={14} className="text-[#d4af37] mb-1" />
                  <p className="text-[9px] font-bold text-[#cbd5e1]">{l}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-[rgba(212,175,55,0.2)] overflow-hidden">
              <div className="px-3 py-2 text-[9px] font-bold text-[#94a3b8] bg-[#081f3d]">آخر النشاطات</div>
              {['تسجيل حضور — الصف الخامس', 'تذكير أقساط — ولي أمر'].map((row) => (
                <div
                  key={row}
                  className="flex items-center gap-2 px-3 py-2 border-b last:border-0 border-[rgba(212,175,55,0.1)] text-[10px] font-medium text-[#cbd5e1]"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] shrink-0" />
                  <span className="truncate">{row}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 h-10 rounded-lg border border-[rgba(212,175,55,0.15)] bg-[#081f3d] flex items-end gap-1 px-2 pb-2">
              {[40, 65, 45, 80, 55, 70].map((h, i) => (
                <div key={i} className="flex-1 rounded-sm bg-[#d4af37]/60" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {!compact && (
        <motion.div
          initial={reduced ? {} : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="landing-mockup-phone"
        >
          <div className="rounded-[1.75rem] p-[3px] bg-[#081f3d] border border-[rgba(212,175,55,0.3)] shadow-2xl">
            <div className="rounded-[1.6rem] overflow-hidden bg-[#06182f]">
              <div className="h-4 flex justify-center items-end">
                <div className="w-10 h-1 rounded-full bg-black/50" />
              </div>
              <div className="bg-[#0b2345] px-2.5 pb-3 pt-1 space-y-1.5">
                <p className="text-[8px] font-black text-white px-1">ولي الأمر</p>
                {['حضور', 'واجب', 'قسط'].map((t) => (
                  <div
                    key={t}
                    className="text-[8px] font-bold py-1.5 px-2 rounded-lg bg-[#081f3d] border border-[rgba(212,175,55,0.2)] text-[#cbd5e1]"
                  >
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
