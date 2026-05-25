import React, { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  addDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { LogIn, GraduationCap, Users, Building2, Mail, Lock, ShieldCheck, ArrowRight, Check, Package, Phone, MapPin, X, Coins, Sparkles, TrendingUp, Bell, Copy, ShieldAlert, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { UserRole } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

import { useLanguage } from '../lib/LanguageContext';
import { useSystemConfig } from '../lib/SystemConfigContext';
import { GlobalFooter } from '../components/GlobalFooter';

export default function Login() {
  const { t, isRtl } = useLanguage();
  const { config } = useSystemConfig();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [role, setRole] = useState<UserRole>(UserRole.PARENT);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState(''); 
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaChallenge, setCaptchaChallenge] = useState({ a: 0, b: 0 });

  // ... (rest of the states) ...

  // Replace text with t() calls below


  // Packages State
  const [packages, setPackages] = useState<any[]>([]);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>('annually');
  const [showSubscriptionModal, setShowSubscriptionModal] = useState<any>(null);
  const [subscriptionForm, setSubscriptionForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    password: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successCode, setSuccessCode] = useState<string | null>(null);

  useEffect(() => {
    generateCaptcha();
    
    // Real-time packages fetch
    const unsub = onSnapshot(collection(db, 'packages'), (snapshot) => {
      setPackages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'packages');
    });

    return () => unsub();
  }, [mode]);

  useEffect(() => {
    const handleProxyMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data && event.data.type === 'GOOGLE_AUTH_SUCCESS') {
        console.log("Popup login completed successfully! Synchronizing system states with IndexedDB...");
        setLoading(true);
        let checkCount = 0;
        const checkInterval = setInterval(() => {
          checkCount++;
          if (auth.currentUser || checkCount > 25) {
            clearInterval(checkInterval);
            setLoading(false);
          }
        }, 150);
      }
    };
    window.addEventListener('message', handleProxyMessage);
    return () => window.removeEventListener('message', handleProxyMessage);
  }, []);

  const handleSubscribeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showSubscriptionModal) return;

    setIsSubmitting(true);
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      await addDoc(collection(db, 'registrations'), {
        type: 'subscription_request',
        packageId: showSubscriptionModal.id,
        packageName: showSubscriptionModal.name,
        price: showSubscriptionModal.price,
        customerInfo: subscriptionForm,
        status: 'pending',
        subscriberCode: code,
        createdAt: serverTimestamp()
      });
      setSuccessCode(code);
      toast.success('تم إرسال طلب الاشتراك بنجاح!');
      setShowSubscriptionModal(null);
      setSubscriptionForm({ name: '', email: '', phone: '', address: '', password: '' });
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء إرسال الطلب');
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateCaptcha = () => {
    setCaptchaChallenge({
      a: Math.floor(Math.random() * 10) + 1,
      b: Math.floor(Math.random() * 10) + 1
    });
    setCaptchaAnswer('');
  };

  const [unauthorizedDomainError, setUnauthorizedDomainError] = useState<string | null>(null);
  const [showIframeHint, setShowIframeHint] = useState<boolean>(false);
  const [firebaseProviderError, setFirebaseProviderError] = useState<string | null>(null);

  const handleGoogleAuth = async () => {
    setUnauthorizedDomainError(null);
    setShowIframeHint(false);
    setFirebaseProviderError(null);

    // Active Iframe Shield: open the same-origin popup if running in an iframe
    let isInIframe = false;
    try {
      isInIframe = window.self !== window.top;
    } catch (e) {
      isInIframe = true;
    }
    
    if (isInIframe) {
      setLoading(true);
      const popupWidth = 500;
      const popupHeight = 650;
      const left = window.screen.width / 2 - popupWidth / 2;
      const top = window.screen.height / 2 - popupHeight / 2;
      
      const popupUrl = `${window.location.origin}/login-popup?role=${role}`;
      const popup = window.open(
        popupUrl,
        'Firebase_Google_Auth_Proxy',
        `width=${popupWidth},height=${popupHeight},left=${left},top=${top}`
      );
      
      if (!popup) {
        setLoading(false);
        toast.error(
          isRtl 
            ? 'تم حظر النافذة المنبثقة من قبل المتصفح. يرجى السماح بالنوافذ المنبثقة وإعادة المحاولة.' 
            : 'Popup blocked by browser. Please allow popups and try again.'
        );
      }
      return;
    }

    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user document exists
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        // Check for provisioned user by email
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
          console.warn('Metadata check error', err);
        }

        const finalRole = isFirstUser ? UserRole.SUPERADMIN : (provisionedData?.role || role);

        // Role conflict check: management cannot be teacher or parent
        const isManagement = ['admin', 'staff', 'assistant', 'superadmin'].includes(provisionedData?.role);
        if (isManagement && (role === UserRole.PARENT || role === UserRole.TEACHER)) {
          toast.error(t('managementRoleConflict'));
          setLoading(false);
          return;
        }

        // 1. Create the permanent profile
        await setDoc(doc(db, 'users', user.uid), {
          name: user.displayName || provisionedData?.name || t('newUser'),
          email: user.email,
          role: finalRole,
          schoolId: provisionedData?.schoolId || '',
          createdAt: new Date().toISOString(),
          uid: user.uid,
          photoURL: user.photoURL
        });

        // 2. If provisioned, migrate students and delete old doc
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
        toast.success(t('loginSuccess'));
      } else {
        toast.success(`${t('welcomeLabel') || 'Welcome'} ${user.displayName}`);
      }
    } catch (error: any) {
      console.error("Google Auth Error:", error);
      const errorCode = error.code || "";
      const errorMessage = error.message || "";
      
      if (errorCode === 'auth/popup-closed-by-user') {
        toast.error(t('popupClosed'));
      } else if (errorCode === 'auth/unauthorized-domain' || 
                 errorCode === 'auth/unauthorized-client' ||
                 errorMessage.includes('unauthorized-domain') ||
                 errorMessage.includes('unauthorized_domain') ||
                 errorMessage.toLowerCase().includes('unauthorized domain')) {
        setUnauthorizedDomainError(window.location.hostname);
        toast.error(
          isRtl 
            ? 'خطأ: النطاق الحالي غير مصرح به في إعدادات Firebase Console الخاصة بـ Google Auth.' 
            : 'Error: The current domain is not authorized in Firebase Console settings for Google Auth.'
        );
      } else if (errorCode === 'auth/popup-blocked') {
        toast.error(
          isRtl 
            ? 'تم حظر النافذة المنبثقة من قبل المتصفح. يرجى السماح بالنوافذ المنبثقة وإعادة المحاولة.' 
            : 'Popup blocked by browser. Please allow popups and try again.'
        );
      } else if (errorCode === 'auth/operation-not-allowed' || 
                 errorMessage.includes('operation-not-allowed') ||
                 errorMessage.toLowerCase().includes('operation not allowed') ||
                 errorMessage.toLowerCase().includes('disabled for this firebase project') ||
                 errorMessage.toLowerCase().includes('provider is disabled')) {
        setFirebaseProviderError('google-disabled');
        toast.error(
          isRtl 
            ? 'خطأ: لم يتم تفعيل تسجيل دخول Google في لوحة تحكم Firebase لمشروعك!' 
            : 'Error: Google Sign-In is not enabled in your Firebase Authentication Console!'
        );
      } else if (errorCode === 'auth/invalid-credential' || 
                 errorCode === 'INVALID_CREDENTIAL' ||
                 errorMessage.includes('invalid-credential') ||
                 errorMessage.toLowerCase().includes('invalid credential')) {
        toast.error(t('authError'));
      } else {
        setShowIframeHint(true);
        setFirebaseProviderError(`${errorCode || 'Exception'}: ${errorMessage || String(error)}`);
        toast.error(t('failedConnection'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verify Captcha
    if (parseInt(captchaAnswer) !== captchaChallenge.a + captchaChallenge.b) {
      toast.error(t('captchaError'));
      generateCaptcha();
      return;
    }

    const emailTrimmed = email.toLowerCase().trim();
    const passwordValue = password; // Do not trim passwords as they can contain valid spaces

    if (passwordValue.length < 6) {
      toast.error(t('passwordShort'));
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const result = await createUserWithEmailAndPassword(auth, emailTrimmed, passwordValue);
        const user = result.user;
        
        await updateProfile(user, { displayName: name });

        // Send Email Verification
        try {
          auth.languageCode = isRtl ? 'ar' : 'en';
          await sendEmailVerification(user);
          toast.success(t('verificationSent'));
        } catch (verifErr) {
          console.warn('Verification email failed', verifErr);
          toast.error(t('verificationFailed'));
        }

        // Check for provisioned user by email
        const q = query(collection(db, 'users'), where('email', '==', emailTrimmed));
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
          console.warn('Metadata check error', err);
        }

        const finalRole = isFirstUser ? UserRole.SUPERADMIN : (provisionedData?.role || role);

        // Role conflict check: management cannot be teacher or parent
        const isManagement = ['admin', 'staff', 'assistant', 'superadmin'].includes(provisionedData?.role);
        if (isManagement && (role === UserRole.PARENT || role === UserRole.TEACHER)) {
          toast.error('هذا الحساب مسجل كإدارة مدرسة ولا يمكن استخدامه كمعلم أو ولي أمر بنفس البريد');
          setLoading(false);
          return;
        }

        // Record for superadmin if it's a school registration
        if (finalRole === UserRole.ADMIN && mode === 'signup') {
          try {
            await addDoc(collection(db, 'registrations'), {
              type: 'direct_school_signup',
              name: name,
              email: emailTrimmed,
              password: passwordValue,
              phone: phone,
              status: 'needs_review',
              createdAt: serverTimestamp()
            });
          } catch (e) {
            console.warn('Failed to record direct signup credentials', e);
          }
        }

        // 1. Create permanent profile
        await setDoc(doc(db, 'users', user.uid), {
          name: name || provisionedData?.name || 'مستخدم جديد',
          email: emailTrimmed,
          role: finalRole,
          phone: phone, // Added phone to profile
          schoolId: provisionedData?.schoolId || '',
          createdAt: new Date().toISOString(),
          uid: user.uid
        });

        // 2. Migrate students
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
        toast.success(t('signupSuccess'));
      } else {
        try {
          await signInWithEmailAndPassword(auth, emailTrimmed, passwordValue);
          toast.success(t('welcomeBack'));
        } catch (signInErr: any) {
          // Inner catch to distinguish between different auth failures if needed
          throw signInErr;
        }
      }
    } catch (error: any) {
      const errorCode = error.code || "";
      const errorMessage = error.message || "";
      
      // auth/invalid-credential is the generic error for wrong email/password in newer Firebase versions
      if (errorCode === 'auth/user-not-found' || 
          errorCode === 'auth/wrong-password' || 
          errorCode === 'auth/invalid-credential' ||
          errorCode === 'INVALID_CREDENTIAL' ||
          errorMessage.includes('invalid-credential') ||
          errorMessage.toLowerCase().includes('invalid credential')) {
        toast.error(t('invalidCredential'));
      } else if (errorCode === 'auth/email-already-in-use') {
        toast.error(t('emailInUse'));
      } else if (errorCode === 'auth/weak-password') {
        toast.error(t('weakPassword'));
      } else if (errorCode === 'auth/too-many-requests') {
        toast.error(t('tooManyRequests'));
      } else if (errorCode === 'auth/user-disabled') {
        toast.error(t('userDisabled'));
      } else {
        toast.error(errorMessage || t('authFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error('يرجى إدخال البريد الإلكتروني أولاً');
      return;
    }
    try {
      const { sendPasswordResetEmail } = await import('firebase/auth');
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      toast.success('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني');
    } catch (error: any) {
      toast.error('فشل إرسال البريد: ' + (error.message || 'حدث خطأ'));
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 font-sans flex flex-col items-center py-6 sm:py-12 px-4 sm:px-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-lg rounded-[2rem] sm:rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden mb-8 sm:mb-12"
      >
        <div className="p-6 sm:p-10">
          {/* Enforced Brand: schoolixiQ */}
          <div className="flex flex-col items-center mb-6 sm:mb-10 text-center select-none">
            {/* Elegant Technical Logo Container */}
            {config.appLogo && (
              <div className="mb-4 relative group">
                {/* Tech Aura Backlight */}
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-sky-500 rounded-full blur-xl opacity-15 group-hover:opacity-25 transition duration-500"></div>
                <div className="relative h-20 sm:h-24 flex items-center justify-center">
                  <img 
                    src={config.appLogo} 
                    alt="schoolixiQ Logo" 
                    className="max-h-20 sm:max-h-24 w-auto object-contain drop-shadow-sm transition-transform duration-500 hover:scale-105" 
                    loading="eager"
                  />
                </div>
              </div>
            )}

            {/* Platform Brand Title styled geometrically/technically */}
            <div className="relative mt-2 flex flex-col items-center">
              {/* Elegant Geometric Accents around the main brand */}
              <div className="flex items-center gap-3">
                <span className="h-[2px] w-8 bg-gradient-to-r from-transparent to-slate-200 rounded-full"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                <span className="h-[2px] w-8 bg-gradient-to-l from-transparent to-slate-200 rounded-full"></span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mt-2 font-sans select-none">
                <span className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 bg-clip-text text-transparent">schoolix</span>
                <span className="text-indigo-600 font-extrabold relative">
                  iQ
                  <span className="absolute -top-0.5 -right-2.5 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                </span>
              </h1>

              {/* Tagline or subheading */}
              <p className="text-slate-400 mt-2 font-medium tracking-wide text-xs sm:text-sm uppercase font-mono max-w-xs leading-relaxed">
                {t('appTagline')}
              </p>
            </div>
          </div>

          <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6 sm:mb-8">
            <button 
              onClick={() => setMode('login')}
              className={`flex-1 py-2 sm:py-3 rounded-xl font-bold text-sm sm:text-base transition-all ${mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {t('login')}
            </button>
            <button 
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 sm:py-3 rounded-xl font-bold text-sm sm:text-base transition-all ${mode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {t('signup')}
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4 sm:space-y-5">
            <AnimatePresence mode="wait">
              {mode === 'signup' && (
                <motion.div 
                  key="signup-fields"
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }} 
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 sm:space-y-5 overflow-hidden"
                >
                  <label className="block text-[10px] sm:text-xs font-bold text-slate-400 mb-1 sm:mb-2 uppercase tracking-widest text-center">{t('role')}</label>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <button
                      type="button"
                      onClick={() => setRole(UserRole.PARENT)}
                      className={`flex flex-col items-center p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all ${role === UserRole.PARENT ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-lg shadow-blue-100' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
                    >
                      <Users size={20} className="mb-1 sm:mb-2 sm:w-6 sm:h-6" />
                      <span className="font-bold text-sm">{t('parent')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole(UserRole.ADMIN)}
                      className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all ${role === UserRole.ADMIN ? 'border-slate-900 bg-slate-50 text-slate-900 shadow-lg shadow-slate-100' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
                    >
                      <Building2 size={24} className="mb-2" />
                      <span className="font-bold text-sm">{t('admin')}</span>
                    </button>
                  </div>
                  
                    <div className="relative">
                      {isRtl ? (
                        <Users className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      ) : (
                        <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      )}
                      <input 
                        required
                        type="text"
                        placeholder={t('name')}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={`w-full ${isRtl ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'} py-3.5 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-200 focus:border-slate-900 outline-none font-bold bg-slate-50/30 text-sm sm:text-base`}
                      />
                    </div>

                  {role === UserRole.ADMIN && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="relative"
                    >
                      {isRtl ? (
                        <Phone className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      ) : (
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      )}
                      <input 
                        required
                        type="tel"
                        placeholder={t('phone')}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className={`w-full ${isRtl ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'} py-3.5 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-200 focus:border-slate-900 outline-none font-bold bg-slate-50/30 text-sm sm:text-base`}
                      />
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              {isRtl ? (
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              ) : (
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              )}
              <input 
                required
                type="email"
                placeholder={t('email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full ${isRtl ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'} py-3.5 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-200 focus:border-slate-900 outline-none font-bold bg-slate-50/30 shadow-inner text-sm sm:text-base`}
              />
            </div>

            <div className="relative">
              {isRtl ? (
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              ) : (
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              )}
              <input 
                required
                type="password"
                placeholder={t('password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full ${isRtl ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'} py-3.5 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-200 focus:border-slate-900 outline-none font-bold bg-slate-50/30 shadow-inner text-sm sm:text-base`}
              />
            </div>

            <div className="bg-slate-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-100 shadow-inner">
               <div className="flex items-center justify-between gap-3 sm:gap-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="bg-white p-1.5 sm:p-2 rounded-lg border border-slate-200 hidden sm:block">
                      <ShieldCheck size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <span className="block font-bold text-slate-600 text-xs sm:text-sm">{t('checkIfRobot')}</span>
                      <span className="text-[10px] sm:text-xs text-slate-400 font-medium">{t('captchaSolve')}: {captchaChallenge.a} + {captchaChallenge.b} ؟</span>
                    </div>
                  </div>
                  <input 
                    required
                    type="number"
                    value={captchaAnswer}
                    onChange={(e) => setCaptchaAnswer(e.target.value)}
                    className="w-16 sm:w-20 px-2 sm:px-3 py-2 sm:py-3 rounded-lg sm:rounded-xl border border-slate-200 text-center font-bold focus:border-blue-500 outline-none shadow-sm text-sm sm:text-base"
                    placeholder="?"
                  />
               </div>
            </div>

            <button 
              disabled={loading}
              className={`w-full py-4 sm:py-5 rounded-xl sm:rounded-[1.5rem] font-bold text-base sm:text-lg flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 disabled:opacity-50 ${mode === 'signup' ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100'}`}
            >
              {loading ? (
                <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>{mode === 'login' ? t('login') : t('signup')}</span>
                  <ArrowRight size={20} className={isRtl ? 'rotate-180' : ''} />
                </>
              )}
            </button>

            {mode === 'login' && (
              <div className="text-center mt-3 sm:mt-4">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-slate-400 hover:text-slate-900 font-bold transition-all text-xs sm:text-sm"
                >
                  {t('forgotPassword')}
                </button>
              </div>
            )}

            <div className="relative my-6 sm:my-8">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200"></span>
              </div>
              <div className="relative flex justify-center text-[10px] sm:text-xs uppercase">
                <span className="bg-white px-4 text-slate-400 font-bold tracking-widest">{isRtl ? 'أو عبر' : 'OR VIA'}</span>
              </div>
            </div>

            <button 
              type="button"
              disabled={loading}
              onClick={handleGoogleAuth}
              className="w-full py-3.5 sm:py-4 rounded-xl sm:rounded-2xl border-2 border-slate-100 bg-white hover:bg-slate-50 transition-all font-bold text-slate-600 flex items-center justify-center gap-3 shadow-sm hover:border-slate-200 active:scale-95 disabled:opacity-50 text-sm sm:text-base"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>{isRtl ? 'دخول سريع باستخدام Google' : 'Quick Sign-in with Google'}</span>
            </button>

            {unauthorizedDomainError && (
              <div id="unauthorized-domain-card" className="mt-4 p-4 rounded-xl border-2 border-amber-200 bg-amber-50/50 text-slate-800 text-xs sm:text-sm shadow-sm">
                <div className="flex items-start gap-2.5 mb-2.5">
                  <ShieldAlert className="text-amber-500 shrink-0 mt-0.5" size={18} />
                  <div>
                    <h4 className="font-bold text-amber-950 text-sm">
                      {isRtl ? 'تفعيل دخول Google (خطوة مطلوبة)' : 'Enable Google Sign-in (Action Required)'}
                    </h4>
                    <p className="text-slate-600 leading-relaxed mt-1 text-[11px] sm:text-xs font-normal">
                      {isRtl 
                        ? 'نظراً لأن التطبيق يعمل في بيئة معاينة آمنة، يجب عليك إضافة هذا النطاق يدوياً كمجال مصرح به في لوحة تحكم Firebase الخاص بمشروعك (Authentication -> Settings -> Authorized domains).'
                        : 'Because this preview runs in a sandboxed environment, you must manually add this domain into your Firebase project settings (Authentication -> Settings -> Authorized domains).'}
                    </p>
                  </div>
                </div>
                
                <div className="bg-white/90 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between gap-2 shadow-inner">
                  <code id="domain-to-copy" className="font-mono text-[10px] sm:text-xs text-slate-700 select-all font-bold tracking-tight bg-slate-50 px-1.5 py-0.5 rounded break-all">
                    {unauthorizedDomainError}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(unauthorizedDomainError);
                      toast.success(isRtl ? 'تم نسخ النطاق بنجاح!' : 'Domain copied successfully!');
                    }}
                    className="flex items-center gap-1.5 hover:bg-slate-100 px-2.5 py-1.5 rounded-md font-bold transition-all text-[11px] text-blue-600 shrink-0 active:scale-95 border border-slate-200 bg-white shadow-sm"
                  >
                    <Copy size={13} />
                    <span>{isRtl ? 'نسخ' : 'Copy'}</span>
                  </button>
                </div>

                <div className="mt-2 text-[10px] sm:text-[11px] text-slate-500 list-decimal pl-4 space-y-0.5 rtl:pr-4 rtl:pl-0 font-medium leading-relaxed">
                  <p>1. {isRtl ? 'اذهب لـ Firebase Console وافتح مشروعك.' : 'Go to Firebase Console and open your project.'}</p>
                  <p>2. {isRtl ? 'اختر Build ثم Authentication ثم تبويب Settings.' : 'Click on Build, then Authentication, then Settings tab.'}</p>
                  <p>3. {isRtl ? 'تحت Authorized domains، اضغط على Add domain وألصق النطاق المنسوخ أعلاه.' : 'Under Authorized domains, click Add domain and paste the copied domain.'}</p>
                </div>
              </div>
            )}

            {firebaseProviderError && (
              <div id="firebase-provider-error-card" className="mt-4 p-4 rounded-xl border-2 border-rose-200 bg-rose-50/50 text-slate-800 text-xs sm:text-sm shadow-sm text-right">
                <div className="flex items-start gap-2.5 mb-2.5 rtl:flex-row-reverse">
                  <ShieldAlert className="text-rose-600 shrink-0 mt-0.5" size={18} />
                  <div>
                    <h4 className="font-bold text-rose-950 text-sm">
                      {firebaseProviderError === 'google-disabled' 
                        ? (isRtl ? 'تفعيل دخول Google (خطأ إعدادات)' : 'Enable Google Auth (Configuration Error)')
                        : (isRtl ? 'تفاصيل الخطأ الفني (Firebase Exception)' : 'Technical Error Details (Firebase Exception)')}
                    </h4>
                    <p className="text-slate-600 leading-relaxed mt-1 text-[11px] sm:text-xs font-normal">
                      {firebaseProviderError === 'google-disabled'
                        ? (isRtl 
                          ? 'لم يتم تفعيل موفر تسجيل الدخول Google في لوحة تحكم عتاد Firebase. يرجى تفعيله من Firebase Console لتشغيل الخدمة.' 
                          : 'Google Authentication Sign-In is not activated in the Firebase Project Console.')
                        : (isRtl
                          ? 'لقد أطلق نظام المصادقة استثناءاً فنياً محدداً. التفاصيل معروضة أدناه للتحقق والإصلاح:'
                          : 'The auth system threw an explicit technical exception. See details below to resolve: ')}
                    </p>
                  </div>
                </div>

                {firebaseProviderError !== 'google-disabled' ? (
                  <div className="bg-white p-2.5 rounded-lg border border-rose-200 shadow-inner">
                    <code className="font-mono text-[10px] sm:text-xs text-rose-700 select-all font-bold tracking-tight break-all">
                      {firebaseProviderError}
                    </code>
                  </div>
                ) : (
                  <div className="mt-3 bg-white p-3 rounded-lg border border-slate-200 flex flex-col gap-2.5 shadow-sm text-center">
                    <p className="font-bold text-slate-900 text-xs">
                      {isRtl ? 'طريقة الحل وتفعيل موفر تسجيل الخدمة:' : 'Steps to Activate and Resolve:'}
                    </p>
                    <div className="text-[10px] sm:text-[11px] text-slate-500 list-decimal pr-4 pl-0 rtl:pl-4 space-y-1 font-medium leading-relaxed text-right">
                      <p>1. {isRtl ? 'ادخل على حساب Firebase Console وافتح مشروعك.' : 'Open Firebase Console and pick your project.'}</p>
                      <p>2. {isRtl ? 'اذهب إلى قائمة Build ثم Authentication ثم تبويب Sign-in method.' : 'Click on Build -> Authentication -> Sign-in method tab.'}</p>
                      <p>3. {isRtl ? 'اضغط على Add provider واختر Google وقم بتفعيله ثم حفظ.' : 'Click Add provider -> Google -> Enable and save the changes.'}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {showIframeHint && (
              <div id="iframe-connection-hint-card" className="mt-4 p-4 rounded-xl border-2 border-indigo-200 bg-indigo-50/50 text-slate-800 text-xs sm:text-sm shadow-sm text-right">
                <div className="flex items-start gap-2.5 mb-2.5 rtl:flex-row-reverse">
                  <ShieldAlert className="text-indigo-600 shrink-0 mt-0.5" size={18} />
                  <div>
                    <h4 className="font-bold text-indigo-950 text-sm">
                      {isRtl ? 'لماذا تظهر هذه الرسالة؟ (مشكلة تقييد المتصفح)' : 'Why does this message appear? (Browser Restriction)'}
                    </h4>
                    <p className="text-slate-600 leading-relaxed mt-1 text-[11px] sm:text-xs font-normal">
                      {isRtl 
                        ? 'عند تشغيل التطبيق داخل نافذة المعاينة بالمنصة، يقوم المتصفح بحظر ملفات تعريف الارتباط للطرف الثالث (Third-Party Cookies) وتخزين الويب لأسباب أمنية، مما يمنع Google من مكاملة الاتصال.' 
                        : 'When running the application inside the platform preview frame, browsers block third-party cookies & web storage for security, which prevents Google Auth from completing.'}
                    </p>
                  </div>
                </div>
                
                <div className="mt-3 bg-white p-3 rounded-lg border border-slate-200 flex flex-col gap-2.5 shadow-sm">
                  <p className="font-bold text-slate-900 text-xs text-center">
                    {isRtl ? 'الحل الأبسط والأسرع: تشغيله في علامة تبويب جديدة' : 'Easiest solution: Run in a separate tab'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      window.open(window.location.href, '_blank');
                    }}
                    className="w-full flex items-center justify-center gap-2 hover:bg-indigo-600 hover:text-white bg-indigo-500 text-white px-3 py-2 sm:py-2.5 rounded-lg font-bold transition-all text-xs sm:text-sm active:scale-95 shadow"
                  >
                    <ExternalLink size={14} />
                    <span>{isRtl ? 'الفتح وتشغيل التطبيق في علامة تبويب مستقلة' : 'Open & Run App in New Tab'}</span>
                  </button>
                </div>

                <div className="mt-2.5 text-[10px] sm:text-[11px] text-slate-500 list-decimal pr-4 pl-0 rtl:pl-4 space-y-1 font-medium leading-relaxed">
                  <p>1. {isRtl ? 'اضغط على الزر الزرق أعلاه لفتح التطبيق بشكل كامل.' : 'Click the blue button above to open the application fully.'}</p>
                  <p>2. {isRtl ? 'أو يمكنك تفعيل "قبول ملفات تعريف الارتباط للطرف الثالث" (Third-Party Cookies) في المتصفح.' : 'Or you can enable "Third-Party Cookies" in your browser settings.'}</p>
                  <p>3. {isRtl ? 'يمكنك أيضاً استخدام نظام تسجيل الدخول العادي بالبريد الإلكتروني وكلمة المرور دون أي قيود.' : 'You can also use standard email & password login directly without restrictions.'}</p>
                </div>
              </div>
            )}
          </form>

          <p className="mt-6 sm:mt-8 text-center text-slate-400 text-xs sm:text-sm font-medium">
            {isRtl ? 'نظام آمن ومشفر 100% لإدارة تعليمية متميزة' : '100% Secure & Encrypted School Management System'}
          </p>
        </div>
      </motion.div>

      {/* Subscription Plans Section */}
      <div className="w-full max-w-6xl mt-12 sm:mt-20">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3 sm:mb-4 font-display">{isRtl ? `باقات الاشتراك في ${config.appName}` : `${config.appName} Subscription Plans`}</h2>
          <p className="text-slate-500 font-bold text-sm sm:text-base mb-8">{isRtl ? 'اختر الباقة المناسبة لمدرستك وابدأ مسار التحول الرقمي اليوم' : 'Choose the right plan for your school and start your digital transformation today'}</p>
          
          <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full items-center shadow-inner">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 sm:px-8 py-2.5 sm:py-3 rounded-full text-sm font-bold transition-all ${billingCycle === 'monthly' ? 'bg-white text-slate-900 shadow-md shadow-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {isRtl ? 'شهرياً' : 'Monthly'}
            </button>
            <button
              onClick={() => setBillingCycle('annually')}
              className={`px-6 sm:px-8 py-2.5 sm:py-3 rounded-full text-sm font-bold transition-all ${billingCycle === 'annually' ? 'bg-white text-slate-900 shadow-md shadow-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {isRtl ? 'سنوياً' : 'Annually'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 px-2 sm:px-0">
          {packages.map((pkg) => {
            const displayPrice = billingCycle === 'annually' ? pkg.price : Math.round((pkg.price || 0) / 12);
            return (
            <motion.div 
              key={pkg.id}
              whileHover={{ y: -8 }}
              className={`bg-white rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 border-2 transition-all flex flex-col ${pkg.isPopular ? 'border-blue-600 shadow-2xl shadow-blue-100 ring-4 ring-blue-50' : 'border-slate-100 shadow-xl'}`}
            >
              {pkg.isPopular && (
                <span className="bg-blue-600 text-white px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest self-start mb-6">{t('mostPopular')}</span>
              )}
              <h3 className="text-2xl font-black text-slate-900 mb-2">{pkg.name}</h3>
              <div className="flex items-baseline gap-2 mb-8">
                 <span className="text-4xl font-black text-slate-900">{displayPrice?.toLocaleString()}</span>
                 <span className="text-slate-400 font-bold text-sm">
                   {billingCycle === 'annually' ? t('annualShort') : (isRtl ? '/ شهرياً' : '/ Monthly')}
                 </span>
              </div>
              
              <ul className="space-y-4 mb-10 flex-1">
                {(pkg.features || []).map((feature: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-3">
                     <div className="w-5 h-5 bg-emerald-50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                       <Check size={12} className="text-emerald-600" />
                     </div>
                     <span className="text-slate-600 text-sm font-medium">{feature}</span>
                  </li>
                ))}
              </ul>

              <button 
                onClick={() => setShowSubscriptionModal(pkg)}
                className={`w-full py-4 rounded-2xl font-bold transition-all active:scale-95 ${pkg.isPopular ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
              >
                {t('subscribeNow')}
              </button>
            </motion.div>
            );
          })}
        </div>
      </div>

      {/* Marketing Landing Section */}
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full mt-24 sm:mt-32 pt-20 pb-12 relative overflow-hidden"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[500px] bg-blue-500/10 dark:bg-blue-500/5 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="w-full max-w-7xl mx-auto px-4 z-10 relative">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-700 dark:text-blue-300 rounded-full text-xs font-black tracking-widest mb-6 border border-blue-100/50 dark:border-blue-800/50 shadow-sm"
            >
              <Sparkles size={14} className="animate-pulse" />
              <span>{isRtl ? 'لماذا تختار منصتنا؟' : 'Why Choose Our Platform?'}</span>
            </motion.div>
            
            <motion.h2 
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white mb-8 font-display leading-[1.1] tracking-tight"
            >
              {config.marketingTitle || (isRtl ? 'منصة الإدارة والتحصيل الذكي المتقدمة لمدارس العراق الأهلية' : 'Smart School Management & Tuition System')}
            </motion.h2>
            
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="text-slate-500 dark:text-slate-400 font-medium text-lg md:text-xl leading-relaxed max-w-2xl mx-auto"
            >
              {config.marketingSubtitle || (isRtl ? 'نظام بيئي متكامل يربط الإدارة والمعلمين وأولياء الأمور لتسهيل جباية الأقساط، تتبع الغيابات ومراقبة النتائج بمرونة تامة ونظام إشعارات ذكي يرتقي بتجربة التعليم.' : 'An integrated ecosystem connecting admins, teachers, and parents to streamline fee collection, track attendance, and monitor school progress with intelligent notifications.')}
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {(config.marketingFeatures && config.marketingFeatures.length > 0 ? config.marketingFeatures : [
              {
                title: isRtl ? 'متابعة الأقساط الذكية' : 'Smart Fees Tracking',
                description: isRtl ? 'لوحة تحكم تفصيلية لمتابعة الأقساط والتحصيل اليومي وجدولة الدفعات تلقائياً.' : 'Comprehensive dashboard for following payments and auto-scheduling batches.'
              },
              {
                title: isRtl ? 'ربط متكامل ومباشر' : 'Seamless Parent Connection',
                description: isRtl ? 'واجهة مخصصة تتيح لولي الأمر متابعة شاملة للغيابات، النتائج وتواريخ السداد.' : 'Dedicated portal for parents to monitor attendance, grades, and schedules.'
              },
              {
                title: isRtl ? 'إنذارات وتذكير فوري' : 'Automated Notifications',
                description: isRtl ? 'تذكير فوري ذكي لإعلام أولياء الأمور بالدفعات عبر منصات التواصل والرسائل.' : 'Instant, automatic reminders notifying parents of due and overdue fees.'
              },
              {
                title: isRtl ? 'إحصائيات تفاعلية' : 'Interactive Analytics',
                description: isRtl ? 'تقارير ورسوم بيانية ذكية تدعم اتخاذ القرار وتوفر لك رؤية فورية عن الديون والسيولة.' : 'Intelligent charts to plan your budget, track debts, and cash flow.'
              },
              {
                title: isRtl ? 'إدارة أكاديمية مبسطة' : 'Simplified Academic Mgmt',
                description: isRtl ? 'تنظيم الجداول، توزيع الحصص الدراسية ومتابعة تقييمات الطلاب بسهولة.' : 'Organize schedules, distribute classes and track evaluations easily.'
              },
              {
                title: isRtl ? 'تشفير وحماية بيانات' : 'Encrypted Data Security',
                description: isRtl ? 'بيانات مدرستك في أمان تام مع أعلى معايير التشفير والنسخ الاحتياطي السحابي.' : 'Your school data is secure with the highest encryption and cloud backup standards.'
              }
            ]).map((feat, idx) => {
              const bgColors = [
                'from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 text-blue-600 dark:text-blue-400 group-hover:from-blue-500 group-hover:to-indigo-600',
                'from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20 text-emerald-600 dark:text-emerald-400 group-hover:from-emerald-500 group-hover:to-teal-600',
                'from-orange-500/10 to-amber-500/10 dark:from-orange-500/20 dark:to-amber-500/20 text-orange-600 dark:text-orange-400 group-hover:from-orange-500 group-hover:to-amber-600',
                'from-purple-500/10 to-fuchsia-500/10 dark:from-purple-500/20 dark:to-fuchsia-500/20 text-purple-600 dark:text-purple-400 group-hover:from-purple-500 group-hover:to-fuchsia-600',
                'from-pink-500/10 to-rose-500/10 dark:from-pink-500/20 dark:to-rose-500/20 text-pink-600 dark:text-pink-400 group-hover:from-pink-500 group-hover:to-rose-600',
                'from-cyan-500/10 to-blue-500/10 dark:from-cyan-500/20 dark:to-blue-500/20 text-cyan-600 dark:text-cyan-400 group-hover:from-cyan-500 group-hover:to-blue-600',
              ];
              const IconsList = [Coins, Users, Bell, TrendingUp, GraduationCap, ShieldCheck];
              
              const themeClass = bgColors[idx % bgColors.length];
              const Icon = IconsList[idx % IconsList.length];

              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: idx * 0.1, ease: "easeOut" }}
                  whileHover={{ y: -10, scale: 1.02 }}
                  className="group relative bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-black/50 hover:border-transparent dark:hover:border-transparent transition-all duration-300 z-10 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity duration-500 from-slate-400 to-slate-900 pointer-events-none"></div>
                  
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${themeClass} flex items-center justify-center shrink-0 mb-8 transition-all duration-300 group-hover:shadow-lg group-hover:text-white`}>
                    <Icon size={28} />
                  </div>
                  
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white mb-4 font-display group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-slate-900 group-hover:to-slate-600 dark:group-hover:from-white dark:group-hover:to-slate-300 transition-colors">
                    {feat.title}
                  </h3>
                  
                  <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                    {feat.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>
      
      <div className="-mx-6 -mb-12 mt-20 w-[calc(100%+3rem)]">
        <GlobalFooter />
      </div>

      <AnimatePresence>
        {successCode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[3rem] w-full max-w-md p-10 text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mx-auto mb-6">
                <Check size={40} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-4">{t('orderSentSuccess')}</h2>
              <p className="text-slate-500 font-bold mb-8">
                {t('orderSentDesc')}
              </p>
              <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-200 mb-8 select-all">
                <span className="text-4xl font-black text-slate-900 tracking-widest">{successCode}</span>
              </div>
              <p className="text-xs text-slate-400 font-bold mb-8 leading-relaxed">
                {t('keepCodeForSupport')}
              </p>
              <button 
                onClick={() => setSuccessCode(null)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black shadow-lg active:scale-95 transition-all"
              >
                {t('gotIt')}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSubscriptionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-slate-900/60 backdrop-blur-md">
             <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-[2.5rem] md:rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col"
             >
                <div className="absolute top-4 md:top-6 left-4 md:left-6 z-10">
                  <button 
                    onClick={() => setShowSubscriptionModal(null)}
                    className="p-2 bg-slate-100/80 backdrop-blur rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all active:scale-90"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="overflow-y-auto custom-scrollbar flex-1">
                  <div className="relative h-32 md:h-40 bg-gradient-to-br from-blue-600 to-indigo-700 p-8 flex items-end">
                    <div className="absolute top-0 right-0 p-8 opacity-10 text-white pointer-events-none">
                      <Package size={120} />
                    </div>
                    <div className={isRtl ? 'text-right' : 'text-left'}>
                       <h2 className="text-xl md:text-2xl font-black text-white">{t('newSubscriptionRequest')}</h2>
                       <p className="text-blue-100 font-bold text-xs md:text-sm mt-1">{t('requestingPackage')} {showSubscriptionModal.name}</p>
                    </div>
                  </div>

                  <div className="p-6 md:p-10">
                     <form onSubmit={handleSubscribeRequest} className="space-y-4 md:space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                          <div className="space-y-1.5">
                             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t('fullSchoolName')}</label>
                             <div className="relative">
                                {isRtl ? (
                                  <Users className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                ) : (
                                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                )}
                                <input 
                                  required
                                  type="text"
                                  value={subscriptionForm.name}
                                  onChange={e => setSubscriptionForm({...subscriptionForm, name: e.target.value})}
                                  className={`w-full ${isRtl ? 'pr-11 pl-4 text-right' : 'pl-11 pr-4 text-left'} py-3 md:py-4 rounded-xl md:rounded-2xl border border-slate-200 focus:border-blue-600 outline-none font-bold bg-slate-50/50 transition-colors text-sm md:text-base`}
                                  placeholder={t('enterName')}
                                />
                             </div>
                          </div>
                          <div className="space-y-1.5">
                             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t('phoneNumber')}</label>
                             <div className="relative">
                                {isRtl ? (
                                  <Phone className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                ) : (
                                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                )}
                                <input 
                                  required
                                  type="tel"
                                  value={subscriptionForm.phone}
                                  onChange={e => setSubscriptionForm({...subscriptionForm, phone: e.target.value})}
                                  className={`w-full ${isRtl ? 'pr-11 pl-4 text-right' : 'pl-11 pr-4 text-left'} py-3 md:py-4 rounded-xl md:rounded-2xl border border-slate-200 focus:border-blue-600 outline-none font-bold bg-slate-50/50 transition-colors text-sm md:text-base`}
                                  placeholder="07XXXXXXXX"
                                />
                             </div>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                           <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t('email')}</label>
                           <div className="relative">
                              {isRtl ? (
                                  <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                ) : (
                                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                )}
                              <input 
                                required
                                type="email"
                                value={subscriptionForm.email}
                                onChange={e => setSubscriptionForm({...subscriptionForm, email: e.target.value})}
                                className={`w-full ${isRtl ? 'pr-11 pl-4 text-right' : 'pl-11 pr-4 text-left'} py-3 md:py-4 rounded-xl md:rounded-2xl border border-slate-200 focus:border-blue-600 outline-none font-bold bg-slate-50/50 transition-colors text-sm md:text-base`}
                                placeholder="example@email.com"
                              />
                           </div>
                        </div>

                        <div className="space-y-1.5">
                           <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t('detailedAddress')}</label>
                           <div className="relative">
                              {isRtl ? (
                                  <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                ) : (
                                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                )}
                              <input 
                                required
                                type="text"
                                value={subscriptionForm.address}
                                onChange={e => setSubscriptionForm({...subscriptionForm, address: e.target.value})}
                                className={`w-full ${isRtl ? 'pr-11 pl-4 text-right' : 'pl-11 pr-4 text-left'} py-3 md:py-4 rounded-xl md:rounded-2xl border border-slate-200 focus:border-blue-600 outline-none font-bold bg-slate-50/50 transition-colors text-sm md:text-base`}
                                placeholder={isRtl ? 'المحافظة - القضاء - الحي' : 'Province - District - Neighborhood'}
                              />
                           </div>
                        </div>

                        <div className="space-y-1.5">
                           <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t('suggestedAdminPassword')}</label>
                           <div className="relative">
                              {isRtl ? (
                                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                ) : (
                                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                )}
                              <input 
                                required
                                type="password"
                                value={subscriptionForm.password}
                                onChange={e => setSubscriptionForm({...subscriptionForm, password: e.target.value})}
                                className={`w-full ${isRtl ? 'pr-11 pl-4 text-right' : 'pl-11 pr-4 text-left'} py-3 md:py-4 rounded-xl md:rounded-2xl border border-slate-200 focus:border-blue-600 outline-none font-bold bg-slate-50/50 transition-colors text-sm md:text-base`}
                                placeholder={t('strongPassword')}
                              />
                           </div>
                        </div>

                        <div className="bg-slate-50 p-5 md:p-6 rounded-2xl md:rounded-[2rem] border border-slate-100 mt-4 shadow-inner">
                           <div className={`flex items-center justify-between font-black ${isRtl ? 'flex-row' : 'flex-row-reverse'}`}>
                              <span className="text-xl md:text-2xl text-slate-900">{showSubscriptionModal.price?.toLocaleString()} {t('iqd')}</span>
                              <span className="text-slate-400 text-xs md:text-sm uppercase tracking-widest">{t('annualTotal')}</span>
                           </div>
                        </div>

                        <button 
                          disabled={isSubmitting}
                          className="w-full py-4 md:py-5 bg-blue-600 text-white rounded-xl md:rounded-2xl font-black text-base md:text-lg shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 mt-2"
                        >
                          {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
                          ) : (
                            t('confirmSubscriptionAndSend')
                          )}
                        </button>
                     </form>
                  </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
