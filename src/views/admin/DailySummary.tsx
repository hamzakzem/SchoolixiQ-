import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, onSnapshot, getAggregateFromServer, sum } from 'firebase/firestore';
import { useAuth } from '../../lib/AuthContext';
import { useLanguage } from '../../lib/LanguageContext';
import { motion } from 'motion/react';
import { Users, UserX, Wallet, AlertTriangle, AlertCircle, TrendingDown, Bell, CheckCircle2 } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

export default function DailySummary() {
  const { profile, schoolData } = useAuth();
  const { t, isRtl } = useLanguage();
  const perms = schoolData?.packagePermissions || profile?.permissions;
  const hasDailySummary = perms && typeof perms === "object" && !Array.isArray(perms) ? perms.daily_summary !== false : true;

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    presentToday: 0,
    absentToday: 0,
    collectedToday: 0,
    delayedTuition: 0,
    lowInventory: 0,
    delayedCount: 0
  });

  useEffect(() => {
    if (!profile?.schoolId || !hasDailySummary) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const today = new Date();
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);
        const todayStr = today.toISOString().split('T')[0];

        // 1. Attendance Today
        const attendanceQ = query(
          collection(db, 'attendance'),
          where('schoolId', '==', profile.schoolId),
          where('date', '==', todayStr)
        );
        
        // 2. Payments Today
        const paymentsQ = query(
          collection(db, 'payments'),
          where('schoolId', '==', profile.schoolId),
          where('createdAt', '>=', Timestamp.fromDate(startOfDay)),
          where('createdAt', '<=', Timestamp.fromDate(endOfDay))
        );

        // 3. Delayed Installments
        const installmentsQ = query(
          collection(db, 'installments'),
          where('schoolId', '==', profile.schoolId),
          where('status', 'in', ['pending', 'partially_paid'])
        );

        // 4. Low Inventory (Using single query per typical usage, filtering < 5 client side if needed, or get all and filter to save index requirements)
        const inventoryQ = query(
          collection(db, 'inventory'),
          where('schoolId', '==', profile.schoolId)
        );

        const [attSnap, paySnap, instSnap, invSnap] = await Promise.all([
          getDocs(attendanceQ),
          getDocs(paymentsQ),
          getDocs(installmentsQ),
          getDocs(inventoryQ)
        ]);

        let present = 0;
        let absent = 0;
        attSnap.docs.forEach(doc => {
          const records = doc.data().records || {};
          Object.values(records).forEach(status => {
            if (status === 'present') present++;
            else if (status === 'absent' || status === 'late') absent++;
          });
        });

        let collected = 0;
        paySnap.docs.forEach(doc => {
          const amount = Number(doc.data().amount) || 0;
          collected += amount;
        });

        let delayedTotal = 0;
        let delayedCount = 0;
        instSnap.docs.forEach(doc => {
          const data = doc.data();
          if (data.status !== 'paid' && data.dueDate) {
            if (new Date(data.dueDate) < startOfDay) {
              delayedTotal += Number(data.amount) || 0;
              delayedCount++;
            }
          }
        });

        let lowStock = 0;
        invSnap.docs.forEach(doc => {
          const qty = Number(doc.data().quantity) || 0;
          if (qty < 5) lowStock++;
        });

        setStats({
          presentToday: present,
          absentToday: absent,
          collectedToday: collected,
          delayedTuition: delayedTotal,
          lowInventory: lowStock,
          delayedCount
        });
      } catch (err) {
        console.error('Error fetching daily summary:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile, hasDailySummary]);

  if (!hasDailySummary) return null;

  const totalStudents = stats.presentToday + stats.absentToday;
  const absenceRate = totalStudents > 0 ? (stats.absentToday / totalStudents) * 100 : 0;
  
  const alerts = [];
  if (absenceRate > 15) {
    alerts.push({
      type: 'absence',
      text: isRtl ? `نسبة الغياب اليوم مرتفعة وتجاوزت ١٥٪ (${Math.round(absenceRate)}٪)` : `High absence rate today: ${Math.round(absenceRate)}%`,
      priority: 2
    });
  }
  if (stats.delayedCount > 0) {
    alerts.push({
      type: 'delayed',
      text: isRtl ? `يوجد ${stats.delayedCount} أقساط متأخرة تحتاج إلى متابعة.` : `There are ${stats.delayedCount} overdue installments.`,
      priority: 1
    });
  }
  if (stats.lowInventory > 0) {
    alerts.push({
      type: 'inventory',
      text: isRtl ? `هناك ${stats.lowInventory} مواد ذات مخزون منخفض.` : `${stats.lowInventory} inventory items are running low.`,
      priority: 3
    });
  }

  alerts.sort((a, b) => a.priority - b.priority);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 mb-8" dir={isRtl ? 'rtl' : 'ltr'}>
      <div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-white font-display mb-2 flex items-center gap-2">
          {isRtl ? 'ملخص المدرسة اليوم' : 'Daily School Summary'}
        </h2>
        <p className="text-sm text-slate-500 font-medium">
          {isRtl ? 'نظرة شاملة ومباشرة على أداء المدرسة لهذا اليوم' : 'A quick overview of school performance today'}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Present */}
        <div className="p-5 rounded-[1.5rem] bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0">
              <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{isRtl ? 'حضور الطلاب' : 'Present'}</span>
          </div>
          <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{loading ? '-' : stats.presentToday || 0}</span>
        </div>

        {/* Absent */}
        <div className="p-5 rounded-[1.5rem] bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center shrink-0">
              <UserX size={16} className="text-rose-600 dark:text-rose-400" />
            </div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{isRtl ? 'غياب الطلاب' : 'Absent'}</span>
          </div>
          <span className="text-3xl font-black text-rose-600 dark:text-rose-400">{loading ? '-' : stats.absentToday || 0}</span>
        </div>

        {/* Collected Today */}
        <div className="p-5 rounded-[1.5rem] bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0">
              <Wallet size={16} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{isRtl ? 'المُحصل اليوم' : 'Collected'}</span>
          </div>
          <p className="flex items-baseline gap-1">
            <span className="text-2xl lg:text-3xl font-black text-indigo-600 dark:text-indigo-400 truncate">
              {loading ? '-' : stats.collectedToday.toLocaleString() || 0}
            </span>
            <span className="text-[10px] text-slate-400 shrink-0">{t('iqd')}</span>
          </p>
        </div>

        {/* Delayed Amount */}
        <div className="p-5 rounded-[1.5rem] bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 flex flex-col justify-center col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center shrink-0">
              <TrendingDown size={16} className="text-red-600 dark:text-red-400" />
            </div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{isRtl ? 'المتأخرات' : 'Arrears'}</span>
          </div>
          <p className="flex items-baseline gap-1">
            <span className="text-2xl lg:text-3xl font-black text-red-600 dark:text-red-400 truncate">
              {loading ? '-' : stats.delayedTuition.toLocaleString() || 0}
            </span>
            <span className="text-[10px] text-slate-400 shrink-0">{t('iqd')}</span>
          </p>
        </div>

        {/* Low Stock */}
        <div className="p-5 rounded-[1.5rem] bg-orange-50/50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 flex flex-col justify-center col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center shrink-0">
              <AlertTriangle size={16} className="text-orange-600 dark:text-orange-400" />
            </div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{isRtl ? 'مخزون منخفض' : 'Low Stock'}</span>
          </div>
          <span className="text-3xl font-black text-orange-600 dark:text-orange-400">{loading ? '-' : stats.lowInventory || 0}</span>
        </div>
      </div>

      {!loading && alerts.length > 0 && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-sm mt-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={18} className="text-slate-400 animate-bounce" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              {isRtl ? 'ما يحتاج انتباهك اليوم' : 'Needs Your Attention Today'}
            </h3>
          </div>
          <div className="space-y-3">
            {alerts.slice(0, 3).map((alert, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                <div className={`w-2 h-2 rounded-full shrink-0 ${alert.type === 'absence' ? 'bg-rose-500' : alert.type === 'delayed' ? 'bg-red-500' : 'bg-orange-500'}`}></div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {alert.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
