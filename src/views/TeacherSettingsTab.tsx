import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { db, auth } from '../lib/firebase';
import { serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { updatePassword, verifyBeforeUpdateEmail } from 'firebase/auth';
import { toast } from 'react-hot-toast';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { useLanguage } from '../lib/LanguageContext';
import { AtSign, Lock, LayoutDashboard, Eye, EyeOff } from 'lucide-react';
import { TEACHER_NO_CLASS_MSG } from '../lib/teacherClass';

type TeacherSettingsTabProps = {
  classes?: any[];
  assignedClassId?: string;
  assignedClassName?: string;
};

export default function TeacherSettingsTab({
  assignedClassId,
  assignedClassName,
}: TeacherSettingsTabProps) {
  const { profile } = useAuth();
  const { isRtl } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !email) return;
    setIsLoading(true);
    try {
      await verifyBeforeUpdateEmail(auth.currentUser, email);
      toast.success(isRtl ? 'تم إرسال رابط تأكيد للبريد الجديد' : 'Verification link sent to new email');
      setEmail('');
    } catch (error: any) {
      if (error?.code?.includes('recent-login')) {
        toast.error(isRtl ? 'يرجى تسجيل الخروج والدخول مجدداً لإجراء هذا التعديل' : 'Please log out and log back in to apply this change');
      } else {
        toast.error(error.message || 'Error updating email');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || password.length < 6) {
      toast.error(isRtl ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters');
      return;
    }
    setIsLoading(true);
    try {
      await updatePassword(auth.currentUser, password);
      await updateDoc(doc(db, 'users', profile!.uid), {
        updatedAt: serverTimestamp()
      });
      toast.success(isRtl ? 'تم تحديث كلمة المرور بنجاح' : 'Password updated successfully');
      setPassword('');
    } catch (error: any) {
      if (error?.code?.includes('recent-login')) {
        toast.error(isRtl ? 'يرجى تسجيل الخروج والدخول مجدداً لإجراء هذا التعديل' : 'Please log out and log back in to apply this change');
      } else {
        toast.error(error.message || 'Error updating password');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">{isRtl ? 'إعدادات الحساب' : 'Account Settings'}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <AtSign size={24} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">{isRtl ? 'تحديث البريد الإلكتروني' : 'Update Email'}</h3>
              <p className="text-sm text-slate-500">{profile?.email}</p>
            </div>
          </div>
          <form onSubmit={handleUpdateEmail} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={isRtl ? 'البريد الإلكتروني الجديد' : 'New Email'}
              className="w-full px-4 py-3 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
              required
            />
            <button
              disabled={isLoading || !email}
              type="submit"
              className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {isRtl ? 'تحديث البريد' : 'Update Email'}
            </button>
          </form>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <Lock size={24} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">{isRtl ? 'تحديث كلمة المرور' : 'Update Password'}</h3>
              <p className="text-sm text-slate-500">{isRtl ? 'بحد أدنى 6 أحرف' : 'Min 6 characters'}</p>
            </div>
          </div>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isRtl ? 'كلمة المرور الجديدة' : 'New Password'}
                className={`w-full ${isRtl ? 'pl-11 pr-4' : 'pr-11 pl-4'} py-3 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium`}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute ${isRtl ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer z-10 flex items-center justify-center p-1`}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <button
              disabled={isLoading || !password || password.length < 6}
              type="submit"
              className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {isRtl ? 'تحديث كلمة المرور' : 'Update Password'}
            </button>
          </form>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
             <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
               <LayoutDashboard size={24} />
             </div>
             <div>
               <h3 className="font-bold text-slate-900">{isRtl ? 'الصف المعيّن' : 'Assigned class'}</h3>
               <p className="text-sm text-slate-500">
                 {isRtl
                   ? 'يتم تعيين الصف من قسم إدارة حسابات الكادر فقط'
                   : 'Class is assigned by school admin only'}
               </p>
             </div>
          </div>
          <div className="w-full px-4 py-3 bg-slate-50 rounded-xl font-bold text-slate-900">
            {assignedClassId
              ? assignedClassName || assignedClassId
              : TEACHER_NO_CLASS_MSG}
          </div>
        </div>
      </div>
    </div>
  );
}
