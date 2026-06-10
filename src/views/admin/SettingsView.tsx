import React, { useState, useEffect } from 'react';
import { db, storage } from '../../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../lib/AuthContext';
import { toast } from 'react-hot-toast';
import { Save, Building, MapPin, Bell, Eye, EyeOff, ShieldCheck, Settings, Phone, Mail, Upload } from 'lucide-react';
import { motion } from 'motion/react';
import { School } from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import SchoolSubjectsManagement from './SchoolSubjectsManagement';
import { isSchoolSubjectsEnabled } from '../../lib/featureRegistry';

const defaultGovernorates = ["بغداد", "البصرة", "نينوى", "أربيل", "النجف", "ذي قار", "كركوك", "الأنبار", "ديالى", "المثنى", "القادسية (الديوانية)", "القادسية", "ميسان", "واسط", "صلاح الدين", "دهوك", "السليمانية", "بابل", "كربلاء", "حلبجة"];
const defaultDirectorates = [
  "مديرية الكرخ الاولى",
  "مديرية الكرخ الثانية",
  "مديرية الكرخ الثالثه",
  "مديرية الرصافة الاولى",
  "مديرية الرصافة الثانية",
  "مديرية الرصافة الثالثه",
  "أخرى / مديرية أخرى"
];
const defaultStages = ["روضة", "ابتدائي", "متوسطة", "اعدادية"];
const defaultShifts = ["صباحي", "مسائي", "مدمج"];
const defaultGenders = ["مختلطة", "مختلط", "بنات فقط", "بنات", "اولاد فقط", "بنين"];

export default function SettingsView() {
  const { profile, schoolData: contextSchoolData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schoolData, setSchoolData] = useState<School | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  const [showSupport, setShowSupport] = useState(false);
  const [supportInfo, setSupportInfo] = useState({
    supportPhones: ['+964 772 123 4567'],
    supportEmails: ['support@schoolixiq.iq']
  });

  useEffect(() => {
    async function loadSupportInfo() {
      const path = 'system/config';
      try {
        const snap = await getDoc(doc(db, 'system', 'config'));
        if (snap.exists()) {
          const data = snap.data();
          setSupportInfo({
            supportPhones: data.supportPhones || (data.supportPhone ? [data.supportPhone] : ['+964 772 123 4567']),
            supportEmails: data.supportEmails || (data.supportEmail ? [data.supportEmail] : ['support@schoolixiq.iq'])
          });
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, path);
      }
    }
    loadSupportInfo();
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    googleMapsUrl: '',
    showSubscriptionTimer: true,
    notificationsEnabled: true,
    logoUrl: '',
    governorate: '',
    directorate: '',
    stage: '',
    shift: '',
    genderType: '',
    approximateStudents: '',
  });

  useEffect(() => {
    async function loadSettings() {
      if (!profile?.schoolId) {
        setLoading(false);
        return;
      }
      if (hasInitialized) return;

      const path = `schools/${profile.schoolId}`;
      try {
        const snap = await getDoc(doc(db, 'schools', profile.schoolId));
        const snapData = snap.exists() ? snap.data() : null;
        const data = { ...contextSchoolData, ...snapData } as any;

        if (snap.exists() || contextSchoolData) {
          setSchoolData(data);
          setFormData({
            name: data.name || '',
            address: data.address || '',
            googleMapsUrl: data.googleMapsUrl || '',
            logoUrl: data.logoUrl || '',
            showSubscriptionTimer: data.showSubscriptionTimer !== false,
            notificationsEnabled: data.notificationsEnabled !== false,
            governorate: data.governorate || '',
            directorate: data.directorate || '',
            stage: data.educationLevel || data.stage || '',
            shift: data.workingHours || data.shift || '',
            genderType: (data.studyType || data.genderType || '') === 'بنين' ? 'اولاد فقط' : 
                        (data.studyType || data.genderType || '') === 'بنات' ? 'بنات فقط' : 
                        (data.studyType || data.genderType || '') === 'مختلط' ? 'مختلطة' : 
                        (data.studyType || data.genderType || ''),
            approximateStudents: data.estimatedStudents?.toString() || data.approximateStudents || '',
          });
          setHasInitialized(true);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
        toast.error('خطأ في تحميل الإعدادات');
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [profile?.schoolId, contextSchoolData, hasInitialized]);

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن لا يتجاوز 2 ميغابايت');
      return;
    }

    const toastId = toast.loading('جاري رفع الشعار...');
    try {
      const { compressImageToBase64 } = await import('../../lib/image-utils');
      const base64Url = await compressImageToBase64(file, 200, 200, 0.8);
      
      setFormData({ ...formData, logoUrl: base64Url });
      toast.success('تم رفع الشعار بنجاح', { id: toastId });
    } catch (error: any) {
      console.error('Error processing school logo:', error);
      toast.error('فشل معالجة الصورة.', { id: toastId });
    } finally {
      e.target.value = '';
    }
  };

  const handleToggleTimer = async () => {
    const newValue = !formData.showSubscriptionTimer;
    setFormData({ ...formData, showSubscriptionTimer: newValue });
    
    if (profile?.schoolId) {
      try {
        await updateDoc(doc(db, 'schools', profile.schoolId), {
          showSubscriptionTimer: newValue
        });
      } catch (error) {
        setFormData({ ...formData, showSubscriptionTimer: !newValue });
        toast.error('حدث خطأ. يرجى المحاولة مرة أخرى.');
      }
    }
  };

  const handleToggleNotifications = async () => {
    const newValue = !formData.notificationsEnabled;
    setFormData({ ...formData, notificationsEnabled: newValue });
    
    if (profile?.schoolId) {
      try {
        await updateDoc(doc(db, 'schools', profile.schoolId), {
          notificationsEnabled: newValue
        });
      } catch (error) {
        setFormData({ ...formData, notificationsEnabled: !newValue });
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.schoolId) return;
    setSaving(true);
    const path = `schools/${profile.schoolId}`;
    try {
      await updateDoc(doc(db, 'schools', profile.schoolId), {
        name: formData.name,
        address: formData.address,
        googleMapsUrl: formData.googleMapsUrl,
        logoUrl: formData.logoUrl,
        showSubscriptionTimer: formData.showSubscriptionTimer,
        notificationsEnabled: formData.notificationsEnabled,
        governorate: formData.governorate,
        directorate: formData.directorate,
        stage: formData.stage,
        educationLevel: formData.stage,
        shift: formData.shift,
        workingHours: formData.shift,
        genderType: formData.genderType,
        studyType: formData.genderType,
        approximateStudents: formData.approximateStudents,
        estimatedStudents: Number(formData.approximateStudents) || 0,
      });
      toast.success('تم حفظ الإعدادات بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-20 animate-pulse text-slate-400 dark:text-slate-500 font-bold">جاري تحميل الإعدادات...</div>;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">إعدادات المدرسة</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">تخصيص معلومات المؤسسة وتفضيلات النظام</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-8 py-4 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl font-bold hover:bg-slate-800 dark:hover:bg-blue-700 transition-all shadow-xl shadow-slate-200 dark:shadow-blue-900/20 active:scale-95 disabled:opacity-50"
        >
          {saving ? 'جاري الحفظ...' : (
            <>
              <Save size={20} />
              <span>حفظ التغييرات</span>
            </>
          )}
        </button>
      </div>

      {isSchoolSubjectsEnabled(contextSchoolData?.packagePermissions) && (
        <div id="school-subjects-management">
          <SchoolSubjectsManagement />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Basic Info */}
          <section className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-3">
              <Building className="text-blue-500" size={24} />
              معلومات المؤسسة
            </h3>
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2.5 px-1">شعار المدرسة</label>
                <div className="flex gap-4 items-center">
                  {formData.logoUrl ? (
                    <div className="w-24 h-24 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 flex items-center justify-center relative group">
                      <img src={formData.logoUrl || undefined} alt="School Logo" className="max-w-full max-h-full object-contain" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                        <label className="cursor-pointer text-white flex flex-col items-center">
                          <Upload size={20} />
                          <span className="text-[10px] mt-1 font-bold">تغيير</span>
                          <input type="file" accept="image/*" className="hidden" onChange={handleUploadLogo} />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <label className="w-24 h-24 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all cursor-pointer">
                      <Upload size={24} className="mb-2" />
                      <span className="text-[10px] font-bold">رفع شعار</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleUploadLogo} />
                    </label>
                  )}
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                      يفضل استخدام صورة مربعة (1:1) بخلفية شفافة (PNG). الحد الأقصى للحجم 2MB. سيظهر الشعار في الفوتر والتقارير المطبوعة.
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2.5 px-1">اسم المدرسة / المركز</label>
                <div className="relative">
                  <Building className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pr-12 pl-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 transition-all outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 focus:border-blue-500 text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2.5 px-1">العنوان والموقع</label>
                <div className="relative">
                  <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    className="w-full pr-12 pl-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 transition-all outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 focus:border-blue-500 text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2.5 px-1">المحافظة</label>
                  <select
                    value={formData.governorate}
                    onChange={e => setFormData({ ...formData, governorate: e.target.value })}
                    className="w-full px-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 transition-all outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 focus:border-blue-500 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="" disabled>اختر المحافظة...</option>
                    {defaultGovernorates.map(gov => (
                      <option key={gov} value={gov}>{gov}</option>
                    ))}
                    {formData.governorate && !defaultGovernorates.includes(formData.governorate) && (
                      <option value={formData.governorate}>{formData.governorate}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2.5 px-1">المديرية</label>
                  <select
                    value={formData.directorate}
                    onChange={e => setFormData({ ...formData, directorate: e.target.value })}
                    className="w-full px-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 transition-all outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 focus:border-blue-500 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="" disabled>اختر المديرية...</option>
                    {defaultDirectorates.map(dir => (
                      <option key={dir} value={dir}>{dir}</option>
                    ))}
                    {formData.directorate && !defaultDirectorates.includes(formData.directorate) && (
                      <option value={formData.directorate}>{formData.directorate}</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2.5 px-1">المرحلة الدراسية</label>
                  <select
                    value={formData.stage}
                    onChange={e => setFormData({ ...formData, stage: e.target.value })}
                    className="w-full px-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 transition-all outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 focus:border-blue-500 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="" disabled>اختر المرحلة...</option>
                    {defaultStages.map(stg => (
                      <option key={stg} value={stg}>{stg}</option>
                    ))}
                    {formData.stage && !defaultStages.includes(formData.stage) && (
                      <option value={formData.stage}>{formData.stage}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2.5 px-1">وقت الدوام</label>
                  <select
                    value={formData.shift}
                    onChange={e => setFormData({ ...formData, shift: e.target.value })}
                    className="w-full px-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 transition-all outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 focus:border-blue-500 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="" disabled>اختر وقت الدوام...</option>
                    {defaultShifts.map(sh => (
                      <option key={sh} value={sh}>{sh}</option>
                    ))}
                    {formData.shift && !defaultShifts.includes(formData.shift) && (
                      <option value={formData.shift}>{formData.shift}</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2.5 px-1">نوع الدراسة</label>
                  <select
                    value={formData.genderType}
                    onChange={e => setFormData({ ...formData, genderType: e.target.value })}
                    className="w-full px-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 transition-all outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 focus:border-blue-500 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="" disabled>اختر نوع الدراسة...</option>
                    {defaultGenders.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                    {formData.genderType && !defaultGenders.includes(formData.genderType) && (
                      <option value={formData.genderType}>{formData.genderType}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2.5 px-1">عدد الطلاب التقريبي</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.approximateStudents}
                    onChange={e => setFormData({ ...formData, approximateStudents: e.target.value })}
                    className="w-full px-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 transition-all outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 focus:border-blue-500 text-slate-900 dark:text-white font-bold"
                    placeholder="مثال: 500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2.5 px-1">رابط الموقع التفصيلي للمدرسة (Google Maps)</label>
                <div className="relative">
                  <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="url"
                    value={formData.googleMapsUrl}
                    onChange={e => setFormData({ ...formData, googleMapsUrl: e.target.value })}
                    placeholder="https://maps.google.com/..."
                    className="w-full pr-12 pl-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 transition-all outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 focus:border-blue-500 text-slate-900 dark:text-white font-bold font-mono"
                  />
                </div>
                <p className="mt-2 text-xs text-slate-400 dark:text-slate-500 font-bold">
                  * ضع رابط الخريطة التفصيلي لموقع المدرسة هنا لتسهيل عثور أولياء الأمور وتوجيههم للمدرسة من حسابهم الشخصي.
                </p>
              </div>
            </div>
          </section>

          {/* System Preferences */}
          <section className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-3">
              <Settings className="text-indigo-500" size={24} />
              تفضيلات النظام
            </h3>
            <div className="space-y-4">
              <div 
                onClick={handleToggleTimer}
                className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl transition-colors ${formData.showSubscriptionTimer ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                    {formData.showSubscriptionTimer ? <Eye size={20} /> : <EyeOff size={20} />}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">عرض مؤقت الاشتراك</p>
                    <p className="text-xs text-slate-500">إظهار عداد الأيام المتبقية في شريط التنقل العلوي</p>
                  </div>
                </div>
                <div 
                  className={`w-12 h-6 rounded-full relative transition-all ${formData.showSubscriptionTimer ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.showSubscriptionTimer ? 'right-7' : 'right-1'}`} />
                </div>
              </div>

              <div 
                onClick={handleToggleNotifications}
                className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl transition-colors ${formData.notificationsEnabled ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                    <Bell size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">تفعيل الإشعارات</p>
                    <p className="text-xs text-slate-500">إرسال تنبيهات تلقائية لأولياء الأمور والموظفين</p>
                  </div>
                </div>
                <div 
                   className={`w-12 h-6 rounded-full relative transition-all ${formData.notificationsEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.notificationsEnabled ? 'right-7' : 'right-1'}`} />
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-8">
          {/* Subscription Card */}
          <section className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
             <div className="relative z-10">
                <div className="bg-white/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
                  <ShieldCheck size={24} className="text-blue-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">حالة الاشتراك</h3>
                <p className="text-slate-400 text-sm mb-6">تاريخ الانتهاء وتفاصيل الباقة المفعلة</p>
                
                <div className="space-y-4">
                   <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">صالح لغاية</p>
                      <p className="text-lg font-bold font-mono">
                        {schoolData?.subscriptionExpiresAt ? new Date(schoolData.subscriptionExpiresAt).toLocaleDateString('ar-IQ', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : 'غير محدد'}
                      </p>
                   </div>
                   <div className="flex items-center justify-between px-2">
                      <span className="text-xs text-slate-400">الباقة الحالية:</span>
                      <span className="text-xs font-bold text-blue-400">المؤسسات الكبرى</span>
                   </div>
                </div>
             </div>
             <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-blue-600/10 rounded-full blur-[80px]"></div>
          </section>

          {/* Help Card */}
          <section className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
             <h4 className="font-bold text-slate-800 dark:text-white mb-4">هل تحتاج مساعدة؟</h4>
             <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">فريق الدعم الفني متوفر دائماً لمساعدتك في ضبط إعدادات المنصة بما يناسب احتياجاتك.</p>
             
             {!showSupport ? (
               <button 
                 onClick={() => setShowSupport(true)}
                 className="w-full py-4 text-center bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
               >
                 اتصل بالدعم الفني
               </button>
             ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6 bg-blue-50 dark:bg-blue-900/20 p-6 rounded-3xl border border-blue-100 dark:border-blue-900/30"
                >
                  <div className="space-y-4">
                    <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1 px-1">أرقام التواصل (WhatsApp)</p>
                    <div className="space-y-2">
                       {supportInfo.supportPhones.map((phone, i) => (
                         <div key={i} className="flex items-center gap-3 bg-white dark:bg-slate-800 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30">
                            <Phone size={14} className="text-blue-500" />
                            <p className="text-base font-bold text-slate-900 dark:text-white font-mono" dir="ltr">{phone}</p>
                         </div>
                       ))}
                    </div>
                  </div>
                  <div className="pt-6 border-t border-blue-100 dark:border-blue-900/30 space-y-4">
                    <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1 px-1">البريد الإلكتروني الرسمي</p>
                    <div className="space-y-2">
                       {supportInfo.supportEmails.map((email, i) => (
                         <div key={i} className="flex items-center gap-3 bg-white dark:bg-slate-800 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30">
                            <Mail size={14} className="text-blue-500" />
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{email}</p>
                         </div>
                       ))}
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowSupport(false)}
                    className="w-full mt-4 text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 uppercase underline"
                  >
                    إغلاق المعلومات
                  </button>
                </motion.div>
             )}
          </section>
        </div>
      </div>
    </motion.div>
  );
}
