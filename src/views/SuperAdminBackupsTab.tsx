import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Clock, CheckCircle2, ShieldCheck, DatabaseBackup, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { auth } from '../lib/firebase';
import { getApiUrl } from '../lib/apiUtils';

const LAST_BACKUP_KEY = 'schoolix_last_manual_backup';

export function SuperAdminBackupsTab() {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [lastBackupDate, setLastBackupDate] = useState<Date | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(LAST_BACKUP_KEY);
    if (stored) {
      const parsed = new Date(stored);
      if (!Number.isNaN(parsed.getTime())) {
        setLastBackupDate(parsed);
      }
    }
  }, []);

  const handleManualBackup = async () => {
    if (!auth.currentUser) {
      toast.error('يجب تسجيل الدخول كمدير نظام');
      return;
    }

    try {
      setIsBackingUp(true);
      const token = await auth.currentUser.getIdToken(true);

      const response = await fetch(getApiUrl('/api/admin/backup'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        let detail = 'فشل في عملية النسخ الاحتياطي';
        try {
          const err = await response.json();
          detail = err.error || err.message || detail;
        } catch {
          /* ignore */
        }
        throw new Error(detail);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `schoolixiq-full-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      const now = new Date();
      localStorage.setItem(LAST_BACKUP_KEY, now.toISOString());
      setLastBackupDate(now);
      toast.success('تم تحميل النسخة الاحتياطية بنجاح');
    } catch (error: any) {
      console.error('Backup error:', error);
      toast.error(error?.message || 'حدث خطأ أثناء تحميل النسخة الاحتياطية');
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-8 gap-4 bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
        <div>
          <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white font-display tracking-tight flex items-center gap-3">
            <DatabaseBackup className="text-blue-600" size={32} />
            نظام النسخ الاحتياطي
          </h3>
          <p className="text-slate-500 dark:text-slate-400 font-bold mt-2 opacity-80 text-sm">
            تصدير يدوي آمن لبيانات المنصة عبر الخادم الخلفي
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Download size={120} />
          </div>
          <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2 relative z-10">تحميل نسخة احتياطية فورية</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 relative z-10">
            تصدير بيانات النظام (مدارس، مستخدمين، طلاب، فصول، باقات، وغيرها) في ملف JSON عبر واجهة `/api/admin/backup` المحمية.
          </p>
          <button
            onClick={handleManualBackup}
            disabled={isBackingUp}
            className="w-full relative z-10 flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95 disabled:opacity-50"
          >
            {isBackingUp ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                جاري توليد الملف الآمن...
              </>
            ) : (
              <>
                <Download size={20} />
                تحميل النسخة الاحتياطية (JSON)
              </>
            )}
          </button>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-center">
          <div className="space-y-4">
            <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-lg">
                <AlertCircle size={20} />
              </div>
              <div>
                <div className="text-xs text-slate-400 font-bold mb-1">الجدولة التلقائية</div>
                <div className="text-sm font-black text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  قيد الإعداد — لا تُعرض نسخ تلقائية وهمية
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <div className="text-xs text-slate-400 font-bold mb-1">آخر نسخة يدوية تم تنزيلها</div>
                <div className="text-sm font-black text-slate-700 dark:text-white">
                  {lastBackupDate ? lastBackupDate.toLocaleString('ar-IQ') : 'لم يتم تنزيل نسخة بعد'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-lg">
                <ShieldCheck size={20} />
              </div>
              <div>
                <div className="text-xs text-slate-400 font-bold mb-1">سياسة الأمان</div>
                <div className="text-xs font-bold text-slate-600 dark:text-slate-300 leading-relaxed">
                  التصدير يتم عبر الخادم بصلاحية Super Admin فقط. احفظ الملف محلياً في مكان آمن ولا تشاركه علناً.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg">
                <Clock size={20} />
              </div>
              <div>
                <div className="text-xs text-slate-400 font-bold mb-1">متطلبات التشغيل</div>
                <div className="text-xs font-bold text-slate-600 dark:text-slate-300 leading-relaxed">
                  يتطلب اتصالاً فعّالاً بالخادم الخلفي (Cloud Run). إذا فشل التحميل، تحقق من إعدادات `backendUrl`.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
