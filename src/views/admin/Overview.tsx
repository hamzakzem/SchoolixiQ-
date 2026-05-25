import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, onSnapshot, doc, updateDoc, getCountFromServer, getAggregateFromServer, sum, limit, orderBy } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { useAuth } from '../../lib/AuthContext';
import { Users, UserRound, BookOpen, Wallet, ShoppingBag, Trash2, Settings2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';

import { useLanguage } from '../../lib/LanguageContext';

export default function Overview() {
  const { profile } = useAuth();
  const { t, isRtl } = useLanguage();

  const chartData = [
    { name: t('sun'), attendance: 95 },
    { name: t('mon'), attendance: 88 },
    { name: t('tue'), attendance: 92 },
    { name: t('wed'), attendance: 90 },
    { name: t('thu'), attendance: 85 },
  ];

  const [stats, setStats] = useState({
    students: 0,
    staff: 0,
    parents: 0,
    tuition: 0,
    calculatedTuition: 0,
    tuitionAdjustment: 0,
    avgGrade: '84%',
    sales: 0,
    calculatedSales: 0,
    adjustment: 0
  });
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showTuitionModal, setShowTuitionModal] = useState(false);
  const [adjustValue, setAdjustValue] = useState(0);
  const [tuitionAdjustValue, setTuitionAdjustValue] = useState(0);
  const [recentAnnouncements, setRecentAnnouncements] = useState<any[]>([]);

  useEffect(() => {
    if (!profile?.schoolId) return;

    const fetchData = async () => {
      if (!profile?.schoolId) return;

      // Fetch school adjustment (realtime is fine for this single document)
      const schoolRef = doc(db, 'schools', profile.schoolId);
      const unsubscribeSchool = onSnapshot(schoolRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setStats(prev => ({ 
            ...prev, 
            adjustment: data.salesAdjustment || 0,
            tuitionAdjustment: data.tuitionAdjustment || 0
          }));
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `schools/${profile?.schoolId}`);
      });

      try {
        // Build queries
        const studentsQ = query(collection(db, 'students'), where('schoolId', '==', profile.schoolId));
        const staffQ = query(collection(db, 'users'), where('schoolId', '==', profile.schoolId), where('role', 'in', ['admin', 'teacher', 'staff', 'assistant']));
        const parentsQ = query(collection(db, 'users'), where('schoolId', '==', profile.schoolId), where('role', '==', 'parent'));
        const ordersQ = query(collection(db, 'orders'), where('schoolId', '==', profile.schoolId), where('status', 'in', ['completed', 'delivered']));
        const annQ = query(collection(db, 'announcements'), where('schoolId', '==', profile.schoolId), orderBy('createdAt', 'desc'), limit(3));

        const [
          studentsCountSnap,
          studentsSumSnap,
          staffCountSnap,
          parentsCountSnap,
          ordersSumSnap,
          annSnap
        ] = await Promise.all([
          getCountFromServer(studentsQ),
          getAggregateFromServer(studentsQ, { totalTuition: sum('tuitionBalance') }),
          getCountFromServer(staffQ),
          getCountFromServer(parentsQ),
          getAggregateFromServer(ordersQ, { totalSales: sum('totalPrice'), totalSalesB: sum('total') }),
          getDocs(annQ)
        ]);

        const announcements = annSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        setStats(prev => ({
          ...prev,
          students: studentsCountSnap.data().count,
          calculatedTuition: studentsSumSnap.data().totalTuition || 0,
          staff: staffCountSnap.data().count,
          parents: parentsCountSnap.data().count,
          calculatedSales: (ordersSumSnap.data().totalSales || 0) + (ordersSumSnap.data().totalSalesB || 0),
        }));
        setRecentAnnouncements(announcements);

      } catch (error) {
        console.error("Error fetching overview data:", error);
      }

      return () => {
        unsubscribeSchool();
      };
    };

    const cleanup = fetchData();
    return () => {
      cleanup.then(unsub => {
        if (unsub) unsub();
      });
    };
  }, [profile]);

  const handleUpdateAdjustment = async () => {
    if (!profile?.schoolId) return;
    try {
      await updateDoc(doc(db, 'schools', profile.schoolId), {
        salesAdjustment: adjustValue
      });
      setShowAdjustModal(false);
      toast.success(t('success'));
    } catch (error) {
      toast.error(t('failedToUpdate'));
    }
  };

  const handleUpdateTuitionAdjustment = async () => {
    if (!profile?.schoolId) return;
    try {
      await updateDoc(doc(db, 'schools', profile.schoolId), {
        tuitionAdjustment: tuitionAdjustValue
      });
      setShowTuitionModal(false);
      toast.success(t('success'));
    } catch (error) {
      toast.error(t('failedToUpdate'));
    }
  };

  const handleResetSales = async () => {
    if (!profile?.schoolId) return;
    try {
      // Set adjustment to -calculatedSales to make total 0
      await updateDoc(doc(db, 'schools', profile.schoolId), {
        salesAdjustment: -stats.calculatedSales
      });
      setShowAdjustModal(false);
      toast.success(t('salesResetSuccess'));
    } catch (error) {
      toast.error(t('resetFailed'));
    }
  };

  const handleResetTuition = async () => {
    if (!profile?.schoolId) return;
    try {
      // Set adjustment to -calculatedTuition to make total 0
      await updateDoc(doc(db, 'schools', profile.schoolId), {
        tuitionAdjustment: -stats.calculatedTuition
      });
      setShowTuitionModal(false);
      toast.success(t('tuitionResetSuccess'));
    } catch (error) {
      toast.error(t('resetFailed'));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title={t('totalStudents')} value={stats.students} icon={Users} color="border-blue-200 bg-blue-50/50" iconColor="text-blue-600" />
        <StatCard 
          title={t('tuitionRevenue')} 
          value={(stats.calculatedTuition + stats.tuitionAdjustment).toLocaleString()} 
          icon={Wallet} 
          color="border-emerald-200 bg-emerald-50/50" 
          iconColor="text-emerald-600" 
          unit={t('iqd')} 
          action={() => {
            setTuitionAdjustValue(stats.tuitionAdjustment);
            setShowTuitionModal(true);
          }}
        />
        <StatCard title={t('totalStaff')} value={stats.staff} icon={UserRound} color="border-slate-200 bg-white" iconColor="text-slate-600" />
        <StatCard 
          title={t('storeSales')} 
          value={(stats.calculatedSales + stats.adjustment).toLocaleString()} 
          icon={ShoppingBag} 
          color="border-orange-200 bg-orange-50/50" 
          iconColor="text-orange-600" 
          unit={t('iqd')}
          action={() => {
            setAdjustValue(stats.adjustment);
            setShowAdjustModal(true);
          }}
        />
      </div>

      <AnimatePresence>
        {showAdjustModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl p-8 border border-slate-200"
            >
              <div className="flex items-center gap-4 mb-6 text-orange-600">
                <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center">
                  <ShoppingBag size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{t('salesDisplayMethod')}</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest leading-relaxed">{t('adjustmentValue')}</p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('adjustmentValue')} ({t('iqd')})</label>
                  <input 
                    type="number"
                    value={Number.isNaN(adjustValue) ? '' : adjustValue}
                    onChange={e => {
                      const val = e.target.value;
                      setAdjustValue(val === '' ? 0 : Number(val) || 0);
                    }}
                    className="w-full px-4 py-4 rounded-2xl border-2 border-slate-100 focus:border-orange-500 outline-none font-black text-2xl text-orange-600 font-mono"
                    placeholder="0"
                  />
                  <p className="mt-2 text-[10px] text-slate-400 font-bold leading-relaxed px-1">
                    * {isRtl ? 'الحساب الحالي' : 'Current Calculation'}: {stats.calculatedSales.toLocaleString()} ({isRtl ? 'تلقائي' : 'Auto'}) + {adjustValue.toLocaleString()} ({isRtl ? 'تسوية' : 'Adjustment'}) = {(stats.calculatedSales + adjustValue).toLocaleString()}
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={handleUpdateAdjustment}
                    className="w-full py-4 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-900/10 active:scale-95"
                  >
                    {t('update')}
                  </button>
                  <button 
                    onClick={handleResetSales}
                    className="w-full py-4 bg-rose-50 text-rose-600 rounded-2xl font-bold hover:bg-rose-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Trash2 size={18} />
                    {t('resetSales')}
                  </button>
                  <button 
                    onClick={() => setShowAdjustModal(false)}
                    className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all active:scale-95"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showTuitionModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl p-8 border border-slate-200"
            >
              <div className="flex items-center gap-4 mb-6 text-emerald-600">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                  <Wallet size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{t('tuitionRevenue')}</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest leading-relaxed">{t('adjustmentValue')}</p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('adjustmentValue')} ({t('iqd')})</label>
                  <input 
                    type="number"
                    value={Number.isNaN(tuitionAdjustValue) ? '' : tuitionAdjustValue}
                    onChange={e => {
                      const val = e.target.value;
                      setTuitionAdjustValue(val === '' ? 0 : Number(val) || 0);
                    }}
                    className="w-full px-4 py-4 rounded-2xl border-2 border-slate-100 focus:border-emerald-500 outline-none font-black text-2xl text-emerald-600 font-mono"
                    placeholder="0"
                  />
                  <p className="mt-2 text-[10px] text-slate-400 font-bold leading-relaxed px-1">
                    * {isRtl ? 'الحساب الحالي' : 'Current Calculation'}: {stats.calculatedTuition.toLocaleString()} ({isRtl ? 'تلقائي' : 'Auto'}) + {tuitionAdjustValue.toLocaleString()} ({isRtl ? 'تسوية' : 'Adjustment'}) = {(stats.calculatedTuition + tuitionAdjustValue).toLocaleString()}
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={handleUpdateTuitionAdjustment}
                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/10 active:scale-95"
                  >
                    {t('update')}
                  </button>
                  <button 
                    onClick={handleResetTuition}
                    className="w-full py-4 bg-rose-50 text-rose-600 rounded-2xl font-bold hover:bg-rose-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Trash2 size={18} />
                    {t('resetTuition')}
                  </button>
                  <button 
                    onClick={() => setShowTuitionModal(false)}
                    className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all active:scale-95"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-8 font-display">{t('attendanceStats')}</h3>
          <div className="h-[300px] w-full" style={{ minWidth: 0 }}>
            <ResponsiveContainer width="99%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#94a3b8' }} 
                />
                <Tooltip 
                   contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', direction: isRtl ? 'rtl' : 'ltr', padding: '12px' }}
                   cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="attendance" fill="#2563eb" radius={[12, 12, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white font-display">{t('recentAnnouncements')}</h3>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{isRtl ? 'مباشر الآن' : 'Live Now'}</span>
            </div>
          </div>
          <div className="space-y-8">
            {recentAnnouncements.map((ann, idx) => (
              <ActivityItem 
                 key={ann.id}
                 title={ann.title} 
                 desc={ann.content.substring(0, 60) + '...'} 
                 time={ann.createdAt?.seconds ? new Date(ann.createdAt.seconds * 1000).toLocaleDateString() : t('now')} 
                 color={idx === 0 ? "bg-blue-500" : idx === 1 ? "bg-emerald-500" : "bg-orange-500"} 
              />
            ))}
            {recentAnnouncements.length === 0 && (
              <div className="text-center py-10 opacity-50">{t('noAnnouncements')}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, iconColor, unit = '', action }: any) {
  return (
    <div 
      onClick={action}
      className={`p-6 rounded-2xl border shadow-sm flex items-center justify-between transition-all duration-500 transform ${color} dark:bg-slate-900 dark:border-slate-800 ${action ? 'group relative overflow-hidden cursor-pointer hover:scale-105 hover:shadow-2xl' : ''}`}
    >
      {action && (
        <span className="absolute top-0 left-0 z-0 h-32 w-32 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 opacity-0 transition-all duration-500 transform group-hover:scale-[20] group-hover:opacity-75"></span>
      )}
      <div className={`relative z-10 transition-all duration-500 ${action ? 'group-hover:text-white' : ''}`}>
        <div className="flex items-center gap-2">
          <p className={`text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors duration-500 ${action ? 'group-hover:text-white' : ''}`}>{title}</p>
          {action && <Settings2 size={12} className="text-slate-300 transition-colors duration-500 group-hover:text-white" />}
        </div>
        <p className={`text-3xl font-bold text-slate-900 dark:text-white mt-1 transition-colors duration-500 ${action ? 'group-hover:text-white' : ''}`}>
          {value} <span className={`text-xs font-normal text-slate-400 transition-colors duration-500 ${action ? 'group-hover:text-white/80' : ''}`}>{unit}</span>
        </p>
      </div>
      <div className={`relative z-10 w-12 h-12 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center shadow-sm transition-all duration-500 ${iconColor} ${action ? 'group-hover:bg-transparent group-hover:border-white/20 group-hover:text-white' : ''}`}>
        <Icon size={24} />
      </div>
    </div>
  );
}

function ActivityItem({ title, desc, time, color }: any) {
  return (
    <div className="flex gap-4">
      <div className={`w-2 h-2 mt-2 rounded-full shrink-0 ${color}`}></div>
      <div>
        <h4 className="font-bold text-slate-800 dark:text-white text-sm">{title}</h4>
        <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 line-clamp-1">{desc}</p>
        <p className="text-[10px] text-slate-400 italic mt-1">{time}</p>
      </div>
    </div>
  );
}
