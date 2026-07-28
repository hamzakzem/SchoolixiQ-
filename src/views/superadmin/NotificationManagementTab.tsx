import React, { useEffect, useState } from 'react';
import { BellRing, Loader2, Send } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { sendEnterprisePushNotification } from '../../lib/adminApi';

type TargetType = 'school' | 'all_schools' | 'role' | 'user' | 'all';

export default function NotificationManagementTab({ isRtl = true }: { isRtl?: boolean }) {
  const [targetType, setTargetType] = useState<TargetType>('school');
  const [schoolId, setSchoolId] = useState('');
  const [role, setRole] = useState('teacher');
  const [userId, setUserId] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [actionUrl, setActionUrl] = useState('');
  const [routeTarget, setRouteTarget] = useState('system');
  const [notifType, setNotifType] = useState('system');
  const [busy, setBusy] = useState(false);
  const [schools, setSchools] = useState<Array<{ id: string; name: string }>>([]);
  const [logs, setLogs] = useState<Array<Record<string, unknown> & { id: string }>>([]);

  useEffect(() => {
    void (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'schools'), limit(200)));
        setSchools(
          snap.docs.map((d) => ({
            id: d.id,
            name: String((d.data() as { name?: string }).name || d.id),
          })),
        );
      } catch {
        setSchools([]);
      }
    })();
  }, []);

  const refreshLogs = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'notification_logs'), orderBy('createdAt', 'desc'), limit(30)));
      setLogs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })));
    } catch {
      setLogs([]);
    }
  };

  useEffect(() => {
    void refreshLogs();
  }, []);

  const send = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error(isRtl ? 'العنوان والنص مطلوبان' : 'Title and message required');
      return;
    }
    setBusy(true);
    try {
      const res = await sendEnterprisePushNotification({
        targetType,
        schoolId: schoolId || undefined,
        role: targetType === 'role' ? role : undefined,
        userId: targetType === 'user' ? userId : undefined,
        title: title.trim(),
        body: message.trim(),
        type: notifType,
        imageUrl: imageUrl.trim() || undefined,
        actionUrl: actionUrl.trim() || undefined,
        routeTarget: routeTarget.trim() || notifType,
      });
      toast.success(
        isRtl
          ? `تم جدولة الإشعار (${res.created || 0} مستلم)`
          : `Queued (${res.created || 0} recipients)`,
      );
      setTitle('');
      setMessage('');
      await refreshLogs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : isRtl ? 'فشل الإرسال' : 'Send failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="sx-section !mb-0">
        <div className="sx-section-bar">
          <div>
            <p className="sx-section-subtitle">Enterprise Push</p>
            <h2 className="sx-section-title flex items-center gap-2">
              <BellRing size={20} className="text-[#D4AF37]" />
              {isRtl ? 'إدارة الإشعارات' : 'Notification Management'}
            </h2>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="sx-section space-y-3">
          <h3 className="font-black text-sm">{isRtl ? 'إرسال إشعار Push' : 'Send push notification'}</h3>

          <label className="block text-[11px] font-bold text-slate-500">{isRtl ? 'الهدف' : 'Target'}</label>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['school', isRtl ? 'مدرسة' : 'School'],
                ['all_schools', isRtl ? 'كل المدارس' : 'All schools'],
                ['role', isRtl ? 'دور' : 'Role'],
                ['user', isRtl ? 'مستخدم' : 'User'],
                ['all', isRtl ? 'الجميع' : 'Everyone'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`sx-btn !h-10 !min-h-10 !text-xs ${targetType === id ? 'sx-btn-primary' : 'sx-btn-secondary'}`}
                onClick={() => setTargetType(id)}
              >
                {label}
              </button>
            ))}
          </div>

          {(targetType === 'school' || targetType === 'role') && (
            <>
              <label className="block text-[11px] font-bold text-slate-500">{isRtl ? 'المدرسة' : 'School'}</label>
              <select
                className="w-full rounded-xl border px-3 py-2 text-sm"
                value={schoolId}
                onChange={(e) => setSchoolId(e.target.value)}
              >
                <option value="">{isRtl ? 'اختر مدرسة…' : 'Select school…'}</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </>
          )}

          {targetType === 'role' && (
            <>
              <label className="block text-[11px] font-bold text-slate-500">{isRtl ? 'الدور' : 'Role'}</label>
              <select className="w-full rounded-xl border px-3 py-2 text-sm" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="teacher">{isRtl ? 'المعلمون' : 'Teachers'}</option>
                <option value="parent">{isRtl ? 'أولياء الأمور' : 'Parents'}</option>
                <option value="admin">{isRtl ? 'إدارة المدارس' : 'School admins'}</option>
                <option value="distributor">{isRtl ? 'الموزعون' : 'Distributors'}</option>
                <option value="guard">{isRtl ? 'الحراس' : 'Guards'}</option>
              </select>
            </>
          )}

          {targetType === 'user' && (
            <>
              <label className="block text-[11px] font-bold text-slate-500">User ID</label>
              <input className="w-full rounded-xl border px-3 py-2 text-sm" value={userId} onChange={(e) => setUserId(e.target.value)} />
            </>
          )}

          <label className="block text-[11px] font-bold text-slate-500">{isRtl ? 'النوع' : 'Type'}</label>
          <select className="w-full rounded-xl border px-3 py-2 text-sm" value={notifType} onChange={(e) => setNotifType(e.target.value)}>
            <option value="system">{isRtl ? 'نظام' : 'System'}</option>
            <option value="announcement">{isRtl ? 'إعلان' : 'Announcement'}</option>
            <option value="homework">{isRtl ? 'واجب' : 'Homework'}</option>
            <option value="attendance">{isRtl ? 'حضور' : 'Attendance'}</option>
            <option value="tuition">{isRtl ? 'أقساط' : 'Tuition'}</option>
            <option value="chat">{isRtl ? 'محادثة' : 'Chat'}</option>
            <option value="security">{isRtl ? 'أمن' : 'Security'}</option>
          </select>

          <label className="block text-[11px] font-bold text-slate-500">{isRtl ? 'العنوان' : 'Title'}</label>
          <input className="w-full rounded-xl border px-3 py-2 text-sm" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={isRtl ? 'تم تحديث نظام الحضور' : 'Attendance system updated'} />

          <label className="block text-[11px] font-bold text-slate-500">{isRtl ? 'الرسالة' : 'Message'}</label>
          <textarea className="w-full rounded-xl border px-3 py-2 text-sm min-h-[100px]" value={message} onChange={(e) => setMessage(e.target.value)} />

          <label className="block text-[11px] font-bold text-slate-500">{isRtl ? 'صورة (اختياري)' : 'Image URL'}</label>
          <input className="w-full rounded-xl border px-3 py-2 text-sm" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />

          <label className="block text-[11px] font-bold text-slate-500">{isRtl ? 'رابط الإجراء / التبويب' : 'Action URL / tab'}</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input className="w-full rounded-xl border px-3 py-2 text-sm" value={actionUrl} onChange={(e) => setActionUrl(e.target.value)} placeholder="https://… or /?tab=attendance" />
            <input className="w-full rounded-xl border px-3 py-2 text-sm" value={routeTarget} onChange={(e) => setRouteTarget(e.target.value)} placeholder="attendance | chat | tuition" />
          </div>

          <button type="button" className="sx-btn sx-btn-primary w-full" disabled={busy} onClick={() => void send()}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {isRtl ? 'إرسال الإشعار' : 'Send notification'}
          </button>
        </div>

        <div className="sx-section space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm">{isRtl ? 'سجل الإشعارات' : 'Notification audit log'}</h3>
            <button type="button" className="sx-btn sx-btn-ghost !h-9 !min-h-9 !text-xs" onClick={() => void refreshLogs()}>
              {isRtl ? 'تحديث' : 'Refresh'}
            </button>
          </div>
          <div className="space-y-2 max-h-[520px] overflow-y-auto custom-scrollbar">
            {logs.map((log) => (
              <div key={log.id} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <p className="font-bold truncate">{String(log.title || log.type || '—')}</p>
                <p className="text-[11px] text-slate-500">
                  {String(log.status || '')} · {String(log.receiver || log.targetType || '')}
                  {log.recipientCount != null ? ` · ${String(log.recipientCount)}` : ''}
                </p>
              </div>
            ))}
            {!logs.length ? (
              <p className="text-sm text-slate-400">{isRtl ? 'لا سجلات بعد' : 'No logs yet'}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
