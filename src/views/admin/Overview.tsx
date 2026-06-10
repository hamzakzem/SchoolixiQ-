import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, onSnapshot, doc, updateDoc, getCountFromServer, getAggregateFromServer, sum, limit, orderBy } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { useAuth } from '../../lib/AuthContext';
import { Users, UserRound, BookOpen, Wallet, ShoppingBag, Trash2, Settings2, MapPin, ExternalLink, Edit2, Building2, GraduationCap, Clock, Map } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { AnimatedCounter } from '../../components/ui/AnimatedCounter';
import { toast } from 'react-hot-toast';

import { useLanguage } from '../../lib/LanguageContext';
import DailySummary from './DailySummary';
import SchoolHealthIndicators from '../../components/SchoolHealthIndicators';

const translateSchoolValue = (value: string, isRtl: boolean): string => {
  if (!value) return isRtl ? 'غير محدد' : 'Not specified';
  if (isRtl) return value; // keep original Arabic

  const mapping: { [key: string]: string } = {
    // Stages
    'روضة': 'Kindergarten',
    'ابتدائي': 'Primary',
    'متوسطة': 'Middle School',
    'اعدادية': 'High School',
    'ثانوي': 'Secondary School',
    
    // Shifts
    'صباحي': 'Morning Shift',
    'مسائي': 'Evening Shift',
    'مزدوج': 'Double Shift',
    'مدمج': 'Merged Shift',
    
    // Gender
    'مختلطة': 'Co-educational',
    'بنات فقط': 'Girls Only',
    'ذكور فقط': 'Boys Only',
    'بنين فقط': 'Boys Only',
    'اولاد فقط': 'Boys Only',

    // Governorates
    'بغداد': 'Baghdad',
    'البصرة': 'Basra',
    'نينوى': 'Nineveh',
    'أربيل': 'Erbil',
    'النجف': 'Najaf',
    'ذي قار': 'Dhi Qar',
    'كركوك': 'Kirkuk',
    'الأنبار': 'Anbar',
    'ديالى': 'Diyala',
    'المثنى': 'Muthanna',
    'القادسية': 'Qadisiyah',
    'ميسان': 'Maysan',
    'واسط': 'Wasit',
    'صلاح الدين': 'Salah al-Din',
    'دهوك': 'Duhok',
    'السليمانية': 'Sulaymaniyah',
    'بابل': 'Babylon',
    'كربلاء': 'Karbala',
    'حلبجة': 'Halabja',

    // Directorates
    'مديرية الكرخ الاولى': 'Karkh 1st Directorate',
    'مديرية الكرخ الثانية': 'Karkh 2nd Directorate',
    'مديرية الكرخ الثالثه': 'Karkh 3rd Directorate',
    'مديرية الرصافة الاولى': 'Rusafa 1st Directorate',
    'مديرية الرصافة الثانية': 'Rusafa 2nd Directorate',
    'مديرية الرصافة الثالثه': 'Rusafa 3rd Directorate',
    'أخرى / مديرية أخرى': 'Other Directorate',
  };

  // Check direct fit
  if (mapping[value]) return mapping[value];

  // Try sub-string replacement for other directorates or patterns
  for (const [key, val] of Object.entries(mapping)) {
    if (value.includes(key)) {
      return value.replace(key, val);
    }
  }

  return value;
};

export default function Overview({ setActiveTab }: { setActiveTab?: (tab: string) => void }) {
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

  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [newMapsUrl, setNewMapsUrl] = useState('');
  const [newGovernorate, setNewGovernorate] = useState('');
  const [newDirectorate, setNewDirectorate] = useState('');
  const [newStage, setNewStage] = useState('');
  const [newShift, setNewShift] = useState('');
  const [newGenderType, setNewGenderType] = useState('');
  const [newApproximateStudents, setNewApproximateStudents] = useState('');
  const [savingLocation, setSavingLocation] = useState(false);

  useEffect(() => {
    if (!profile?.schoolId) return;

    const fetchData = async () => {
      if (!profile?.schoolId) return;

      // Fetch school adjustment and base info (realtime is fine for this single document)
      const schoolRef = doc(db, 'schools', profile.schoolId);
      const unsubscribeSchool = onSnapshot(schoolRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setSchoolInfo({ id: doc.id, ...data });
          setNewAddress(data.address || '');
          setNewMapsUrl(data.googleMapsUrl || '');
          setNewGovernorate(data.governorate || '');
          setNewDirectorate(data.directorate || '');
          setNewStage(data.stage || '');
          setNewShift(data.shift || '');
          setNewGenderType(data.genderType || '');
          setNewApproximateStudents(data.approximateStudents || '');
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

  const handleSaveLocation = async () => {
    if (!profile?.schoolId) return;
    setSavingLocation(true);
    try {
      await updateDoc(doc(db, 'schools', profile.schoolId), {
        address: newAddress.trim(),
        googleMapsUrl: newMapsUrl.trim(),
        governorate: newGovernorate.trim(),
        directorate: newDirectorate.trim(),
        stage: newStage.trim(),
        shift: newShift.trim(),
        genderType: newGenderType.trim(),
        approximateStudents: newApproximateStudents.trim()
      });
      setShowLocationModal(false);
      toast.success(isRtl ? 'تم تحديث مدرسة والعنوان وجميع بيانات السجل بنجاح' : 'School details, address and registry synced successfully');
    } catch (err) {
      toast.error(isRtl ? 'فشل تحديث معلومات مدرسة والسجل' : 'Failed to update school registry details');
    } finally {
      setSavingLocation(false);
    }
  };

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
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500" dir={isRtl ? 'rtl' : 'ltr'}>
      <DailySummary onGoToAttendance={() => setActiveTab?.('attendance')} />

      <SchoolHealthIndicators onNavigate={setActiveTab} />

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3 px-1">
          <h2 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">
            {isRtl ? 'مؤشرات المدرسة' : 'School Metrics'}
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
          <StatCard
            title={t('totalStudents')}
            value={stats.students}
            icon={Users}
            tone="blue"
            emptyHint={isRtl ? 'لا يوجد طلاب بعد' : 'No students yet'}
            action={() => setActiveTab?.('students_edit')}
          />
          <StatCard
            title={t('tuitionRevenue')}
            value={(stats.calculatedTuition + stats.tuitionAdjustment).toLocaleString()}
            icon={Wallet}
            tone="emerald"
            unit={t('iqd')}
            isNumericDisplay
            emptyHint={isRtl ? 'لا أرصدة مسجّلة' : 'No balances recorded'}
            action={() => {
              setTuitionAdjustValue(stats.tuitionAdjustment);
              setShowTuitionModal(true);
            }}
          />
          <StatCard
            title={t('totalStaff')}
            value={stats.staff}
            icon={UserRound}
            tone="slate"
            emptyHint={isRtl ? 'لا موظفين بعد' : 'No staff yet'}
            action={() => setActiveTab?.('staff')}
          />
          <StatCard
            title={t('storeSales')}
            value={(stats.calculatedSales + stats.adjustment).toLocaleString()}
            icon={ShoppingBag}
            tone="orange"
            unit={t('iqd')}
            isNumericDisplay
            emptyHint={isRtl ? 'لا مبيعات بعد' : 'No sales yet'}
            action={() => {
              setAdjustValue(stats.adjustment);
              setShowAdjustModal(true);
            }}
          />
        </div>
      </section>

      {schoolInfo && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden"
        >
          <div className="h-1 bg-gradient-to-l from-amber-400 via-amber-500/80 to-slate-900" />
          <div className="p-5 md:p-7">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5 pb-5 border-b border-slate-100 dark:border-slate-800/80 mb-5">
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-slate-900 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-amber-400 border border-slate-800 dark:border-slate-700 shadow-sm shrink-0">
                  <Building2 size={26} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    {isRtl ? 'بطاقة السجل الرسمي للمدرسة' : 'Official School Registry Card'}
                  </p>
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white mt-1 font-display truncate">
                    {schoolInfo.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
                      {isRtl ? 'حساب نشط' : 'Active Account'}
                    </span>
                    {schoolInfo.governorate ? (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {translateSchoolValue(schoolInfo.governorate, isRtl)}
                      </span>
                    ) : null}
                    {schoolInfo.stage ? (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {translateSchoolValue(schoolInfo.stage, isRtl)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 justify-start lg:justify-end shrink-0">
                <button
                  onClick={() => setShowLocationModal(true)}
                  className="px-4 py-2.5 bg-white hover:bg-slate-50 dark:bg-slate-800/40 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                >
                  <Edit2 size={14} />
                  <span>{isRtl ? 'تحديث السجل' : 'Update Profile'}</span>
                </button>
                {schoolInfo.googleMapsUrl && (
                  <a
                    href={schoolInfo.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                  >
                    <MapPin size={14} />
                    <span>{isRtl ? 'الموقع على الخريطة' : 'View on Map'}</span>
                  </a>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              <SchoolInfoChip
                icon={MapPin}
                iconClass="text-rose-500"
                label={isRtl ? 'الموقع والعنوان' : 'Address'}
                value={schoolInfo.address || (isRtl ? 'غير محدد' : 'Not specified')}
              />
              <SchoolInfoChip
                icon={Map}
                iconClass="text-blue-500"
                label={isRtl ? 'المحافظة' : 'Governorate'}
                value={translateSchoolValue(schoolInfo.governorate, isRtl)}
              />
              <SchoolInfoChip
                icon={Building2}
                iconClass="text-indigo-500"
                label={isRtl ? 'المديرية' : 'Directorate'}
                value={translateSchoolValue(schoolInfo.directorate, isRtl)}
              />
              <SchoolInfoChip
                icon={GraduationCap}
                iconClass="text-emerald-500"
                label={isRtl ? 'المرحلة الدراسية' : 'School Stage'}
                value={translateSchoolValue(schoolInfo.stage, isRtl)}
              />
              <SchoolInfoChip
                icon={Clock}
                iconClass="text-amber-500"
                label={isRtl ? 'دوام المدرسة' : 'School Shift'}
                value={translateSchoolValue(schoolInfo.shift, isRtl)}
              />
              <SchoolInfoChip
                icon={Users}
                iconClass="text-purple-500"
                label={isRtl ? 'فئة الدراسة' : 'Study Type'}
                value={translateSchoolValue(schoolInfo.genderType, isRtl)}
              />
              <SchoolInfoChip
                icon={Users}
                iconClass="text-cyan-500"
                label={isRtl ? 'العدد التقريبي' : 'Approx. Students'}
                value={
                  schoolInfo.approximateStudents
                    ? `${schoolInfo.approximateStudents} ${isRtl ? 'طالب' : 'students'}`
                    : isRtl
                      ? 'غير محدد'
                      : 'Not specified'
                }
                className="col-span-2 md:col-span-1"
              />
            </div>
          </div>
        </motion.div>
      )}

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

        {showLocationModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] w-full max-w-lg shadow-2xl p-6 md:p-8 relative max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center gap-4 mb-4 text-indigo-600 dark:text-indigo-400 shrink-0">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl flex items-center justify-center border border-indigo-100 dark:border-indigo-900/30">
                  <MapPin size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{isRtl ? 'تحديث السجل وبيانات المدرسة' : 'Update School Registry Profile'}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                    {schoolInfo?.name}
                  </p>
                </div>
              </div>

              <div className="space-y-4 overflow-y-auto pr-1 flex-1 py-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Governorate */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 px-1">{isRtl ? 'المحافظة' : 'Governorate'}</label>
                    <select
                      value={newGovernorate}
                      onChange={(e) => setNewGovernorate(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white transition-all outline-none"
                    >
                      <option value="" disabled>{isRtl ? 'اختر المحافظة...' : 'Select Governorate...'}</option>
                      <option value="بغداد">بغداد</option>
                      <option value="البصرة">البصرة</option>
                      <option value="نينوى">نينوى</option>
                      <option value="أربيل">أربيل</option>
                      <option value="النجف">النجف</option>
                      <option value="ذي قار">ذي قار</option>
                      <option value="كركوك">كركوك</option>
                      <option value="الأنبار">الأنبار</option>
                      <option value="ديالى">ديالى</option>
                      <option value="المثنى">المثنى</option>
                      <option value="القادسية">القادسية (الديوانية)</option>
                      <option value="ميسان">ميسان</option>
                      <option value="واسط">واسط</option>
                      <option value="صلاح الدين">صلاح الدين</option>
                      <option value="دهوك">دهوك</option>
                      <option value="السليمانية">السليمانية</option>
                      <option value="بابل">بابل</option>
                      <option value="كربلاء">كربلاء</option>
                      <option value="حلبجة">حلبجة</option>
                    </select>
                  </div>

                  {/* Directorate */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 px-1">{isRtl ? 'المديرية' : 'Directorate'}</label>
                    <input
                      type="text"
                      value={newDirectorate}
                      onChange={(e) => setNewDirectorate(e.target.value)}
                      placeholder={isRtl ? 'مثال: مديرية الكرخ الاولى' : 'e.g. Karkh 1st Directorate'}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white transition-all outline-none"
                    />
                  </div>

                  {/* School Stage */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 px-1">{isRtl ? 'المرحلة الدراسية' : 'School Stage'}</label>
                    <select
                      value={newStage}
                      onChange={(e) => setNewStage(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white transition-all outline-none"
                    >
                      <option value="" disabled>{isRtl ? 'اختر المرحلة...' : 'Select Stage...'}</option>
                      <option value="روضة">روضة</option>
                      <option value="ابتدائي">ابتدائي</option>
                      <option value="متوسطة">متوسطة</option>
                      <option value="اعدادية">اعدادية</option>
                    </select>
                  </div>

                  {/* Shift */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 px-1">{isRtl ? 'وقت الدوام' : 'School Shift'}</label>
                    <select
                      value={newShift}
                      onChange={(e) => setNewShift(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white transition-all outline-none"
                    >
                      <option value="" disabled>{isRtl ? 'اختر وقت الدوام...' : 'Select Shift...'}</option>
                      <option value="صباحي">صباحي</option>
                      <option value="مسائي">مسائي</option>
                      <option value="مدمج">مدمج</option>
                    </select>
                  </div>

                  {/* Gender Category */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 px-1">{isRtl ? 'نوع فئة الدراسة' : 'Study Gender Type'}</label>
                    <select
                      value={newGenderType}
                      onChange={(e) => setNewGenderType(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white transition-all outline-none"
                    >
                      <option value="" disabled>{isRtl ? 'اختر نوع الدراسة...' : 'Select Gender Type...'}</option>
                      <option value="مختلطة">مختلطة</option>
                      <option value="بنات فقط">بنات فقط</option>
                      <option value="اولاد فقط">اولاد فقط</option>
                    </select>
                  </div>

                  {/* Approximate Students */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 px-1">{isRtl ? 'العدد التقريبي للطلاب' : 'Approximate Students'}</label>
                    <input
                      type="number"
                      min="1"
                      value={newApproximateStudents}
                      onChange={(e) => setNewApproximateStudents(e.target.value)}
                      placeholder="e.g. 500"
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white transition-all outline-none"
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 px-1">{isRtl ? 'العنوان المدرسي التفصيلي' : 'School Detailed Address'}</label>
                  <input 
                    type="text"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder={isRtl ? 'مثال: بغداد، الكرادة، قرب ساحة التحري' : 'e.g. Baghdad, Karrada'}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white transition-all outline-none"
                  />
                </div>

                {/* Maps URL */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 px-1">{isRtl ? 'رابط الموقع الجغرافي (Google Maps Link)' : 'Google Maps Location URL'}</label>
                  <input 
                    type="url"
                    value={newMapsUrl}
                    onChange={(e) => setNewMapsUrl(e.target.value)}
                    placeholder="https://maps.google.com/..."
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 font-mono text-xs text-slate-900 dark:text-white transition-all outline-none"
                  />
                  <p className="mt-1 text-[9px] text-slate-400 dark:text-slate-500 leading-normal font-bold px-1">
                    * {isRtl ? 'انسخ الرابط التفصيلي من خرائط جوجل والصقه هنا لمزامنة فورية.' : 'Copy from google maps and paste here.'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 mt-4 shrink-0 pt-3 border-t border-slate-100 dark:border-slate-850">
                <button 
                  onClick={handleSaveLocation}
                  disabled={savingLocation}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-600/10 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {savingLocation ? (isRtl ? 'جاري الحفظ والمزامنة...' : 'Saving & Syncing...') : (isRtl ? 'حفظ التغييرات ومزامنتها' : 'Save & Sync Changes')}
                </button>
                <button 
                  onClick={() => setShowLocationModal(false)}
                  className="w-full py-3 bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold transition-all active:scale-95 cursor-pointer"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-white dark:bg-slate-900 p-5 md:p-7 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
          <h3 className="text-lg font-black text-slate-800 dark:text-white mb-6 font-display">{t('attendanceStats')}</h3>
          <div className="h-[300px] w-full" style={{ minWidth: 0 }}>
            <ResponsiveContainer width="99%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: 'var(--chart-text)', fontWeight: 600 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: 'var(--chart-text)' }} 
                />
                <Tooltip 
                   contentStyle={{ 
                     borderRadius: '20px', 
                     border: '1px solid var(--chart-tooltip-border)', 
                     backgroundColor: 'var(--chart-tooltip-bg)',
                     color: 'var(--chart-tooltip-text)',
                     boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.15), 0 8px 10px -6px rgb(0 0 0 / 0.15)', 
                     direction: isRtl ? 'rtl' : 'ltr', 
                     padding: '12px' 
                   }}
                   itemStyle={{ color: 'var(--chart-tooltip-text)' }}
                   labelStyle={{ color: 'var(--chart-text)', fontWeight: 'bold' }}
                   cursor={{ fill: 'var(--chart-cursor)' }}
                />
                <Bar dataKey="attendance" fill="#3b82f6" radius={[12, 12, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 md:p-7 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-black text-slate-800 dark:text-white font-display">{t('recentAnnouncements')}</h3>
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

const STAT_TONE_STYLES: Record<
  string,
  { badge: string; icon: string; ring: string }
> = {
  blue: {
    badge: 'bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/40',
    icon: 'text-blue-600 dark:text-blue-400',
    ring: 'focus-visible:ring-blue-300',
  },
  emerald: {
    badge: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/40',
    icon: 'text-emerald-600 dark:text-emerald-400',
    ring: 'focus-visible:ring-emerald-300',
  },
  slate: {
    badge: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
    icon: 'text-slate-600 dark:text-slate-300',
    ring: 'focus-visible:ring-slate-300',
  },
  orange: {
    badge: 'bg-orange-50 dark:bg-orange-950/30 border-orange-100 dark:border-orange-900/40',
    icon: 'text-orange-600 dark:text-orange-400',
    ring: 'focus-visible:ring-orange-300',
  },
};

function StatCard({
  title,
  value,
  icon: Icon,
  tone,
  unit = '',
  emptyHint,
  isNumericDisplay,
  action,
}: {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tone: keyof typeof STAT_TONE_STYLES;
  unit?: string;
  emptyHint?: string;
  isNumericDisplay?: boolean;
  action?: () => void;
}) {
  const styles = STAT_TONE_STYLES[tone] || STAT_TONE_STYLES.slate;
  const numericValue = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
  const isZero = !Number.isNaN(numericValue) && numericValue === 0;
  const Wrapper = action ? 'button' : 'div';
  const showAnimatedNumber = isNumericDisplay && typeof value === 'number' && !Number.isNaN(value);

  return (
    <Wrapper
      type={action ? 'button' : undefined}
      onClick={action}
      className={`sx-card w-full p-4 md:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm text-right transition-all ${
        action
          ? `cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${styles.ring}`
          : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-3">
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              {title}
            </p>
            {action ? <Settings2 size={12} className="text-slate-300 shrink-0" /> : null}
          </div>
          <p
            className={`text-2xl md:text-3xl font-black tabular-nums ${
              isZero ? 'text-slate-300 dark:text-slate-600' : 'text-slate-900 dark:text-white'
            }`}
          >
            {showAnimatedNumber ? (
              <AnimatedCounter value={value as number} />
            ) : (
              value
            )}
            {unit ? (
              <span className="text-[10px] font-bold text-slate-400 ms-1.5">{unit}</span>
            ) : null}
          </p>
          {isZero && emptyHint ? (
            <p className="text-[10px] font-bold text-slate-400 mt-2">{emptyHint}</p>
          ) : null}
        </div>
        <div
          className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${styles.badge}`}
        >
          <Icon size={20} className={styles.icon} />
        </div>
      </div>
    </Wrapper>
  );
}

function SchoolInfoChip({
  icon: Icon,
  iconClass,
  label,
  value,
  className = '',
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconClass: string;
  label: string;
  value: string;
  className?: string;
}) {
  const isEmpty = !value || value === 'غير محدد' || value === 'Not specified';

  return (
    <div
      className={`p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/20 hover:border-slate-200 dark:hover:border-slate-700 transition-colors ${className}`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <Icon size={14} className={iconClass} />
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p
        className={`text-sm font-bold truncate ${isEmpty ? 'text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}
        title={value}
      >
        {value}
      </p>
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
