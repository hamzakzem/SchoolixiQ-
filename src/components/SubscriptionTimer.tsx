import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { motion } from 'motion/react';

interface SubscriptionTimerProps {
  expiryDate: any;
  variant?: 'banner' | 'compact' | 'bottom-bar';
}

export function SubscriptionTimer({ expiryDate, variant = 'banner' }: SubscriptionTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number; isWarning: boolean } | null>(null);

  useEffect(() => {
    if (!expiryDate) return;

    const calculateTimeLeft = () => {
      const expiry = expiryDate?.toDate ? expiryDate.toDate() : new Date(expiryDate);
      const now = new Date();
      const difference = expiry.getTime() - now.getTime();

      if (difference <= 0) {
        return null;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      
      return {
        days,
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        isWarning: days <= 7
      };
    };

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    setTimeLeft(calculateTimeLeft());

    return () => clearInterval(timer);
  }, [expiryDate]);

  if (!timeLeft) {
    if (variant === 'compact') return null;
    return (
      <div className="bg-red-500/10 backdrop-blur-md border border-red-500/20 rounded-2xl p-4 flex items-center justify-center gap-3 text-red-500">
        <Clock size={20} className="animate-pulse" />
        <span className="font-black text-sm font-sans uppercase">انتهت صلاحية الوصول - يرجى التجديد</span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black font-sans transition-colors ${timeLeft.isWarning ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-400'}`} dir="rtl">
        <Clock size={12} className={timeLeft.isWarning ? 'animate-pulse' : ''} />
        <span>{timeLeft.days}ي {timeLeft.hours}سا {timeLeft.minutes}د</span>
      </div>
    );
  }

  if (variant === 'bottom-bar') {
    return (
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] max-w-fit px-4"
        dir="rtl"
      >
        <div className={`relative overflow-hidden backdrop-blur-xl rounded-full border shadow-lg transition-all duration-500 ${timeLeft.isWarning ? 'bg-red-50/90 dark:bg-red-900/90 border-red-200 dark:border-red-800 shadow-red-500/10' : 'bg-white/90 dark:bg-slate-900/90 border-slate-200 dark:border-slate-700 shadow-slate-500/10'}`}>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_3s_infinite]"></div>
          
          <div className="relative flex items-center gap-3 px-4 py-2">
            <div className={`flex items-center gap-2 ${timeLeft.isWarning ? 'text-red-600 dark:text-red-400 animate-pulse' : 'text-slate-500 dark:text-slate-400'}`}>
              <Clock size={14} />
              <span className="text-[11px] font-bold">
                {timeLeft.isWarning ? 'تنبيه: اقترب موعد التجديد' : 'الاشتراك ساري'}
              </span>
            </div>

            <div className={`h-4 w-px ${timeLeft.isWarning ? 'bg-red-200 dark:bg-red-800' : 'bg-slate-200 dark:bg-slate-700'}`}></div>

            <div className={`flex items-center gap-1.5 min-w-[90px] justify-center tabular-nums text-xs font-bold leading-none ${timeLeft.isWarning ? 'text-red-700 dark:text-red-300' : 'text-slate-700 dark:text-slate-300'}`}>
              <span>{timeLeft.days}ي</span>
              <span className="opacity-50">:</span>
              <span>{timeLeft.hours.toString().padStart(2, '0')}س</span>
              <span className="opacity-50">:</span>
              <span>{timeLeft.minutes.toString().padStart(2, '0')}د</span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white dark:bg-slate-900 border rounded-3xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-6 ${timeLeft.isWarning ? 'border-red-200 dark:border-red-900/50' : 'border-slate-100 dark:border-slate-800'}`}
      dir="rtl"
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${timeLeft.isWarning ? 'bg-red-500 text-white animate-pulse' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'}`}>
          <Clock size={24} />
        </div>
        <div>
          <p className={`text-[10px] font-black uppercase tracking-widest mb-0.5 font-sans ${timeLeft.isWarning ? 'text-red-500' : 'text-slate-400'}`}>الوقت المتبقي لانتهاء الاشتراك</p>
          <h4 className="text-sm font-black text-slate-900 dark:text-white font-sans">
            {timeLeft.isWarning ? 'تنبيه: اقتراب موعد التجديد' : 'تنبيه انتهاء الصلاحية'}
          </h4>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <TimeUnit label="يوم" value={timeLeft.days} />
        <TimeSeparator />
        <TimeUnit label="ساعة" value={timeLeft.hours} />
        <TimeSeparator />
        <TimeUnit label="دقيقة" value={timeLeft.minutes} />
        <TimeSeparator />
        <TimeUnit label="ثانية" value={timeLeft.seconds} color={timeLeft.isWarning ? "text-red-500" : "text-indigo-500"} />
      </div>
    </motion.div>
  );
}

function TimeUnit({ label, value, color = "text-slate-900 dark:text-white", size = "text-xl" }: { label: string; value: number; color?: string; size?: string }) {
  return (
    <div className="flex flex-col items-center min-w-[30px]">
      <span className={`${size} font-black ${color} font-sans leading-none tabular-nums`}>
        {value.toString().padStart(2, '0')}
      </span>
      <span className="text-[8px] font-black text-slate-500 mt-1 uppercase font-sans tracking-tighter">{label}</span>
    </div>
  );
}

function TimeSeparator() {
  return <div className="text-xl font-black text-slate-200 dark:text-slate-800 pb-4">:</div>;
}
