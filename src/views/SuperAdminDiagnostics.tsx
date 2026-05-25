import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, Clock, Database, AlertTriangle, Users, TrendingUp, RefreshCw } from 'lucide-react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export function SuperAdminDiagnostics() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionReads, setSessionReads] = useState(0);

  const fetchDiagnostics = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'system_diagnostics'),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      const snap = await getDocs(q);
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error(error);
      // Fallback or ignore if collection doesn't exist yet
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
    const reads = sessionStorage.getItem('sessionReadCount') || '0';
    setSessionReads(parseInt(reads));
    
    const interval = setInterval(() => {
       const newReads = sessionStorage.getItem('sessionReadCount') || '0';
       setSessionReads(parseInt(newReads));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
        <div>
          <h3 className="text-3xl font-black text-slate-900 dark:text-white font-display tracking-tight flex items-center gap-3">
            <Activity className="text-blue-600" size={32} />
            مراقبة الأداء والنظام (Sentry + Firebase Perf)
          </h3>
          <p className="text-slate-500 font-bold mt-2">
            تشخيص أداء الاستعلامات، العمليات البطيئة، السجلات والإحصائيات الحية.
          </p>
        </div>
        <button 
          onClick={fetchDiagnostics}
          disabled={loading}
          className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold transition-all"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          تحديث السجلات
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex justify-center items-center shrink-0">
            <Database size={24} />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-400 mb-1">عمليات القراءة (الجلسة الحالية)</div>
            <div className="text-2xl font-black text-slate-800">{sessionReads.toLocaleString()} قراءة</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex justify-center items-center shrink-0">
            <Users size={24} />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-400 mb-1">المستخدمين النشطين (اليوم)</div>
            <div className="text-2xl font-black text-slate-800">مراقبة Analytics</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex justify-center items-center shrink-0">
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-400 mb-1">الاستعلامات المكلفة/البطيئة</div>
            <div className="text-2xl font-black text-slate-800">{logs.length} سجل</div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-[2rem] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <h4 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Clock size={20} className="text-slate-400" />
            سجل الاستعلامات والأخطاء المكتشفة
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-slate-50 text-sm text-slate-500 font-bold border-b border-slate-100">
                <th className="p-4">الوقت</th>
                <th className="p-4">النوع</th>
                <th className="p-4">المسار / السياق</th>
                <th className="p-4">مدة التنفيذ (ms)</th>
                <th className="p-4">عدد المستندات</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={log.id || i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 text-sm font-medium text-slate-600" dir="ltr">
                    {log.timestamp?.toDate ? new Date(log.timestamp.toDate()).toLocaleString() : 'N/A'}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                      log.type === 'slow_query' ? 'bg-orange-100 text-orange-700' :
                      log.type === 'expensive_query' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {log.type === 'slow_query' ? 'بُطء مزمن' : 'تكلفة عالية'}
                    </span>
                  </td>
                  <td className="p-4 text-sm font-bold text-slate-700">{log.context}</td>
                  <td className="p-4 text-sm font-bold text-slate-700">{Math.round(log.durationMs || 0)}ms</td>
                  <td className="p-4 text-sm font-bold text-slate-700">{log.documentCount} doc</td>
                </tr>
              ))}
              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400 font-bold">
                    لا توجد سجلات أداء سيئة حتى الآن.
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
