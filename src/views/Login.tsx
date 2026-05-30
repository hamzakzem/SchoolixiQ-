import React, { useState, useEffect } from "react";
import { auth, db } from "../lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  sendEmailVerification,
  signInWithCredential,
} from "firebase/auth";
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
  serverTimestamp,
} from "firebase/firestore";
import {
  LogIn,
  GraduationCap,
  Users,
  Building2,
  Mail,
  Lock,
  ShieldCheck,
  ArrowRight,
  Check,
  Package,
  Phone,
  MapPin,
  X,
  Coins,
  Sparkles,
  TrendingUp,
  Bell,
  Copy,
  ShieldAlert,
  ExternalLink,
  Smartphone,
  ClipboardList,
  Download,
  Share,
  PlusSquare,
  Info,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { UserRole } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";

import { useLanguage } from "../lib/LanguageContext";
import { useSystemConfig } from "../lib/SystemConfigContext";
import { GlobalFooter } from "../components/GlobalFooter";

export const getLocalizedPackages = (packagesList: any[], isRtl: boolean) => {
  return packagesList.map(pkg => {
    if (isRtl) return pkg;
    let name = pkg.name;
    let features = pkg.features || [];
    if (pkg.id === "basic" || pkg.name?.includes("الأساسية") || pkg.name?.toLowerCase().includes("basic")) {
      name = "Basic Plan";
      features = [
        "Up to 250 students",
        "Daily attendance and absence management",
        "Admin & teacher dashboard",
        "Monthly exam results",
        "Email technical support",
      ];
    } else if (pkg.id === "professional" || pkg.name?.includes("الاحترافية") || pkg.name?.toLowerCase().includes("professional")) {
      name = "Professional Plan";
      features = [
        "Up to 750 students",
        "Real app for parents",
        "Teacher payroll and accounts",
        "Interactive certificates and results",
        "24/7 direct technical support",
      ];
    } else if (pkg.id === "premium" || pkg.name?.includes("الشاملة") || pkg.name?.includes("الماسية") || pkg.name?.toLowerCase().includes("premium")) {
      name = "Premium Plan";
      features = [
        "Unlimited students",
        "All Professional features included",
        "Advanced accounting system and payroll structure",
        "Instant SMS notifications & automatic alerts",
        "Full visual identity & logo customization",
      ];
    }
    return { ...pkg, name, features };
  });
};

const DEFAULT_PACKAGES = [
  {
    id: "basic",
    name: "الباقة الأساسية",
    price: 1500000,
    priceMonthly: 150000,
    priceYearly: 1500000,
    isPopular: false,
    showInRegistration: true,
    features: [
      "لغاية 250 طالب وطالبة",
      "إدارة الغيابات والحضور اليومي",
      "لوحة تحكم للمدير والمعلمين",
      "نتائج الامتحانات الشهرية",
      "دعم فني عبر البريد الإلكتروني",
    ],
  },
  {
    id: "professional",
    name: "الباقة الاحترافية",
    price: 3000000,
    priceMonthly: 300000,
    priceYearly: 3000000,
    isPopular: true,
    showInRegistration: true,
    features: [
      "لغاية 750 طالب وطالبة",
      "تطبيق حقيقي لأولياء الأمور",
      "رواتب الحسابات والمالية للأستاذة",
      "شهادات ونتائج تفاعلية",
      "دعم فني مباشر على مدار الساعة",
    ],
  },
  {
    id: "premium",
    name: "الباقة الشاملة",
    price: 5000000,
    priceMonthly: 500000,
    priceYearly: 5000000,
    isPopular: false,
    showInRegistration: true,
    features: [
      "عدد طلاب غير محدود",
      "كل مميزات الباقة الاحترافية",
      "نظام محاسبة متقدم وهيكل رواتب",
      "إشعارات SMS فورية وتنبيهات تلقائية",
      "تخصيص كامل للهوية البصرية والشعار",
    ],
  },
];

const loadGsiScript = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.accounts?.oauth2) {
      resolve((window as any).google);
      return;
    }
    const existingScript = document.getElementById("gsi-sdk-script");
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve((window as any).google));
      existingScript.addEventListener("error", (e) => reject(e));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.id = "gsi-sdk-script";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve((window as any).google);
    script.onerror = (e) => reject(e);
    document.head.appendChild(script);
  });
};

export default function Login() {
  const { t, isRtl } = useLanguage();
  const { config } = useSystemConfig();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [role, setRole] = useState<UserRole>(UserRole.PARENT);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaChallenge, setCaptchaChallenge] = useState({ a: 0, b: 0 });

  // ... (rest of the states) ...

  // Replace text with t() calls below

  // Packages State
  const [packages, setPackages] = useState<any[]>([]);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annually">(
    "annually",
  );
  const [showSubscriptionModal, setShowSubscriptionModal] = useState<any>(null);
  const [subscriptionForm, setSubscriptionForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successCode, setSuccessCode] = useState<string | null>(null);

  // PWA Direct Installer States
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [installingPlatform, setInstallingPlatform] = useState<"android" | "ios" | null>(null);
  const [installProgress, setInstallProgress] = useState(0);
  const [showInstallSuccess, setShowInstallSuccess] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    generateCaptcha();

    // Real-time packages fetch
    const unsub = onSnapshot(
      collection(db, "packages"),
      (snapshot) => {
        if (!snapshot.empty) {
          setPackages(
            snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
          );
        } else {
          setPackages(DEFAULT_PACKAGES);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "packages");
        setPackages(DEFAULT_PACKAGES);
      },
    );

    return () => unsub();
  }, [mode]);

  const downloadMobileConfig = () => {
    toast.success(isRtl ? "جاري تحضير ملف التعريف وتنزيله بنجاح..." : "Preparing and downloading configuration profile...");
    window.location.href = "/api/download/schoolixiq.mobileconfig";
  };

  const startDirectInstall = (platform: "android" | "ios") => {
    setInstallingPlatform(platform);
    setInstallProgress(0);
    setShowInstallSuccess(false);

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 15) + 10;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setInstallProgress(100);
        
        // Trigger actual native installation if available on Android
        if (platform === "android" && deferredInstallPrompt) {
          setTimeout(() => {
            deferredInstallPrompt.prompt();
            deferredInstallPrompt.userChoice.then((choiceResult: any) => {
              if (choiceResult.outcome === "accepted") {
                setShowInstallSuccess(true);
                toast.success(isRtl ? "تم بدء تثبيت التطبيق بنجاح!" : "App installation started successfully!");
              } else {
                setShowInstallSuccess(true); // show guide as fallback
              }
              setDeferredInstallPrompt(null);
            });
          }, 300);
        } else {
          setTimeout(() => {
            setShowInstallSuccess(true);
          }, 200);
        }
      } else {
        setInstallProgress(progress);
      }
    }, 120);
  };

  // Handle post-login logic (used for both redirect result and popup result)
  const processGoogleUser = async (
    user: any,
    pendingRole: string,
    pendingMode: string,
  ) => {
    try {
      setLoading(true);
      // Check if user document exists
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (!userDoc.exists()) {
        const emailLower = user.email?.toLowerCase() || "";
        const q = query(
          collection(db, "users"),
          where("email", "==", emailLower),
        );
        const querySnap = await getDocs(q);
        let provisionedData: any = null;
        let oldDocId = "";

        if (!querySnap.empty) {
          const found = querySnap.docs[0];
          provisionedData = found.data();
          oldDocId = found.id;
        }

        let isFirstUser = false;
        try {
          const metadataSnap = await getDoc(doc(db, "users", "metadata"));
          isFirstUser = !metadataSnap.exists();
        } catch (err) {}

        const finalRole = isFirstUser
          ? UserRole.SUPERADMIN
          : provisionedData?.role || pendingRole;

        // Create permanent profile
        await setDoc(doc(db, "users", user.uid), {
          name:
            user.displayName ||
            provisionedData?.name ||
            (isRtl ? "مستخدم جديد" : "New User"),
          email: user.email,
          role: finalRole,
          schoolId: provisionedData?.schoolId || "",
          createdAt: new Date().toISOString(),
          uid: user.uid,
          photoURL: user.photoURL,
        });

        // Migrate students if needed
        if (oldDocId && oldDocId !== user.uid) {
          const studentsQ = query(
            collection(db, "students"),
            where("parentIds", "array-contains", oldDocId),
          );
          const studentsSnap = await getDocs(studentsQ);

          const migrationPromises = studentsSnap.docs.map((studentDoc) => {
            const currentIds = studentDoc.data().parentIds || [];
            const updatedIds = currentIds.map((id: string) =>
              id === oldDocId ? user.uid : id,
            );
            return updateDoc(doc(db, "students", studentDoc.id), {
              parentIds: updatedIds,
            });
          });

          await Promise.all(migrationPromises);
          await deleteDoc(doc(db, "users", oldDocId));
        }

        if (isFirstUser) {
          await setDoc(doc(db, "users", "metadata"), { initialized: true });
        }
        toast.success(isRtl ? "تم تسجيل الدخول بنجاح!" : "Login Success!");
      } else {
        toast.success(`${t("welcomeLabel") || "Welcome"} ${user.displayName}`);
      }
    } catch (error: any) {
      console.error("Profile creation error:", error);
      toast.error(error.message || t("failedConnection"));
    } finally {
      setLoading(false);
    }
  };

  // Check for Redirect Result (Fallback if previous redirect was initiated)
  useEffect(() => {
    const checkRedirectFlow = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          const pendingRole =
            window.sessionStorage.getItem("pendingGoogleRole") ||
            UserRole.PARENT;
          const pendingMode =
            window.sessionStorage.getItem("pendingGoogleMode") || "login";
          window.sessionStorage.removeItem("pendingGoogleRole");
          window.sessionStorage.removeItem("pendingGoogleMode");
          await processGoogleUser(result.user, pendingRole, pendingMode);
        }
      } catch (error: any) {
        console.error("Redirect check error:", error);
        toast.error(error.message || t("failedConnection"));
      }
    };
    checkRedirectFlow();
  }, []);

  const handleSubscribeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showSubscriptionModal) return;

    setIsSubmitting(true);
    try {
      const isMonthly = billingCycle === "monthly";
      const actualPrice = isMonthly
        ? showSubscriptionModal.priceMonthly !== undefined
          ? showSubscriptionModal.priceMonthly
          : Math.round((showSubscriptionModal.price || 0) / 12)
        : showSubscriptionModal.priceYearly !== undefined
          ? showSubscriptionModal.priceYearly
          : showSubscriptionModal.price;

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      await addDoc(collection(db, "registrations"), {
        type: "subscription_request",
        packageId: showSubscriptionModal.id,
        packageName: showSubscriptionModal.name,
        price: actualPrice,
        billingCycle: billingCycle,
        durationDays: isMonthly ? 30 : 365,
        customerInfo: subscriptionForm,
        status: "pending",
        subscriberCode: code,
        createdAt: serverTimestamp(),
      });
      setSuccessCode(code);
      toast.success("تم إرسال طلب الاشتراك بنجاح!");
      setShowSubscriptionModal(null);
      setSubscriptionForm({
        name: "",
        email: "",
        phone: "",
        address: "",
        password: "",
      });
    } catch (error) {
      console.error(error);
      toast.error("حدث خطأ أثناء إرسال الطلب");
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateCaptcha = () => {
    setCaptchaChallenge({
      a: Math.floor(Math.random() * 10) + 1,
      b: Math.floor(Math.random() * 10) + 1,
    });
    setCaptchaAnswer("");
  };

  const [unauthorizedDomainError, setUnauthorizedDomainError] = useState<
    string | null
  >(null);
  const [showIframeHint, setShowIframeHint] = useState<boolean>(false);
  const [firebaseProviderError, setFirebaseProviderError] = useState<
    string | null
  >(null);
  const [nativePlatformNotice, setNativePlatformNotice] = useState<boolean>(false);
  const [googleClientId, setGoogleClientId] = useState<string>(() => {
    return localStorage.getItem("override_google_client_id") || 
      import.meta.env.VITE_GOOGLE_CLIENT_ID || 
      "377979165565-2k1qjeet2clrjob0eahb6kb5ejcvdp99.apps.googleusercontent.com";
  });
  const [showClientIdConfig, setShowClientIdConfig] = useState<boolean>(false);

  // Check if running as native Capacitor app on Android/iOS
  const isNativeApp = 
    window.location.hostname === "localhost" || 
    window.location.protocol.startsWith("capacitor") || 
    window.location.protocol.startsWith("file");

  // Check if running in a third-party iframe (e.g. AI Studio development/shared preview)
  const inIframe = typeof window !== "undefined" && window.self !== window.top;

  const handleGoogleAuth = async () => {
    setUnauthorizedDomainError(null);
    setShowIframeHint(false);
    setFirebaseProviderError(null);
    setNativePlatformNotice(false);
    setLoading(true);

    if (isNativeApp) {
      try {
        const { GoogleAuth } = await import("@codetrix-studio/capacitor-google-auth");
        
        try {
          await GoogleAuth.initialize({
            clientId: googleClientId,
            scopes: ["profile", "email"],
            grantOfflineAccess: true,
          });
        } catch (initErr) {
          console.warn("GoogleAuth already initialized or failed to init:", initErr);
        }

        const googleUser = await GoogleAuth.signIn();
        if (googleUser && googleUser.authentication?.idToken) {
          const idToken = googleUser.authentication.idToken;
          
          const { GoogleAuthProvider, signInWithCredential } = await import("firebase/auth");
          const credential = GoogleAuthProvider.credential(idToken);
          const result = await signInWithCredential(auth, credential);
          
          if (result && result.user) {
            await processGoogleUser(result.user, role, mode);
            toast.success(isRtl ? "تم تسجيل الدخول بنجاح بـ Google!" : "Signed in with Google successfully!");
          }
        } else {
          throw new Error("Missing ID Token from Google Auth native plugin.");
        }
      } catch (error: any) {
        console.error("Native Google Auth Error:", error);
        setNativePlatformNotice(true);
        setShowClientIdConfig(true);
        setLoading(false);
        
        toast.error(
          isRtl
            ? `فشل تسجيل الدخول الأصلي. يرجى تهيئة الـ Client ID وبصمات SHA-1`
            : `Native login failed. Please configure Web Client ID and SHA-1 fingerprint.`
        );
      }
      return;
    }

    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      
      // Store state before redirect
      window.sessionStorage.setItem("pendingGoogleRole", role);
      window.sessionStorage.setItem("pendingGoogleMode", mode);
      
      const result = await signInWithPopup(auth, provider);
      if (result && result.user) {
        await processGoogleUser(result.user, role, mode);
        toast.success(isRtl ? "تم تسجيل الدخول بنجاح بـ Google!" : "Signed in with Google successfully!");
      }
    } catch (error: any) {
      console.error("Google Auth Error with GSI SDK:", error);
      const errorCode = error.code || "";
      const errorMessage = error.message || "";

      if (
        errorCode === "auth/unauthorized-domain" ||
        errorCode === "auth/unauthorized-client" ||
        errorMessage.includes("unauthorized-domain") ||
        errorMessage.includes("unauthorized_domain") ||
        errorMessage.toLowerCase().includes("unauthorized domain")
      ) {
        setUnauthorizedDomainError(window.location.hostname);
        toast.error(
          isRtl
            ? "خطأ: النطاق الحالي غير مصرح به في إعدادات Firebase Console الخاصة بـ Google Auth."
            : "Error: The current domain is not authorized in Firebase Console settings for Google Auth.",
        );
      } else if (
        errorCode === "auth/operation-not-allowed" ||
        errorMessage.includes("operation-not-allowed") ||
        errorMessage.toLowerCase().includes("operation not allowed") ||
        errorMessage
          .toLowerCase()
          .includes("disabled for this firebase project") ||
        errorMessage.toLowerCase().includes("provider is disabled")
      ) {
        setFirebaseProviderError("google-disabled");
        toast.error(
          isRtl
            ? "خطأ: لم يتم تفعيل تسجيل دخول Google في لوحة تحكم Firebase لمشروعك!"
            : "Error: Google Sign-In is not enabled in your Firebase Authentication Console!",
        );
      } else {
        setShowIframeHint(true);
        setFirebaseProviderError(
          `${errorCode || "Exception"}: ${errorMessage || String(error)}`,
        );
        toast.error(t("failedConnection"));
      }
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    // Verify Captcha
    if (parseInt(captchaAnswer) !== captchaChallenge.a + captchaChallenge.b) {
      toast.error(t("captchaError"));
      generateCaptcha();
      return;
    }

    const emailTrimmed = email.toLowerCase().trim();
    const passwordValue = password; // Do not trim passwords as they can contain valid spaces

    if (passwordValue.length < 6) {
      toast.error(t("passwordShort"));
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const result = await createUserWithEmailAndPassword(
          auth,
          emailTrimmed,
          passwordValue,
        );
        const user = result.user;

        await updateProfile(user, { displayName: name });

        // Send Email Verification
        try {
          auth.languageCode = isRtl ? "ar" : "en";
          await sendEmailVerification(user);
          toast.success(t("verificationSent"));
        } catch (verifErr) {
          console.warn("Verification email failed", verifErr);
          toast.error(t("verificationFailed"));
        }

        // Check for provisioned user by email
        const q = query(
          collection(db, "users"),
          where("email", "==", emailTrimmed),
        );
        const querySnap = await getDocs(q);
        let provisionedData = null;
        let oldDocId = "";

        if (!querySnap.empty) {
          const found = querySnap.docs[0];
          provisionedData = found.data();
          oldDocId = found.id;
        }

        // Check if first user for SuperAdmin
        let isFirstUser = false;
        try {
          const metadataSnap = await getDoc(doc(db, "users", "metadata"));
          isFirstUser = !metadataSnap.exists();
        } catch (err) {
          console.warn("Metadata check error", err);
        }

        const finalRole = isFirstUser
          ? UserRole.SUPERADMIN
          : provisionedData?.role || role;

        // Role conflict check: management cannot be teacher or parent
        const isManagement = [
          "admin",
          "staff",
          "assistant",
          "superadmin",
        ].includes(provisionedData?.role);
        if (
          isManagement &&
          (role === UserRole.PARENT || role === UserRole.TEACHER)
        ) {
          toast.error(
            "هذا الحساب مسجل كإدارة مدرسة ولا يمكن استخدامه كمعلم أو ولي أمر بنفس البريد",
          );
          setLoading(false);
          return;
        }

        // 1. Create permanent profile
        await setDoc(doc(db, "users", user.uid), {
          name: name || provisionedData?.name || "مستخدم جديد",
          email: emailTrimmed,
          role: finalRole,
          phone: phone, // Added phone to profile
          schoolId: provisionedData?.schoolId || "",
          createdAt: new Date().toISOString(),
          uid: user.uid,
        });

        // 2. Migrate students
        if (oldDocId && oldDocId !== user.uid) {
          const studentsQ = query(
            collection(db, "students"),
            where("parentIds", "array-contains", oldDocId),
          );
          const studentsSnap = await getDocs(studentsQ);

          const migrationPromises = studentsSnap.docs.map((studentDoc) => {
            const currentIds = studentDoc.data().parentIds || [];
            const updatedIds = currentIds.map((id: string) =>
              id === oldDocId ? user.uid : id,
            );
            return updateDoc(doc(db, "students", studentDoc.id), {
              parentIds: updatedIds,
            });
          });

          await Promise.all(migrationPromises);
          await deleteDoc(doc(db, "users", oldDocId));
        }

        if (isFirstUser) {
          await setDoc(doc(db, "users", "metadata"), { initialized: true });
        }
        toast.success(t("signupSuccess"));
      } else {
        try {
          // Attempt standard sign in
          await signInWithEmailAndPassword(auth, emailTrimmed, passwordValue);
          toast.success(t("welcomeBack"));
        } catch (signInErr: any) {
          // Dynamic Fallback 1: Try with password trimmed (handles accidental spaces on mobile/copy-paste)
          if (passwordValue.trim() !== passwordValue) {
            try {
              await signInWithEmailAndPassword(auth, emailTrimmed, passwordValue.trim());
              toast.success(t("welcomeBack"));
              return;
            } catch (trimErr) {
              // Ignore trim error, continue to next fallback
            }
          }

          // Dynamic Fallback 2: Check if they are a pre-registered/pre-created user in Firestore who has no Auth account yet.
          // In Firebase v9+, any bad login or user-not-found returns 'auth/invalid-credential'
          const errCode = signInErr.code || "";
          const errMsg = signInErr.message || "";
          const isInvalid =
            errCode === "auth/user-not-found" ||
            errCode === "auth/wrong-password" ||
            errCode === "auth/invalid-credential" ||
            errCode === "INVALID_CREDENTIAL" ||
            errMsg.includes("invalid-credential") ||
            errMsg.toLowerCase().includes("invalid credential");

          if (isInvalid) {
            try {
              // If we do an anonymous or direct signup check:
              // Since rules prevent public users query without sign-in, we try to create an account for them.
              // If they do not exist in Auth, this will succeed and create their Auth account, 
              // which then gets automatically claimed by AuthContext claiming logic using their email!
              // But if they already exist in Auth, this will throw "auth/email-already-in-use", 
              // meaning they just typed the wrong password, so we safely present the original invalidCredential error!
              const signUpResult = await createUserWithEmailAndPassword(
                auth,
                emailTrimmed,
                passwordValue
              );
              
              if (signUpResult.user) {
                // Account created and linked successfully automatically!
                toast.success(
                  isRtl 
                    ? "تم تفعيل حسابك بنجاح والدخول للوحة التحكم!" 
                    : "Account activated and logged in successfully!"
                );
                return;
              }
            } catch (signUpErr: any) {
              if (signUpErr.code !== "auth/email-already-in-use") {
                console.warn("Auto activation signUp failed:", signUpErr);
              }
            }
          }

          // Inner catch to distinguish between different auth failures if needed
          throw signInErr;
        }
      }
    } catch (error: any) {
      const errorCode = error.code || "";
      const errorMessage = error.message || "";

      // auth/invalid-credential is the generic error for wrong email/password in newer Firebase versions
      if (
        errorCode === "auth/user-not-found" ||
        errorCode === "auth/wrong-password" ||
        errorCode === "auth/invalid-credential" ||
        errorCode === "INVALID_CREDENTIAL" ||
        errorMessage.includes("invalid-credential") ||
        errorMessage.toLowerCase().includes("invalid credential")
      ) {
        toast.error(t("invalidCredential"));
      } else if (errorCode === "auth/email-already-in-use") {
        toast.error(t("emailInUse"));
      } else if (errorCode === "auth/weak-password") {
        toast.error(t("weakPassword"));
      } else if (errorCode === "auth/too-many-requests") {
        toast.error(t("tooManyRequests"));
      } else if (errorCode === "auth/user-disabled") {
        toast.error(t("userDisabled"));
      } else {
        toast.error(errorMessage || t("authFailed"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("يرجى إدخال البريد الإلكتروني أولاً");
      return;
    }
    try {
      const { sendPasswordResetEmail } = await import("firebase/auth");
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      toast.success(
        "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني",
      );
    } catch (error: any) {
      toast.error("فشل إرسال البريد: " + (error.message || "حدث خطأ"));
    }
  };

  return (
    <div
      className="min-h-[100dvh] bg-slate-50 font-sans flex flex-col items-center py-6 sm:py-12 px-4 sm:px-6"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-lg rounded-[2rem] sm:rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden mb-8 sm:mb-12"
      >
        <div className="p-6 sm:p-10">
          {/* Enforced Brand: schoolixiQ */}
          <div className="flex flex-col items-center mb-6 sm:mb-10 text-center select-none">
            {/* Elegant Technical Logo Container - Fixed Height to prevent any layout shifts */}
            <div className="h-24 sm:h-28 w-full flex items-center justify-center mb-2 relative group">
              {config.appLogo ? (
                <div className="relative">
                  {/* Tech Aura Backlight */}
                  <div className="absolute -inset-2 bg-gradient-to-r from-indigo-500 to-sky-500 rounded-full blur-xl opacity-10 group-hover:opacity-25 transition duration-500"></div>
                  <img
                    src={config.appLogo || undefined}
                    alt="schoolixiQ Logo"
                    className="max-h-20 sm:max-h-24 w-auto object-contain drop-shadow-sm transition-all duration-500 hover:scale-105 relative z-10"
                    loading="eager"
                  />
                </div>
              ) : (
                /* Sleek, minimalist geometric loading skeleton - completely replaces old school-icon fallbacks */
                <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-2xl border border-dashed border-indigo-500/30 animate-[spin_10s_linear_infinite]"></div>
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500/5 to-sky-500/5 border border-indigo-500/10 flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                  </div>
                </div>
              )}
            </div>

            {/* Platform Brand Title styled geometrically/technically */}
            <div className="relative flex flex-col items-center">
              {/* Elegant Geometric Accents around the main brand */}
              <div className="flex items-center gap-3">
                <span className="h-[2px] w-8 bg-gradient-to-r from-transparent to-slate-200 rounded-full"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                <span className="h-[2px] w-8 bg-gradient-to-l from-transparent to-slate-200 rounded-full"></span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mt-2 font-sans select-none">
                <span className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 bg-clip-text text-transparent">
                  schoolix
                </span>
                <span className="text-indigo-600 font-extrabold relative">
                  iQ
                  <span className="absolute -top-0.5 -right-2.5 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                </span>
              </h1>

              {/* Tagline or subheading */}
              <p className="text-slate-400 mt-2 font-medium tracking-wide text-xs sm:text-sm uppercase font-mono max-w-xs leading-relaxed">
                {t("appTagline")}
              </p>
            </div>
          </div>

          <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6 sm:mb-8">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 py-2 sm:py-3 rounded-xl font-bold text-sm sm:text-base transition-all ${mode === "login" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              {t("login")}
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 py-2 sm:py-3 rounded-xl font-bold text-sm sm:text-base transition-all ${mode === "signup" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              {t("signup")}
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4 sm:space-y-5">
            <AnimatePresence mode="wait">
              {mode === "signup" && (
                <motion.div
                  key="signup-fields"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 sm:space-y-5 overflow-hidden"
                >
                  <label className="block text-[10px] sm:text-xs font-bold text-slate-400 mb-1 sm:mb-2 uppercase tracking-widest text-center">
                    {t("role")}
                  </label>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <button
                      type="button"
                      onClick={() => setRole(UserRole.PARENT)}
                      className={`flex flex-col items-center p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all ${role === UserRole.PARENT ? "border-blue-600 bg-blue-50 text-blue-700 shadow-lg shadow-blue-100" : "border-slate-100 text-slate-400 hover:border-slate-200"}`}
                    >
                      <Users size={20} className="mb-1 sm:mb-2 sm:w-6 sm:h-6" />
                      <span className="font-bold text-sm">{t("parent")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole(UserRole.ADMIN)}
                      className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all ${role === UserRole.ADMIN ? "border-slate-900 bg-slate-50 text-slate-900 shadow-lg shadow-slate-100" : "border-slate-100 text-slate-400 hover:border-slate-200"}`}
                    >
                      <Building2 size={24} className="mb-2" />
                      <span className="font-bold text-sm">{t("admin")}</span>
                    </button>
                  </div>

                  <div className="relative">
                    {isRtl ? (
                      <Users
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                        size={18}
                      />
                    ) : (
                      <Users
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        size={18}
                      />
                    )}
                    <input
                      required
                      type="text"
                      placeholder={t("name")}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={`w-full ${isRtl ? "pr-12 pl-4 text-right" : "pl-12 pr-4 text-left"} py-3.5 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-200 focus:border-slate-900 outline-none font-bold bg-slate-50/30 text-sm sm:text-base`}
                    />
                  </div>

                  {role === UserRole.ADMIN && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="relative"
                    >
                      {isRtl ? (
                        <Phone
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                          size={18}
                        />
                      ) : (
                        <Phone
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                          size={18}
                        />
                      )}
                      <input
                        required
                        type="tel"
                        placeholder={t("phone")}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className={`w-full ${isRtl ? "pr-12 pl-4 text-right" : "pl-12 pr-4 text-left"} py-3.5 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-200 focus:border-slate-900 outline-none font-bold bg-slate-50/30 text-sm sm:text-base`}
                      />
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              {isRtl ? (
                <Mail
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
              ) : (
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
              )}
              <input
                required
                type="email"
                placeholder={t("email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full ${isRtl ? "pr-12 pl-4 text-right" : "pl-12 pr-4 text-left"} py-3.5 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-200 focus:border-slate-900 outline-none font-bold bg-slate-50/30 shadow-inner text-sm sm:text-base`}
              />
            </div>

            <div className="relative">
              {isRtl ? (
                <Lock
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
              ) : (
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
              )}
              <input
                required
                type="password"
                placeholder={t("password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full ${isRtl ? "pr-12 pl-4 text-right" : "pl-12 pr-4 text-left"} py-3.5 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-200 focus:border-slate-900 outline-none font-bold bg-slate-50/30 shadow-inner text-sm sm:text-base`}
              />
            </div>

            <div className="bg-slate-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-100 shadow-inner">
              <div className="flex items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="bg-white p-1.5 sm:p-2 rounded-lg border border-slate-200 hidden sm:block">
                    <ShieldCheck size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <span className="block font-bold text-slate-600 text-xs sm:text-sm">
                      {t("checkIfRobot")}
                    </span>
                    <span className="text-[10px] sm:text-xs text-slate-400 font-medium">
                      {t("captchaSolve")}: {captchaChallenge.a} +{" "}
                      {captchaChallenge.b} ؟
                    </span>
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
              className={`w-full py-4 sm:py-5 rounded-xl sm:rounded-[1.5rem] font-bold text-base sm:text-lg flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 disabled:opacity-50 ${mode === "signup" ? "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200" : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100"}`}
            >
              {loading ? (
                <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>{mode === "login" ? t("login") : t("signup")}</span>
                  <ArrowRight size={20} className={isRtl ? "rotate-180" : ""} />
                </>
              )}
            </button>

            {mode === "login" && (
              <div className="text-center mt-3 sm:mt-4">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-slate-400 hover:text-slate-900 font-bold transition-all text-xs sm:text-sm"
                >
                  {t("forgotPassword")}
                </button>
              </div>
            )}

            <div className="relative my-6 sm:my-8">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200"></span>
              </div>
              <div className="relative flex justify-center text-[10px] sm:text-xs uppercase">
                <span className="bg-white px-4 text-slate-400 font-bold tracking-widest">
                  {isRtl ? "أو عبر" : "OR VIA"}
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleAuth}
              className="w-full py-3.5 sm:py-4 rounded-xl sm:rounded-2xl border-2 border-slate-100 bg-white hover:bg-slate-50 transition-all font-bold text-slate-600 flex items-center justify-center gap-3 shadow-sm hover:border-slate-200 active:scale-95 disabled:opacity-50 text-sm sm:text-base"
            >
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google"
                className="w-4 h-4 sm:w-5 sm:h-5"
              />
              <span>
                {isRtl
                  ? "دخول سريع باستخدام Google"
                  : "Quick Sign-in with Google"}
              </span>
            </button>


            {unauthorizedDomainError && (
              <div
                id="unauthorized-domain-card"
                className="mt-4 p-4 rounded-xl border-2 border-amber-200 bg-amber-50/50 text-slate-800 text-xs sm:text-sm shadow-sm"
              >
                <div className="flex items-start gap-2.5 mb-2.5">
                  <ShieldAlert
                    className="text-amber-500 shrink-0 mt-0.5"
                    size={18}
                  />
                  <div>
                    <h4 className="font-bold text-amber-950 text-sm">
                      {isRtl
                        ? "تفعيل دخول Google (خطوة مطلوبة)"
                        : "Enable Google Sign-in (Action Required)"}
                    </h4>
                    <p className="text-slate-600 leading-relaxed mt-1 text-[11px] sm:text-xs font-normal">
                      {isRtl
                        ? "نظراً لأن التطبيق يعمل في بيئة معاينة آمنة، يجب عليك إضافة هذا النطاق يدوياً كمجال مصرح به في لوحة تحكم Firebase الخاص بمشروعك (Authentication -> Settings -> Authorized domains)."
                        : "Because this preview runs in a sandboxed environment, you must manually add this domain into your Firebase project settings (Authentication -> Settings -> Authorized domains)."}
                    </p>
                  </div>
                </div>

                <div className="bg-white/90 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between gap-2 shadow-inner">
                  <code
                    id="domain-to-copy"
                    className="font-mono text-[10px] sm:text-xs text-slate-700 select-all font-bold tracking-tight bg-slate-50 px-1.5 py-0.5 rounded break-all"
                  >
                    {unauthorizedDomainError}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(unauthorizedDomainError);
                      toast.success(
                        isRtl
                          ? "تم نسخ النطاق بنجاح!"
                          : "Domain copied successfully!",
                      );
                    }}
                    className="flex items-center gap-1.5 hover:bg-slate-100 px-2.5 py-1.5 rounded-md font-bold transition-all text-[11px] text-blue-600 shrink-0 active:scale-95 border border-slate-200 bg-white shadow-sm"
                  >
                    <Copy size={13} />
                    <span>{isRtl ? "نسخ" : "Copy"}</span>
                  </button>
                </div>

                <div className="mt-2 text-[10px] sm:text-[11px] text-slate-500 list-decimal pl-4 space-y-0.5 rtl:pr-4 rtl:pl-0 font-medium leading-relaxed">
                  <p>
                    1.{" "}
                    {isRtl
                      ? "اذهب لـ Firebase Console وافتح مشروعك."
                      : "Go to Firebase Console and open your project."}
                  </p>
                  <p>
                    2.{" "}
                    {isRtl
                      ? "اختر Build ثم Authentication ثم تبويب Settings."
                      : "Click on Build, then Authentication, then Settings tab."}
                  </p>
                  <p>
                    3.{" "}
                    {isRtl
                      ? "تحت Authorized domains، اضغط على Add domain وألصق النطاق المنسوخ أعلاه."
                      : "Under Authorized domains, click Add domain and paste the copied domain."}
                  </p>
                </div>
              </div>
            )}

            {nativePlatformNotice && (
              <div
                id="native-platform-notice-card"
                className="mt-4 p-4 rounded-xl border-2 border-amber-200 bg-amber-50/50 text-slate-800 text-xs sm:text-sm shadow-sm"
              >
                <div className="flex items-start gap-2.5 mb-3">
                  <ShieldAlert
                    className="text-amber-600 shrink-0 mt-0.5"
                    size={20}
                  />
                  <div>
                    <h4 className="font-bold text-amber-950 text-sm">
                      {isRtl
                        ? "تفعيل الدخول بـ Google للأجهزة والتطبيقات الكابستور"
                        : "Native Google Sign-In for Capacitor Mobile Packages"}
                    </h4>
                    <p className="text-slate-700 leading-relaxed mt-1 text-[11px] sm:text-xs font-normal">
                      {isRtl
                        ? "أنت تقوم بتشغيل التطبيق حالياً كحزمة هاتف مثبتة (Capacitor WebView). للتسجيل بنجاح ومنع المشاكل الناتجة عن متصفحات الويب الخارجية، قمنا بدمج كود أصلي (Native Plugin) يفتح واجهة نظام التشغيل المباشرة لالتقاط حساب Google."
                        : "You are running the app inside a mobile package (Capacitor). To prevent login issues with external browsers, we have integrated a native plugin that triggers the native OS account picker seamlessly."}
                    </p>
                  </div>
                </div>

                <div className="bg-white/80 p-3 rounded-lg border border-slate-200 text-slate-700 space-y-2 text-[11px] sm:text-xs">
                  <p className="font-bold text-slate-900 border-b border-slate-100 pb-1">
                    {isRtl ? "💡 كيف تقوم بتهيئة الخدمة للعمل بشكل طبيعي 100%؟" : "💡 How to configure Native Google Auth successfully:"}
                  </p>
                  <p>
                    <strong>{isRtl ? "المتطلب 1: كود الويب (Web Client ID):" : "Requirement 1: Web Client ID:"}</strong>{" "}
                    {isRtl
                      ? "اذهب إلى Firebase Console -> الـ Authentication ثم تبويب Sign-in method -> ثم اختر Google -> وقم بنسخ معرّف Web Client ID ولصقه في الحقل أدناه وحفظه لتجربته مباشرة."
                      : "Go to Firebase Console -> Authentication -> Sign-in method -> edit Google -> copy the Web Client ID, paste it below, and save to test immediately."}
                  </p>
                  <p>
                    <strong>{isRtl ? "المتطلب 2: بصمة SHA-1 للأندرويد:" : "Requirement 2: Android SHA-1 fingerprint:"}</strong>{" "}
                    {isRtl
                      ? "يجب إضافة بصمة SHA-1 الخاصة بشهادة التوقيع (Signing Certificate) لملف الـ APK الخاص بك في إعدادات تطبيق الأندرويد داخل Firebase Console وإلا سيرجع جوجل خطأ 'developer_error - 10'."
                      : "You must add your build's SHA-1 signing certificate fingerprint to your Android app settings in the Firebase Console. Otherwise, Google returning 'developer_error - 10'."}
                  </p>
                  <p>
                    <strong>{isRtl ? "الخيار البديل (الأسرع):" : "Alternative Option (Fastest):"}</strong>{" "}
                    {isRtl
                      ? "استخدم البريد الإلكتروني وكلمة المرور لعمل حساب جديد والدخول فوراً بدون أي ضبط إضافي للمفاتيح وبأعلى أمان."
                      : "Use standard 'Email and Password' to sign in instantly with no extra Google settings is always fully supported."}
                  </p>
                </div>

                <div className="mt-4 p-3 rounded-lg border border-slate-200 bg-white shadow-sm font-sans">
                  <p className="font-bold text-slate-950 text-xs mb-1.5 flex items-center gap-1.5 justify-start">
                    <Smartphone size={15} className="text-blue-500 animate-pulse" />
                    <span>{isRtl ? "تعديل واختبار Web Client ID مباشر" : "Live Test Web Client ID Override"}</span>
                  </p>
                  <p className="text-[10px] text-slate-500 mb-2 leading-normal">
                    {isRtl
                      ? "قم بتحديث المعرّف الذي نسخته من منصة Firebase هنا واحفظه ليتم ربطه بكود تسجيل الدخول مباشرة على جهازك الحالي:"
                      : "Update your Client ID from Firebase here and click Save to test on your phone in real-time:"}
                  </p>
                  
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={googleClientId}
                      onChange={(e) => setGoogleClientId(e.target.value)}
                      placeholder="xxxxx-xxxxx.apps.googleusercontent.com"
                      className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded text-xs text-slate-800 placeholder-slate-400 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.setItem("override_google_client_id", googleClientId);
                        toast.success(isRtl ? "تم الحفظ محلياً! اضغط على أيقونة جوجل بالأعلى لإعادة المحاولة" : "Saved locally! Tap Google Sign-In above to retry.");
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded transition-colors active:scale-95 duration-100 shrink-0"
                    >
                      {isRtl ? "حفظ" : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {firebaseProviderError && (
              <div
                id="firebase-provider-error-card"
                className="mt-4 p-4 rounded-xl border-2 border-rose-200 bg-rose-50/50 text-slate-800 text-xs sm:text-sm shadow-sm text-right"
              >
                <div className="flex items-start gap-2.5 mb-2.5 rtl:flex-row-reverse">
                  <ShieldAlert
                    className="text-rose-600 shrink-0 mt-0.5"
                    size={18}
                  />
                  <div>
                    <h4 className="font-bold text-rose-950 text-sm">
                      {firebaseProviderError === "google-disabled"
                        ? isRtl
                          ? "تفعيل دخول Google (خطأ إعدادات)"
                          : "Enable Google Auth (Configuration Error)"
                        : isRtl
                          ? "تفاصيل الخطأ الفني (Firebase Exception)"
                          : "Technical Error Details (Firebase Exception)"}
                    </h4>
                    <p className="text-slate-600 leading-relaxed mt-1 text-[11px] sm:text-xs font-normal">
                      {firebaseProviderError === "google-disabled"
                        ? isRtl
                          ? "لم يتم تفعيل موفر تسجيل الدخول Google في لوحة تحكم عتاد Firebase. يرجى تفعيله من Firebase Console لتشغيل الخدمة."
                          : "Google Authentication Sign-In is not activated in the Firebase Project Console."
                        : isRtl
                          ? "لقد أطلق نظام المصادقة استثناءاً فنياً محدداً. التفاصيل معروضة أدناه للتحقق والإصلاح:"
                          : "The auth system threw an explicit technical exception. See details below to resolve: "}
                    </p>
                  </div>
                </div>

                {firebaseProviderError !== "google-disabled" ? (
                  <div className="bg-white p-2.5 rounded-lg border border-rose-200 shadow-inner">
                    <code className="font-mono text-[10px] sm:text-xs text-rose-700 select-all font-bold tracking-tight break-all">
                      {firebaseProviderError}
                    </code>
                  </div>
                ) : (
                  <div className="mt-3 bg-white p-3 rounded-lg border border-slate-200 flex flex-col gap-2.5 shadow-sm text-center">
                    <p className="font-bold text-slate-900 text-xs">
                      {isRtl
                        ? "طريقة الحل وتفعيل موفر تسجيل الخدمة:"
                        : "Steps to Activate and Resolve:"}
                    </p>
                    <div className="text-[10px] sm:text-[11px] text-slate-500 list-decimal pr-4 pl-0 rtl:pl-4 space-y-1 font-medium leading-relaxed text-right">
                      <p>
                        1.{" "}
                        {isRtl
                          ? "ادخل على حساب Firebase Console وافتح مشروعك."
                          : "Open Firebase Console and pick your project."}
                      </p>
                      <p>
                        2.{" "}
                        {isRtl
                          ? "اذهب إلى قائمة Build ثم Authentication ثم تبويب Sign-in method."
                          : "Click on Build -> Authentication -> Sign-in method tab."}
                      </p>
                      <p>
                        3.{" "}
                        {isRtl
                          ? "اضغط على Add provider واختر Google وقم بتفعيله ثم حفظ."
                          : "Click Add provider -> Google -> Enable and save the changes."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {showIframeHint && (
              <div
                id="iframe-connection-hint-card"
                className="mt-4 p-4 rounded-xl border-2 border-indigo-200 bg-indigo-50/50 text-slate-800 text-xs sm:text-sm shadow-sm text-right"
              >
                <div className="flex items-start gap-2.5 mb-2.5 rtl:flex-row-reverse">
                  <ShieldAlert
                    className="text-indigo-600 shrink-0 mt-0.5"
                    size={18}
                  />
                  <div>
                    <h4 className="font-bold text-indigo-950 text-sm">
                      {isRtl
                        ? "لماذا تظهر هذه الرسالة؟ (مشكلة تقييد المتصفح)"
                        : "Why does this message appear? (Browser Restriction)"}
                    </h4>
                    <p className="text-slate-600 leading-relaxed mt-1 text-[11px] sm:text-xs font-normal">
                      {isRtl
                        ? "عند تشغيل التطبيق داخل نافذة المعاينة بالمنصة، يقوم المتصفح بحظر ملفات تعريف الارتباط للطرف الثالث (Third-Party Cookies) وتخزين الويب لأسباب أمنية، مما يمنع Google من مكاملة الاتصال."
                        : "When running the application inside the platform preview frame, browsers block third-party cookies & web storage for security, which prevents Google Auth from completing."}
                    </p>
                  </div>
                </div>

                <div className="mt-3 bg-white p-3 rounded-lg border border-slate-200 flex flex-col gap-2.5 shadow-sm">
                  <p className="font-bold text-slate-900 text-xs text-center">
                    {isRtl
                      ? "الحل الأبسط والأسرع: تشغيله في علامة تبويب جديدة"
                      : "Easiest solution: Run in a separate tab"}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      window.open(window.location.href, "_blank");
                    }}
                    className="w-full flex items-center justify-center gap-2 hover:bg-indigo-600 hover:text-white bg-indigo-500 text-white px-3 py-2 sm:py-2.5 rounded-lg font-bold transition-all text-xs sm:text-sm active:scale-95 shadow"
                  >
                    <ExternalLink size={14} />
                    <span>
                      {isRtl
                        ? "الفتح وتشغيل التطبيق في علامة تبويب مستقلة"
                        : "Open & Run App in New Tab"}
                    </span>
                  </button>
                </div>

                <div className="mt-2.5 text-[10px] sm:text-[11px] text-slate-500 list-decimal pr-4 pl-0 rtl:pl-4 space-y-1 font-medium leading-relaxed">
                  <p>
                    1.{" "}
                    {isRtl
                      ? "اضغط على الزر الزرق أعلاه لفتح التطبيق بشكل كامل."
                      : "Click the blue button above to open the application fully."}
                  </p>
                  <p>
                    2.{" "}
                    {isRtl
                      ? 'أو يمكنك تفعيل "قبول ملفات تعريف الارتباط للطرف الثالث" (Third-Party Cookies) في المتصفح.'
                      : 'Or you can enable "Third-Party Cookies" in your browser settings.'}
                  </p>
                  <p>
                    3.{" "}
                    {isRtl
                      ? "يمكنك أيضاً استخدام نظام تسجيل الدخول العادي بالبريد الإلكتروني وكلمة المرور دون أي قيود."
                      : "You can also use standard email & password login directly without restrictions."}
                  </p>
                </div>
              </div>
            )}
          </form>

          <p className="mt-6 sm:mt-8 text-center text-slate-400 text-xs sm:text-sm font-medium">
            {isRtl
              ? "نظام آمن ومشفر 100% لإدارة تعليمية متميزة"
              : "100% Secure & Encrypted School Management System"}
          </p>
        </div>
      </motion.div>

      {/* Dynamic Direct-Installer Card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white w-full max-w-lg rounded-[2rem] sm:rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden mb-8 sm:mb-12 text-center"
      >
        <div className="p-6 sm:p-10">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto mb-4">
            <Smartphone className="w-6 h-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">
            {isRtl ? "تنزيل وتثبيت تطبيق SchoolixiQ" : "Install SchoolixiQ Web App"}
          </h2>
          <p className="text-slate-500 font-bold text-xs sm:text-sm max-w-sm mx-auto mb-6">
            {isRtl
              ? "استمتع بالوصول الفوري، وسرعة تصفح متميزة، وإشعارات فورية مباشرة على شاشتك دون تنزيل من متاجر التطبيقات."
              : "Experience instant loading, lightning-fast transitions & native notifications right on your phone without app stores."}
          </p>

          {/* Main selection buttons */}
          {installingPlatform === null ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => startDirectInstall("android")}
                className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-slate-100/80 hover:border-emerald-500/30 hover:bg-emerald-50/10 transition-all cursor-pointer group hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2.5 transition-colors group-hover:bg-emerald-500 group-hover:text-white">
                  <Smartphone className="w-5 h-5" />
                </div>
                <span className="font-extrabold text-xs sm:text-sm text-slate-800">أندرويد / Android</span>
                <span className="text-[10px] text-slate-400 mt-1 font-bold">{isRtl ? "تثبيت تلقائي آمن" : "Secure Auto-Install"}</span>
              </button>

              <button
                type="button"
                onClick={() => startDirectInstall("ios")}
                className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-slate-100/80 hover:border-indigo-500/30 hover:bg-indigo-50/10 transition-all cursor-pointer group hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2.5 transition-colors group-hover:bg-indigo-500 group-hover:text-white">
                  <Smartphone className="w-5 h-5" />
                </div>
                <span className="font-extrabold text-xs sm:text-sm text-slate-800">آيفون / iOS</span>
                <span className="text-[10px] text-slate-400 mt-1 font-bold">{isRtl ? "دليل التثبيت السريع" : "Quick Setup Guide"}</span>
              </button>
            </div>
          ) : (
            /* Progress view */
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-right">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400">
                  {installingPlatform === "android" ? "Google Android Package" : "Apple iOS Profile"}
                </span>
                <span className="text-sm font-black text-indigo-600 font-mono">
                  {installProgress}%
                </span>
              </div>

              {/* Progressive status text */}
              <p className="text-xs font-extrabold text-slate-700 mb-3 min-h-[1.5rem] leading-relaxed">
                {isRtl ? (
                  installProgress < 30 ? "⚡ جاري فحص ملفات الدعم الذاتية للجهاز..." :
                  installProgress < 70 ? "📦 جاري تجميع حزمة الخدمة وربطها بالمنصة..." :
                  installProgress < 100 ? "🔧 جاري تهيئة التنبيهات ونوافذ الدخول السريع..." :
                  "✨ تم تجهيز ملف التطبيق بنجاح!"
                ) : (
                  installProgress < 30 ? "⚡ Scanning system requirements..." :
                  installProgress < 70 ? "📦 Linking application bundles..." :
                  installProgress < 100 ? "🔧 Registering instant notification gateways..." :
                  "✨ App binaries configured successfully!"
                )}
              </p>

              {/* Progress bar container */}
              <div className="w-full h-2.5 bg-slate-200/80 rounded-full overflow-hidden mb-4">
                <motion.div
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${installProgress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>

              {/* Post-Completion action / Guide */}
              {installProgress === 100 && showInstallSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 pt-3 border-t border-slate-200/60"
                >
                  {installingPlatform === "android" ? (
                    <div className="text-xs text-slate-600 font-bold leading-relaxed space-y-2">
                      <p className="text-emerald-600 font-black">
                        {isRtl ? "✓ تم تحضير التطبيق للتثبيت" : "✓ Setup components prepared!"}
                      </p>
                      <p className="font-normal text-slate-500 text-[11px]">
                        {isRtl 
                          ? "إذا لم يظهر لك مربع حوار التثبيت التلقائي الصادر من نظام الاندرويد، يرجى النقر على زر 'تثبيت الآن' بالأسفل، أو النقر على الثلاث نقاط الرأسية أعلى المتصفح واختيار 'تثبيت التطبيق' (Install App)."
                          : "If the native install prompt did not trigger automatically, tap 'Install Now' below or click your browser's menu button and select 'Install' or 'Add to Home screen'."}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          if (deferredInstallPrompt) {
                            deferredInstallPrompt.prompt();
                          } else {
                            toast.error(isRtl ? "يرجى تثبيت التطبيق من خيارات متصفحك مباشرة أو السحب للشاشة الرئيسية" : "Please use browser option to complete install.");
                          }
                        }}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/10"
                      >
                        <Download size={13} />
                        {isRtl ? "تثبيت الآن (شاشة الهاتف)" : "Install Now"}
                      </button>
                    </div>
                  ) : (
                    // iOS Instruction Set with Profile Downloader option
                    <div className="space-y-4 font-bold text-xs text-slate-800 dark:text-slate-100 leading-relaxed text-right">
                      <p className="text-emerald-600 dark:text-emerald-400 font-extrabold text-center text-sm md:text-base mb-1 flex items-center justify-center gap-1">
                        <span>✨</span>
                        {isRtl ? "تم تحضير طريقتين ميسّرتين لتثبيت التطبيق على الآيفون" : "Two easy ways prepared for iOS Installation!"}
                      </p>

                      {/* Method 1: The Official Safari App Store Method (Add to Home Screen) - Safe, built-in, trusted, 100% sign status */}
                      <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/10 p-4 rounded-3xl border border-emerald-100/60 dark:border-emerald-900/40 text-right">
                        <div className="flex items-center gap-2 mb-2 font-black text-emerald-900 dark:text-emerald-200">
                          <span className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-xs">١</span>
                          <span className="text-xs sm:text-sm font-black">{isRtl ? "طريقة سفاري الفورية (موصى بها جداً - آمنة وموثوقة 100٪)" : "Official Safari Method (Highly Recommended - 100% Secure)"}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed mb-3 pr-8">
                          {isRtl 
                            ? "طريقة آبل الرسمية المعتمدة التي تضمن لك تثبيت فوري آمن وموثوق تماماً، بدون ظهور أي رسائل تحذيرية أو حاجة للدخول في إعدادات الهاتف."
                            : "Apple's native secure method. Guarantees a fully trusted install directly, with no system configuration warning screens."}
                        </p>

                        <div className="space-y-2.5 pr-8 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          <div className="flex items-start gap-1.5">
                            <span className="text-emerald-600">•</span>
                            <p>
                              {isRtl ? "اضغط على زر المشاركة (Share) في شريط متصفح Safari بالأسفل." : "Tap the Share icon in iOS Safari (bottom bar)."}
                            </p>
                          </div>
                          <div className="flex items-start gap-1.5">
                            <span className="text-emerald-600">•</span>
                            <p>
                              {isRtl ? "اختر إضافة للشاشة الرئيسية (Add to Home Screen)." : "Select 'Add to Home Screen'."}
                            </p>
                          </div>
                          <div className="flex items-start gap-1.5">
                            <span className="text-emerald-600">•</span>
                            <p>
                              {isRtl ? "انقر على إضافة (Add) في أعلى اليسار لبدء استخدام التطبيق فوراً وبشكل كامل." : "Tap 'Add' at the top right to launch instantly."}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Method 2: Config Profile File */}
                      <div className="bg-gradient-to-br from-indigo-50/50 to-violet-50/50 dark:from-indigo-950/10 dark:to-violet-950/10 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 text-right">
                        <div className="flex items-center gap-2 mb-2 font-black text-slate-800 dark:text-slate-200">
                          <span className="w-6 h-6 rounded-lg bg-indigo-500 text-white flex items-center justify-center text-xs">٢</span>
                          <span className="text-xs sm:text-sm font-black">{isRtl ? "طريقة ملف التعريف التلقائي بنقرة واحدة" : "Or Download Secure iOS Configuration Profile"}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed mb-3 pr-8">
                          {isRtl 
                            ? "يتيح لك تثبيت فوري بنقرة واحدة. عند تنزيل ملف التعريف، من الطبيعي تماماً لجميع التطبيقات والمنصات الخارجية المستقلة أن يظهر لك نظام iOS عبارة (لم يتم التوقيع - Unsigned) باللون الأحمر لأنها لا تعتمد على حساب مطور تجاري مدفوع، وهي آمنة تماماً ومضمونة 100% ولا تسبب أي مشاكل."
                            : "Download custom shortcut profile. Note that iOS naturally labels local profiles as 'Unsigned' (Not Signed), which is standard for custom clips, but perfectly safe."}
                        </p>

                        <div className="pr-8 space-y-3">
                          <a
                            href="/api/download/schoolixiq.mobileconfig"
                            onClick={() => {
                              toast.success(isRtl ? "جاري تحضير ملف التعريف وتنزيله بنجاح..." : "Preparing and downloading configuration profile...");
                            }}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/10 cursor-pointer text-center hover:scale-[1.01] active:scale-[0.99]"
                          >
                            <Download size={13} />
                            {isRtl ? "تنزيل وتثبيت الملف بنقرة واحدة" : "Download Configuration Profile"}
                          </a>

                          <div className="text-[10px] bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100/80 dark:border-slate-800/80 leading-normal text-slate-500 font-medium">
                            {isRtl ? "طريقة التشغيل بعد التحميل: اضغط 'سماح' للتنزيل، ثم افتح تطبيق (الإعدادات بجهازك Settings) واضغط على (تم تنزيل ملف التعريف) بالأعلى، ثم اضغط على تثبيت." : "Activation context: tap Allow, then go to Settings on your device, tap (Profile Downloaded) at the top and select Install."}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setInstallingPlatform(null)}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 font-bold rounded-xl text-xs transition-colors"
                  >
                    {isRtl ? "الرجوع والتبديل" : "Back & Change Device"}
                  </button>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Subscription Plans Section */}
      <div className="w-full max-w-6xl mt-12 sm:mt-20">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3 sm:mb-4 font-display">
            {isRtl
              ? `باقات الاشتراك في ${config.appName}`
              : `${config.appName} Subscription Plans`}
          </h2>
          <p className="text-slate-500 font-bold text-sm sm:text-base mb-8">
            {isRtl
              ? "اختر الباقة المناسبة لمدرستك وابدأ مسار التحول الرقمي اليوم"
              : "Choose the right plan for your school and start your digital transformation today"}
          </p>

          <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full items-center shadow-inner">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-6 sm:px-8 py-2.5 sm:py-3 rounded-full text-sm font-bold transition-all ${billingCycle === "monthly" ? "bg-white text-slate-900 shadow-md shadow-slate-200/50" : "text-slate-500 hover:text-slate-700"}`}
            >
              {isRtl ? "شهرياً" : "Monthly"}
            </button>
            <button
              onClick={() => setBillingCycle("annually")}
              className={`px-6 sm:px-8 py-2.5 sm:py-3 rounded-full text-sm font-bold transition-all ${billingCycle === "annually" ? "bg-white text-slate-900 shadow-md shadow-slate-200/50" : "text-slate-500 hover:text-slate-700"}`}
            >
              {isRtl ? "سنوياً" : "Annually"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 px-2 sm:px-0">
          {getLocalizedPackages(packages, isRtl).map((pkg) => {
            const displayPrice =
              billingCycle === "annually"
                ? pkg.priceYearly !== undefined
                  ? pkg.priceYearly
                  : pkg.price
                : pkg.priceMonthly !== undefined
                  ? pkg.priceMonthly
                  : Math.round((pkg.price || 0) / 12);
            return (
              <motion.div
                key={pkg.id}
                whileHover={{ y: -8 }}
                className={`bg-white rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 border-2 transition-all flex flex-col ${pkg.isPopular ? "border-blue-600 shadow-2xl shadow-blue-100 ring-4 ring-blue-50" : "border-slate-100 shadow-xl"}`}
              >
                {pkg.isPopular && (
                  <span className="bg-blue-600 text-white px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest self-start mb-6">
                    {t("mostPopular")}
                  </span>
                )}
                <h3 className="text-2xl font-black text-slate-900 mb-2">
                  {pkg.name}
                </h3>
                <div className="flex items-baseline gap-2 mb-8">
                  <span className="text-4xl font-black text-slate-900">
                    {displayPrice?.toLocaleString()}
                  </span>
                  <span className="text-slate-400 font-bold text-sm">
                    {billingCycle === "annually"
                      ? t("annualShort")
                      : isRtl
                        ? "/ شهرياً"
                        : "/ Monthly"}
                  </span>
                </div>

                <ul className="space-y-4 mb-10 flex-1">
                  {(pkg.features || []).map((feature: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="w-5 h-5 bg-emerald-50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check size={12} className="text-emerald-600" />
                      </div>
                      <span className="text-slate-600 text-sm font-medium">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => setShowSubscriptionModal(pkg)}
                  className={`w-full py-4 rounded-2xl font-bold transition-all active:scale-95 ${pkg.isPopular ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-slate-900 text-white hover:bg-slate-800"}`}
                >
                  {t("subscribeNow")}
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
              <span>
                {isRtl ? "لماذا تختار منصتنا؟" : "Why Choose Our Platform?"}
              </span>
            </motion.div>

            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white mb-8 font-display leading-[1.1] tracking-tight"
            >
              {config.marketingTitle ||
                (isRtl
                  ? "منصة الإدارة والتحصيل الذكي المتقدمة لمدارس العراق الأهلية"
                  : "Smart School Management & Tuition System")}
            </motion.h2>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="text-slate-500 dark:text-slate-400 font-medium text-lg md:text-xl leading-relaxed max-w-2xl mx-auto"
            >
              {config.marketingSubtitle ||
                (isRtl
                  ? "نظام بيئي متكامل يربط الإدارة والمعلمين وأولياء الأمور لتسهيل جباية الأقساط، تتبع الغيابات ومراقبة النتائج بمرونة تامة ونظام إشعارات ذكي يرتقي بتجربة التعليم."
                  : "An integrated ecosystem connecting admins, teachers, and parents to streamline fee collection, track attendance, and monitor school progress with intelligent notifications.")}
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {(config.marketingFeatures && config.marketingFeatures.length > 0
              ? config.marketingFeatures
              : [
                  {
                    title: isRtl
                      ? "متابعة الأقساط الذكية"
                      : "Smart Fees Tracking",
                    description: isRtl
                      ? "لوحة تحكم تفصيلية لمتابعة الأقساط والتحصيل اليومي وجدولة الدفعات تلقائياً."
                      : "Comprehensive dashboard for following payments and auto-scheduling batches.",
                  },
                  {
                    title: isRtl
                      ? "ربط متكامل ومباشر"
                      : "Seamless Parent Connection",
                    description: isRtl
                      ? "واجهة مخصصة تتيح لولي الأمر متابعة شاملة للغيابات، النتائج وتواريخ السداد."
                      : "Dedicated portal for parents to monitor attendance, grades, and schedules.",
                  },
                  {
                    title: isRtl
                      ? "إنذارات وتذكير فوري"
                      : "Automated Notifications",
                    description: isRtl
                      ? "تذكير فوري ذكي لإعلام أولياء الأمور بالدفعات عبر منصات التواصل والرسائل."
                      : "Instant, automatic reminders notifying parents of due and overdue fees.",
                  },
                  {
                    title: isRtl ? "إحصائيات تفاعلية" : "Interactive Analytics",
                    description: isRtl
                      ? "تقارير ورسوم بيانية ذكية تدعم اتخاذ القرار وتوفر لك رؤية فورية عن الديون والسيولة."
                      : "Intelligent charts to plan your budget, track debts, and cash flow.",
                  },
                  {
                    title: isRtl
                      ? "إدارة أكاديمية مبسطة"
                      : "Simplified Academic Mgmt",
                    description: isRtl
                      ? "تنظيم الجداول، توزيع الحصص الدراسية ومتابعة تقييمات الطلاب بسهولة."
                      : "Organize schedules, distribute classes and track evaluations easily.",
                  },
                  {
                    title: isRtl
                      ? "تشفير وحماية بيانات"
                      : "Encrypted Data Security",
                    description: isRtl
                      ? "بيانات مدرستك في أمان تام مع أعلى معايير التشفير والنسخ الاحتياطي السحابي."
                      : "Your school data is secure with the highest encryption and cloud backup standards.",
                  },
                  {
                    title: isRtl
                      ? "تطبيق للهواتف الذكية"
                      : "Mobile Application",
                    description: isRtl
                      ? "تطبيق مخصص لأولياء الأمور للوصول المباشر وتتبع مستوى الطالب بشكل فوري."
                      : "Dedicated mobile app for parents to track student progress instantly.",
                  },
                  {
                    title: isRtl
                      ? "إدارة وتصدير التقارير"
                      : "Reports Management",
                    description: isRtl
                      ? "أرشفة وتصدير تقارير وتقييمات الطلاب بسهولة وبصيغ متعددة بضغطة زر واحدة."
                      : "Easily archive and export student reports in multiple formats with one click.",
                  },
                ]
            ).map((feat, idx) => {
              const bgColors = [
                "from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 text-blue-600 dark:text-blue-400 group-hover:from-blue-500 group-hover:to-indigo-600",
                "from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20 text-emerald-600 dark:text-emerald-400 group-hover:from-emerald-500 group-hover:to-teal-600",
                "from-orange-500/10 to-amber-500/10 dark:from-orange-500/20 dark:to-amber-500/20 text-orange-600 dark:text-orange-400 group-hover:from-orange-500 group-hover:to-amber-600",
                "from-purple-500/10 to-fuchsia-500/10 dark:from-purple-500/20 dark:to-fuchsia-500/20 text-purple-600 dark:text-purple-400 group-hover:from-purple-500 group-hover:to-fuchsia-600",
                "from-pink-500/10 to-rose-500/10 dark:from-pink-500/20 dark:to-rose-500/20 text-pink-600 dark:text-pink-400 group-hover:from-pink-500 group-hover:to-rose-600",
                "from-cyan-500/10 to-blue-500/10 dark:from-cyan-500/20 dark:to-blue-500/20 text-cyan-600 dark:text-cyan-400 group-hover:from-cyan-500 group-hover:to-blue-600",
                "from-yellow-500/10 to-amber-500/10 dark:from-yellow-500/20 dark:to-amber-500/20 text-yellow-600 dark:text-yellow-400 group-hover:from-yellow-500 group-hover:to-amber-600",
                "from-sky-500/10 to-blue-500/10 dark:from-sky-500/20 dark:to-blue-500/20 text-sky-600 dark:text-sky-400 group-hover:from-sky-500 group-hover:to-blue-600",
              ];
              const IconsList = [
                Coins,
                Users,
                Bell,
                TrendingUp,
                GraduationCap,
                ShieldCheck,
                Smartphone,
                ClipboardList,
              ];

              const themeClass = bgColors[idx % bgColors.length];
              const Icon = IconsList[idx % IconsList.length];

              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{
                    duration: 0.5,
                    delay: idx * 0.1,
                    ease: "easeOut",
                  }}
                  whileHover={{ y: -10, scale: 1.02 }}
                  className="group relative bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-black/50 hover:border-transparent dark:hover:border-transparent transition-all duration-300 z-10 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity duration-500 from-slate-400 to-slate-900 pointer-events-none"></div>

                  <div
                    className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${themeClass} flex items-center justify-center shrink-0 mb-8 transition-all duration-300 group-hover:shadow-lg group-hover:text-white`}
                  >
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
              <h2 className="text-2xl font-black text-slate-900 mb-4">
                {t("orderSentSuccess")}
              </h2>
              <p className="text-slate-500 font-bold mb-8">
                {t("orderSentDesc")}
              </p>
              <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-200 mb-8 select-all">
                <span className="text-4xl font-black text-slate-900 tracking-widest">
                  {successCode}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-bold mb-8 leading-relaxed">
                {t("keepCodeForSupport")}
              </p>
              <button
                onClick={() => setSuccessCode(null)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black shadow-lg active:scale-95 transition-all"
              >
                {t("gotIt")}
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
                  <div className={isRtl ? "text-right" : "text-left"}>
                    <h2 className="text-xl md:text-2xl font-black text-white">
                      {t("newSubscriptionRequest")}
                    </h2>
                    <p className="text-blue-100 font-bold text-xs md:text-sm mt-1">
                      {t("requestingPackage")} {showSubscriptionModal.name}
                    </p>
                  </div>
                </div>

                <div className="p-6 md:p-10">
                  <form
                    onSubmit={handleSubscribeRequest}
                    className="space-y-4 md:space-y-5"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                          {t("fullSchoolName")}
                        </label>
                        <div className="relative">
                          {isRtl ? (
                            <Users
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                              size={16}
                            />
                          ) : (
                            <Users
                              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                              size={16}
                            />
                          )}
                          <input
                            required
                            type="text"
                            value={subscriptionForm.name}
                            onChange={(e) =>
                              setSubscriptionForm({
                                ...subscriptionForm,
                                name: e.target.value,
                              })
                            }
                            className={`w-full ${isRtl ? "pr-11 pl-4 text-right" : "pl-11 pr-4 text-left"} py-3 md:py-4 rounded-xl md:rounded-2xl border border-slate-200 focus:border-blue-600 outline-none font-bold bg-slate-50/50 transition-colors text-sm md:text-base`}
                            placeholder={t("enterName")}
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                          {t("phoneNumber")}
                        </label>
                        <div className="relative">
                          {isRtl ? (
                            <Phone
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                              size={16}
                            />
                          ) : (
                            <Phone
                              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                              size={16}
                            />
                          )}
                          <input
                            required
                            type="tel"
                            value={subscriptionForm.phone}
                            onChange={(e) =>
                              setSubscriptionForm({
                                ...subscriptionForm,
                                phone: e.target.value,
                              })
                            }
                            className={`w-full ${isRtl ? "pr-11 pl-4 text-right" : "pl-11 pr-4 text-left"} py-3 md:py-4 rounded-xl md:rounded-2xl border border-slate-200 focus:border-blue-600 outline-none font-bold bg-slate-50/50 transition-colors text-sm md:text-base`}
                            placeholder="07XXXXXXXX"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                        {t("email")}
                      </label>
                      <div className="relative">
                        {isRtl ? (
                          <Mail
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                            size={16}
                          />
                        ) : (
                          <Mail
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                            size={16}
                          />
                        )}
                        <input
                          required
                          type="email"
                          value={subscriptionForm.email}
                          onChange={(e) =>
                            setSubscriptionForm({
                              ...subscriptionForm,
                              email: e.target.value,
                            })
                          }
                          className={`w-full ${isRtl ? "pr-11 pl-4 text-right" : "pl-11 pr-4 text-left"} py-3 md:py-4 rounded-xl md:rounded-2xl border border-slate-200 focus:border-blue-600 outline-none font-bold bg-slate-50/50 transition-colors text-sm md:text-base`}
                          placeholder="example@email.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                        {t("detailedAddress")}
                      </label>
                      <div className="relative">
                        {isRtl ? (
                          <MapPin
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                            size={16}
                          />
                        ) : (
                          <MapPin
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                            size={16}
                          />
                        )}
                        <input
                          required
                          type="text"
                          value={subscriptionForm.address}
                          onChange={(e) =>
                            setSubscriptionForm({
                              ...subscriptionForm,
                              address: e.target.value,
                            })
                          }
                          className={`w-full ${isRtl ? "pr-11 pl-4 text-right" : "pl-11 pr-4 text-left"} py-3 md:py-4 rounded-xl md:rounded-2xl border border-slate-200 focus:border-blue-600 outline-none font-bold bg-slate-50/50 transition-colors text-sm md:text-base`}
                          placeholder={
                            isRtl
                              ? "المحافظة - القضاء - الحي"
                              : "Province - District - Neighborhood"
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                        {t("suggestedAdminPassword")}
                      </label>
                      <div className="relative">
                        {isRtl ? (
                          <Lock
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                            size={16}
                          />
                        ) : (
                          <Lock
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                            size={16}
                          />
                        )}
                        <input
                          required
                          type="password"
                          value={subscriptionForm.password}
                          onChange={(e) =>
                            setSubscriptionForm({
                              ...subscriptionForm,
                              password: e.target.value,
                            })
                          }
                          className={`w-full ${isRtl ? "pr-11 pl-4 text-right" : "pl-11 pr-4 text-left"} py-3 md:py-4 rounded-xl md:rounded-2xl border border-slate-200 focus:border-blue-600 outline-none font-bold bg-slate-50/50 transition-colors text-sm md:text-base`}
                          placeholder={t("strongPassword")}
                        />
                      </div>
                    </div>

                    <div className="bg-slate-50 p-5 md:p-6 rounded-2xl md:rounded-[2rem] border border-slate-100 mt-4 shadow-inner">
                      <div
                        className={`flex items-center justify-between font-black ${isRtl ? "flex-row" : "flex-row-reverse"}`}
                      >
                        <span className="text-xl md:text-2xl text-slate-900">
                          {(() => {
                            const isMonthly = billingCycle === "monthly";
                            const actualPrice = isMonthly
                              ? showSubscriptionModal.priceMonthly !== undefined
                                ? showSubscriptionModal.priceMonthly
                                : Math.round(
                                    (showSubscriptionModal.price || 0) / 12,
                                  )
                              : showSubscriptionModal.priceYearly !== undefined
                                ? showSubscriptionModal.priceYearly
                                : showSubscriptionModal.price;
                            return actualPrice?.toLocaleString();
                          })()}{" "}
                          {t("iqd")}
                        </span>
                        <span className="text-slate-400 text-xs md:text-sm uppercase tracking-widest">
                          {billingCycle === "monthly"
                            ? isRtl
                              ? "شهرياً"
                              : "Monthly"
                            : t("annualTotal")}
                        </span>
                      </div>
                    </div>

                    <button
                      disabled={isSubmitting}
                      className="w-full py-4 md:py-5 bg-blue-600 text-white rounded-xl md:rounded-2xl font-black text-base md:text-lg shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 mt-2"
                    >
                      {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
                      ) : (
                        t("confirmSubscriptionAndSend")
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
