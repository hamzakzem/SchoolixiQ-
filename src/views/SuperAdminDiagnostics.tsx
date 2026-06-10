import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, Database, Users, RefreshCw, Layers, ShieldAlert, Cpu, Server } from 'lucide-react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getBackendApiBaseUrl } from '../lib/apiUtils';
import toast from 'react-hot-toast';

interface SuperAdminDiagnosticsProps {
  totalUsers?: number;
  totalSchools?: number;
}

export function SuperAdminDiagnostics({
  totalUsers = 0,
  totalSchools = 0,
}: SuperAdminDiagnosticsProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionReads, setSessionReads] = useState(0);
  const backendUrl = getBackendApiBaseUrl();

  const fetchDiagnostics = async () => {
    setLoading(true);
    const toastId = toast.loading('جاري تحديث البيانات...');
    try {
      const q = query(
        collection(db, 'system_diagnostics'),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      const snap = await getDocs(q);
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));

      toast.dismiss(toastId);
      toast.success('تم تحديث البيانات بنجاح');
    } catch (error) {
      console.error(error);
      toast.dismiss(toastId);
      toast.error('حدث خطأ أثناء تحديث البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
    const reads = sessionStorage.getItem('sessionReadCount') || '0';
    setSessionReads(parseInt(reads, 10));

    const interval = setInterval(() => {
      const newReads = sessionStorage.getItem('sessionReadCount') || '0';
      setSessionReads(parseInt(newReads, 10));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const buildMode = import.meta.env.PROD ? 'إنتاج' : 'تطوير';

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-6">

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
        <div>
          <h3 className="text-3xl font-black text-slate-900 dark:text-white font-display tracking-tight flex items-center gap-3">
            <Activity className="text-blue-600" size={32} />
            مراقبة الأداء والتشخيص
          </h3>
          <p className="text-slate-500 font-bold mt-2 flex items-center gap-2 text-sm">
            <span className={`flex w-2 h-2 rounded-full ${backendUrl ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`}></span>
            {backendUrl ? 'رابط الخادم مضبوط' : 'رابط الخادم غير مضبوط'}
            {' · '}
            وضع الواجهة: {buildMode}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchDiagnostics}
            disabled={loading}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-slate-900/10 disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            تحديث البيانات
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-4 group">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex justify-center items-center shrink-0 group-hover:scale-110 transition-transform">
            <Database size={24} />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-400 dark:text-slate-500 mb-1">عمليات القراءة (الجلسة)</div>
            <div className="text-3xl font-black text-slate-800 dark:text-white font-mono tracking-tight">{sessionReads.toLocaleString()}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-4 group">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex justify-center items-center shrink-0 group-hover:scale-110 transition-transform">
            <Users size={24} />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-400 dark:text-slate-500 mb-1">إجمالي المستخدمين</div>
            <div className="text-3xl font-black text-slate-800 dark:text-white font-mono tracking-tight">{totalUsers.toLocaleString()}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-4 group">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl flex justify-center items-center shrink-0 group-hover:scale-110 transition-transform">
            <Layers size={24} />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-400 dark:text-slate-500 mb-1">إجمالي المدارس</div>
            <div className="text-3xl font-black text-slate-800 dark:text-white font-mono tracking-tight">{totalSchools.toLocaleString()}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-4 group">
          <div className="w-12 h-12 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl flex justify-center items-center shrink-0 group-hover:scale-110 transition-transform">
            <ShieldAlert size={24} />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-400 dark:text-slate-500 mb-1">سجلات الأداء</div>
            <div className="text-3xl font-black text-slate-800 dark:text-white font-mono tracking-tight">{logs.length}</div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] shadow-sm overflow-hidden">
        <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h4 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3 font-display">
              <Cpu size={24} className="text-slate-400" />
              سجل الاستعلامات البطيئة والمكلفة
            </h4>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-bold mt-1">
              آخر 50 حدثاً من مجموعة `system_diagnostics` — لا تُعرض أسرار أو رموز وصول
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <Server size={14} />
            Backend URL: {backendUrl || 'غير مضبوط'}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-sm text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                <th className="p-5 whitespace-nowrap">الوقت / التاريخ</th>
                <th className="p-5">تصنيف الخطأ</th>
                <th className="p-5">المسار / السياق</th>
                <th className="p-5">مدة التنفيذ (ms)</th>
                <th className="p-5">العبء (مستندات)</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={log.id || i} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="p-5 text-sm font-bold text-slate-600 dark:text-slate-300 font-mono" dir="ltr">
                    {log.timestamp?.toDate ? new Date(log.timestamp.toDate()).toLocaleString('ar-IQ') : '—'}
                  </td>
                  <td className="p-5">
                    <span className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black shadow-sm ${
                      log.type === 'slow_query' ? 'bg-orange-50 text-orange-600 border border-orange-100 dark:bg-orange-500/10 dark:border-orange-500/20' :
                      log.type === 'expensive_query' ? 'bg-red-50 text-red-600 border border-red-100 dark:bg-red-500/10 dark:border-red-500/20' :
                      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}>
                      {log.type === 'slow_query' ? 'استعلام بطيء' : log.type === 'expensive_query' ? 'عملية مكلفة' : 'حدث نظام'}
                    </span>
                  </td>
                  <td className="p-5 text-sm font-bold text-slate-700 dark:text-slate-300">{log.context}</td>
                  <td className="p-5 text-sm font-bold text-slate-700 dark:text-slate-300 font-mono bg-slate-50/50 dark:bg-slate-800/20">
                    {Math.round(log.durationMs || 0)}ms
                    {(log.durationMs || 0) > 3000 && <span className="text-red-500 mr-2 text-xs">(حرج)</span>}
                  </td>
                  <td className="p-5 text-sm font-bold text-slate-700 dark:text-slate-300 font-mono">
                    {log.documentCount} doc
                  </td>
                </tr>
              ))}
              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="p-16">
                    <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-4">
                      <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center">
                        <ShieldAlert size={32} className="opacity-50" />
                      </div>
                      <p className="font-bold text-lg">لا توجد سجلات أداء مسجّلة حالياً</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
