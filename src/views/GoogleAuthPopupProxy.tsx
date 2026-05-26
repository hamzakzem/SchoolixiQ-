import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { GoogleAuthProvider, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { getDoc, setDoc, doc, query, collection, where, getDocs, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { UserRole } from '../types';
import { useLanguage } from '../lib/LanguageContext';
import { ShieldCheck, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function GoogleAuthPopupProxy() {
  const [searchParams] = useSearchParams();
  const selectedRole = (searchParams.get('role') as UserRole) || UserRole.PARENT;
  const selectedMode = searchParams.get('mode') || 'login';
  const { isRtl, t } = useLanguage();
  
  const [status, setStatus] = useState<'loading' | 'signing' | 'saving' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    let active = true;

    const startGoogleAuth = async () => {
      if (!active) return;
      setStatus('signing');
      try {
        const result = await getRedirectResult(auth);
        let user;

        if (result && result.user) {
          user = result.user;
        } else {
          // Check if we are already redirecting
          if (window.sessionStorage.getItem('googleRedirectStarted') === 'true') {
             // We are just waiting for the page to navigate away
             return;
          }
          window.sessionStorage.setItem('googleRedirectStarted', 'true');
          const provider = new GoogleAuthProvider();
          
          // Prevent Google from auto-selecting if they want to switch accounts
          provider.setCustomParameters({
            prompt: 'select_account'
          });

          // 1. Run Top-Level popup sign-in
          await signInWithRedirect(auth, provider);
          return; // Wait for redirect
        }

        if (!active) return;
        
        setUserName(user.displayName || user.email || '');
        setStatus('saving');

        // 2. Run profile creation / data linking identically to Login.tsx
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (!userDoc.exists()) {
          const emailLower = user.email?.toLowerCase() || '';
          const q = query(collection(db, 'users'), where('email', '==', emailLower));
          const querySnap = await getDocs(q);
          let provisionedData = null;
          let oldDocId = '';
          
          if (!querySnap.empty) {
            const found = querySnap.docs[0];
            provisionedData = found.data();
            oldDocId = found.id;
          }

          // Check if first user for SuperAdmin
          let isFirstUser = false;
          try {
            const metadataSnap = await getDoc(doc(db, 'users', 'metadata'));
            isFirstUser = !metadataSnap.exists();
          } catch (err) {
            console.warn('Metadata check error in popup proxy', err);
          }

          const finalRole = isFirstUser ? UserRole.SUPERADMIN : (provisionedData?.role || selectedRole);

          // Role conflict check: management cannot be teacher or parent
          const isManagement = ['admin', 'staff', 'assistant', 'superadmin'].includes(provisionedData?.role);
          if (isManagement && (selectedRole === UserRole.PARENT || selectedRole === UserRole.TEACHER)) {
            const conflictErr = isRtl 
              ? 'هذا البريد مسجل كإدارة مدرسة ولا يمكن ربطه كحساب معلم أو ولي أمر!' 
              : 'This email is registered as management and cannot be linked as a parent or teacher!';
            throw new Error(conflictErr);
          }

          // Create admin registration record if needed
          if (finalRole === UserRole.ADMIN && selectedMode === 'signup') {
            try {
              await addDoc(collection(db, 'registrations'), {
                type: 'direct_school_signup',
                name: user.displayName || 'School via Google',
                email: user.email,
                phone: '', 
                status: 'needs_review',
                createdAt: serverTimestamp()
              });
            } catch (e) {
              console.warn('Failed to record direct signup credentials', e);
            }
          }

          // Create standard user profile
          await setDoc(doc(db, 'users', user.uid), {
            name: user.displayName || provisionedData?.name || (isRtl ? 'مستخدم جديد' : 'New User'),
            email: user.email,
            role: finalRole,
            schoolId: provisionedData?.schoolId || '',
            createdAt: new Date().toISOString(),
            uid: user.uid,
            photoURL: user.photoURL
          });

          // Migrate child students if provisioned
          if (oldDocId && oldDocId !== user.uid) {
            const studentsQ = query(collection(db, 'students'), where('parentIds', 'array-contains', oldDocId));
            const studentsSnap = await getDocs(studentsQ);
            
            const migrationPromises = studentsSnap.docs.map(studentDoc => {
              const currentIds = studentDoc.data().parentIds || [];
              const updatedIds = currentIds.map((id: string) => id === oldDocId ? user.uid : id);
              return updateDoc(doc(db, 'students', studentDoc.id), { parentIds: updatedIds });
            });
            
            await Promise.all(migrationPromises);
            await deleteDoc(doc(db, 'users', oldDocId));
          }

          if (isFirstUser) {
            await setDoc(doc(db, 'users', 'metadata'), { initialized: true });
          }
        }

        if (!active) return;
        setStatus('success');
        window.sessionStorage.removeItem('googleRedirectStarted');

        // 3. Post authentication signal back to parent frame
        if (window.opener) {
          window.opener.postMessage({
            type: 'GOOGLE_AUTH_SUCCESS',
            uid: user.uid,
            email: user.email,
            displayName: user.displayName
          }, window.location.origin);
        }

        // Auto close after brief latency for stellar visuals
        setTimeout(() => {
          window.close();
        }, 1500);

      } catch (error: any) {
        window.sessionStorage.removeItem('googleRedirectStarted');
        console.error("Popup Auth Proxy Error:", error);
        if (!active) return;
        setStatus('error');
        setErrorMsg(error.message || 'Authentication failed');
        toast.error(error.message || 'Authentication error');
      }
    };

    startGoogleAuth();

    return () => {
      active = false;
    };
  }, [selectedRole, isRtl]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-xl border border-slate-100 flex flex-col items-center">
        {/* App Logo or Branding Icon */}
        <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 border border-indigo-100 text-indigo-600">
          <ShieldCheck size={36} className="animate-pulse" />
        </div>

        {status === 'signing' && (
          <>
            <h2 className="text-xl font-black text-slate-900 mb-2">
              {isRtl ? 'الاتصال بحساب Google...' : 'Connecting to Google...'}
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed max-w-xs mb-8">
              {isRtl 
                ? 'يرجى إكمال تسجيل الدخول وبالمصادقة الأمنية عبر نافذة Google المجاورة.' 
                : 'Please complete your secure authentication via the Google sign-in prompt.'}
            </p>
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          </>
        )}

        {status === 'saving' && (
          <>
            <h2 className="text-xl font-black text-slate-900 mb-2">
              {isRtl ? 'تحضير البيئة التعليمية...' : 'Preparing Educational Suite...'}
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed max-w-xs mb-8">
              {isRtl 
                ? `مرحباً ${userName || ''}، يتم الآن التحقق من بصمات وربط حسابك بأمان.`
                : `Welcome ${userName || ''}, we are securely synchronizing and caching your credentials.`}
            </p>
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2">
              {isRtl ? 'تم تسجيل الدخول بنجاح!' : 'Sign-in Successful!'}
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
              {isRtl 
                ? 'جاري إغلاق هذه النافذة والعودة تلقائياً للواجهة الرئيسية التطويرية.' 
                : 'Closing this authentication window and returning you to the development preview.'}
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-xl font-black text-slate-800 mb-2">
              {isRtl ? 'فشل تسجيل الدخول' : 'Sign-in Failed'}
            </h2>
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 p-3 rounded-xl max-w-xs mb-6 overflow-hidden text-ellipsis break-words">
              {errorMsg}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-bold text-sm rounded-xl shadow-md hover:bg-indigo-700 transition active:scale-95"
            >
              <RefreshCw size={16} />
              <span>{isRtl ? 'إعادة المحاولة' : 'Try Again'}</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
