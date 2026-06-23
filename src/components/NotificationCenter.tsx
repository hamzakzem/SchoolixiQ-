import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { db } from "../lib/firebase";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  doc, 
  updateDoc, 
  getDocs, 
  deleteDoc, 
  addDoc, 
  serverTimestamp,
  writeBatch
} from "firebase/firestore";
import { useAuth } from "../lib/AuthContext";
import { 
  Bell, 
  MessageSquare,
  CreditCard,
  ClipboardCheck,
  BookOpen,
  Settings,
  Check, 
  Trash2,
  RefreshCw,
  ArrowLeft,
  Search,
  X,
  Loader2,
  AlertTriangle,
  MoreVertical,
  Volume2,
  VolumeX,
  type LucideIcon,
} from "lucide-react";
import { 
  getSoundSettings, 
  saveSoundSettings, 
  playCategorizedSound, 
  UserSoundSettings, 
  NotificationCategory 
} from "../lib/notificationSound";
import { notificationService } from "../lib/notificationService";
import {
  filterNotificationsForUser,
  isNotificationVisibleToUser,
} from "../lib/notificationVisibility";
import { getSafeHomeworkNotificationTitle } from "../lib/homeworkSubjects";
import { buildTeacherRedactionContext } from "../lib/userProfile";
import { toast } from "react-hot-toast";
import {
  NOTIFICATION_CATEGORIES,
  resolveNotificationCategoryId,
  getCategoryConfig,
  getTimeGroup,
  TIME_GROUP_LABELS,
  type NotificationCategoryId,
} from "../lib/notificationCategories";
import {
  normalizeDashboardRole,
  resolveNotificationTab,
  getNotificationActionLabel,
} from "../lib/notificationRouting";
import {
  registerWebPushDevice,
  isWebPushConfigured,
  getWebPushConfigWarning,
  getWebPushDiagnostics,
  runPushRegistrationDiagnostics,
  getVapidMissingMessage,
  getPermissionDeniedGuidance,
  type WebPushDiagnosticState,
} from "../lib/webPushService";
import { notificationDiag } from "../lib/notificationDiagnostics";
import { sendTestPushNotification } from "../lib/pushTestNotification";
import { Capacitor } from '@capacitor/core';

type DashboardRole =
  | "parent"
  | "teacher"
  | "admin"
  | "staff"
  | "assistant"
  | "superadmin"
  | "super_admin";

interface NotificationCenterProps {
  onClose: () => void;
  activeTabSetter?: (tabName: string) => void;
  userRole?: string;
}

type MainView = 'list' | 'detail' | 'settings' | 'logs';

/** Primary category tabs shown in Notification Center 2.0 */
const DISPLAY_CATEGORY_IDS: NotificationCategoryId[] = [
  'messages',
  'tuition',
  'attendance',
  'homework',
  'system',
];

const CATEGORY_ICON_MAP: Partial<Record<NotificationCategoryId, LucideIcon>> = {
  messages: MessageSquare,
  tuition: CreditCard,
  attendance: ClipboardCheck,
  homework: BookOpen,
  system: Settings,
  announcements: MessageSquare,
  reports: BookOpen,
  smart_gate: ClipboardCheck,
};

function renderCategoryIcon(categoryId: NotificationCategoryId, gold = false) {
  const Icon = CATEGORY_ICON_MAP[categoryId] ?? Bell;
  return (
    <Icon
      className={`sx-icon sx-notif-lucide${gold ? ' sx-notif-lucide--gold' : ''}`}
      aria-hidden
    />
  );
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ 
  onClose, 
  activeTabSetter,
  userRole 
}) => {
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [filteredNotifs, setFilteredNotifs] = useState<any[]>([]);
  const [teachersById, setTeachersById] = useState<Record<string, any>>({});
  
  // View states
  const [mainView, setMainView] = useState<MainView>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [loadError, setLoadError] = useState(false);
  const [cardMenuId, setCardMenuId] = useState<string | null>(null);
  
  // Sound Settings States
  const [soundSettings, setSoundSettings] = useState<UserSoundSettings>(getSoundSettings());
  const [testCategory, setTestCategory] = useState<NotificationCategory>('announcement');
  
  // Admin Delivery Logs States
  const [deliveryLogs, setDeliveryLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  
  // Simulated push states
  const [webPushStatus, setWebPushStatus] = useState<'default' | 'granted' | 'denied'>('default');
  const [deviceToken, setDeviceToken] = useState<string>('');
  const [selectedNotification, setSelectedNotification] = useState<any | null>(null);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [testPushSent, setTestPushSent] = useState(false);
  const [testPushPending, setTestPushPending] = useState(false);
  const [pushDiag, setPushDiag] = useState<WebPushDiagnosticState | null>(null);
  const [registeringDevice, setRegisteringDevice] = useState(false);
  const [runningTokenDiag, setRunningTokenDiag] = useState(false);

  const isArabic = profile?.language === 'ar';
  const webPushConfigured = isWebPushConfigured();
  const webPushWarning = getWebPushConfigWarning(isArabic);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const isAdminUser =
    profile?.role === 'admin' ||
    profile?.role === 'superadmin' ||
    normalizeDashboardRole(userRole, profile?.role) === 'superadmin';

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (mainView === 'detail') {
        setMainView('list');
        setSelectedNotification(null);
        return;
      }
      if (mainView === 'settings' || mainView === 'logs') {
        setMainView('list');
        return;
      }
      onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mainView, onClose]);

  useEffect(() => {
    if (!cardMenuId) return;
    const closeMenu = () => setCardMenuId(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, [cardMenuId]);
  useEffect(() => {
    notificationDiag.centerRender({
      count: notifications.length,
      unread: notifications.filter((n) => !n.read).length,
      role: userRole || profile?.role,
    });
  }, [notifications.length, userRole, profile?.role]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setWebPushStatus(Notification.permission);
      const storedToken = localStorage.getItem('schoolix_fcm_token_web');
      if (storedToken) setDeviceToken(storedToken);
    }
  }, []);

  const refreshPushDiagnostics = async () => {
    if (!user?.uid) return;
    const diag = await getWebPushDiagnostics(user.uid);
    setPushDiag(diag);
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setWebPushStatus(Notification.permission);
    }
  };

  useEffect(() => {
    if (mainView === 'settings' && user?.uid) {
      void refreshPushDiagnostics();
    }
  }, [mainView, user?.uid, deviceToken]);

  const handleRegisterDevice = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast.error(isArabic ? "المتصفح لا يدعم هذا النوع من الإشعارات" : "Push notifications not supported by this browser");
      return;
    }
    if (!user?.uid) return;

    setRegisteringDevice(true);
    try {
      const result = await registerWebPushDevice(user.uid, { requestPermission: true });
      await refreshPushDiagnostics();

      if (result.ok && result.token) {
        setDeviceToken(result.token);
        setWebPushStatus('granted');
        toast.success(
          isArabic
            ? `تم تسجيل الجهاز بنجاح (${result.tokenPrefix}…)`
            : `Device registered (${result.tokenPrefix}…)`,
        );
      } else if (result.reason === 'permission_denied') {
        setWebPushStatus('denied');
        toast.error(getPermissionDeniedGuidance(isArabic));
      } else if (result.reason === 'vapid_key_missing') {
        toast.error(getVapidMissingMessage(isArabic));
      } else if (result.reason === 'save_failed') {
        toast.error(
          isArabic
            ? `فشل حفظ التوكن في Firestore: ${result.error || 'خطأ غير معروف'}`
            : `Firestore token save failed: ${result.error || 'Unknown error'}`,
        );
      } else {
        toast.error(result.error || (isArabic ? "تعذر تسجيل الجهاز" : "Could not register device"));
      }
    } catch (err) {
      console.error("Error registering device for push:", err);
      toast.error(isArabic ? "خطأ أثناء تسجيل الجهاز" : "Device registration error");
    } finally {
      setRegisteringDevice(false);
    }
  };

  const handleRunTokenDiagnostics = async () => {
    if (!user?.uid) return;
    setRunningTokenDiag(true);
    try {
      const diag = await runPushRegistrationDiagnostics(user.uid);
      setPushDiag(diag);
      toast.success(
        isArabic
          ? `فحص مكتمل — Firestore tokens: ${diag.firestoreTokenCount}`
          : `Diagnostics done — Firestore tokens: ${diag.firestoreTokenCount}`,
      );
    } catch (err) {
      console.error('Token diagnostics failed', err);
      toast.error(isArabic ? 'فشل فحص التوكن' : 'Token diagnostics failed');
    } finally {
      setRunningTokenDiag(false);
    }
  };

  useEffect(() => {
    if (!profile?.schoolId) return;
    const teachersQ = query(
      collection(db, "users"),
      where("schoolId", "==", profile.schoolId),
      where("role", "==", "teacher"),
    );
    const unsub = onSnapshot(teachersQ, (snap) => {
      const map: Record<string, any> = {};
      snap.docs.forEach((teacherDoc) => {
        map[teacherDoc.id] =
          buildTeacherRedactionContext({
            id: teacherDoc.id,
            ...teacherDoc.data(),
          }) || { id: teacherDoc.id, ...teacherDoc.data() };
      });
      setTeachersById(map);
    });
    return () => unsub();
  }, [profile?.schoolId]);

  const getNotificationTitle = (n: any) => {
    if (n.type !== "homework") return n.title;
    const teacher = n.teacherId ? teachersById[n.teacherId] : undefined;
    return getSafeHomeworkNotificationTitle(n.title, teacher, isArabic);
  };

  const viewerContext = {
    uid: user?.uid || profile?.uid || "",
    role: userRole || profile?.role,
    schoolId: profile?.schoolId,
  };

  // 1. Listen to user notifications (includes super_admin inbox for super admins)
  useEffect(() => {
    if (!user?.uid) return;

    const role = normalizeDashboardRole(userRole, profile?.role);
    const isSuperAdmin = role === 'superadmin';
    const schoolId = profile?.schoolId;

    type InboxQuery = { name: string; q: ReturnType<typeof query> };
    const queries: InboxQuery[] = [
      {
        name: 'inbox_user',
        q: query(collection(db, 'notifications'), where('userId', '==', user.uid)),
      },
    ];

    if (isSuperAdmin) {
      queries.push({
        name: 'inbox_super_admin',
        q: query(collection(db, 'notifications'), where('userId', '==', 'super_admin')),
      });
    } else if (schoolId) {
      queries.push({
        name: 'inbox_system',
        q: query(
          collection(db, 'notifications'),
          where('userId', '==', user.uid),
          where('schoolId', '==', 'system'),
        ),
      });
    }

    const snapshotByQuery = new Map<string, any[]>();

    const mergeAndSet = () => {
      const merged = new Map<string, any>();
      for (const items of snapshotByQuery.values()) {
        for (const item of items) merged.set(item.id, item);
      }
      const items = filterNotificationsForUser(Array.from(merged.values()), viewerContext).sort(
        (a: any, b: any) =>
          (b.createdAt?.getTime?.() || b.createdAt?.seconds * 1000 || 0) -
          (a.createdAt?.getTime?.() || a.createdAt?.seconds * 1000 || 0),
      );
      setNotifications(items);
      setLoadingNotifications(false);
      setLoadError(false);
    };

    setLoadingNotifications(true);
    setLoadError(false);
    const unsubs = queries.map(({ name, q }) =>
      onSnapshot(
        q,
        (snap) => {
          snapshotByQuery.set(
            name,
            snap.docs.map((docSnap) => ({
              id: docSnap.id,
              ...docSnap.data(),
              createdAt: docSnap.data().createdAt?.toDate
                ? docSnap.data().createdAt.toDate()
                : new Date(),
            })),
          );
          mergeAndSet();
        },
        (err) => {
          console.error('[Notifications] inbox listener failed:', err);
          setLoadingNotifications(false);
          setLoadError(true);
        },
      ),
    );

    return () => unsubs.forEach((u) => u());
  }, [user?.uid, profile?.schoolId, userRole, profile?.role]);

  // 2. Fetch scoped delivery analytics for the current school (admins only)
  useEffect(() => {
    if (
      mainView !== "logs" ||
      !profile ||
      !["admin", "superadmin"].includes(profile.role)
    ) {
      return;
    }

    setIsLoadingLogs(true);

    const logsQuery =
      profile.role === "superadmin"
        ? query(
            collection(db, "notifications"),
            where("schoolId", "==", "system"),
            orderBy("createdAt", "desc"),
          )
        : profile.schoolId
          ? query(
              collection(db, "notifications"),
              where("schoolId", "==", profile.schoolId),
              where("userId", "==", profile.uid),
              orderBy("createdAt", "desc"),
            )
          : null;

    if (!logsQuery) {
      setDeliveryLogs([]);
      setIsLoadingLogs(false);
      return;
    }

    getDocs(logsQuery)
      .then((snap) => {
        const list = filterNotificationsForUser(
          snap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate
              ? doc.data().createdAt.toDate()
              : new Date(),
          })),
          viewerContext,
        );
        setDeliveryLogs(list);
        setIsLoadingLogs(false);
      })
      .catch((err) => {
        console.error("Error loading delivery logs:", err);
        setIsLoadingLogs(false);
      });
  }, [mainView, profile, user?.uid, userRole]);

  // 3. Filter notifications
  useEffect(() => {
    let result = [...notifications];

    if (categoryFilter !== 'all') {
      result = result.filter(
        (n) => resolveNotificationCategoryId(n) === categoryFilter,
      );
    }

    // Keyword Search (matching title or content message)
    if (searchTerm.trim() !== '') {
      const kw = searchTerm.toLowerCase();
      result = result.filter(n => 
        n.title?.toLowerCase().includes(kw) || 
        n.message?.toLowerCase().includes(kw)
      );
    }

    // Unread first, then newest
    result.sort((a, b) => {
      if (!!a.read !== !!b.read) return a.read ? 1 : -1;
      const ta = a.createdAt?.getTime?.() || a.createdAt?.seconds * 1000 || 0;
      const tb = b.createdAt?.getTime?.() || b.createdAt?.seconds * 1000 || 0;
      return tb - ta;
    });

    setFilteredNotifs(result);
  }, [notifications, categoryFilter, searchTerm]);

  // Bulk Actions
  const handleMarkAllRead = async () => {
    if (!user) return;
    try {
      await notificationService.markAllAsRead(user.uid);
      toast.success(isArabic ? "تم تحديد الكل كمقروء" : "All marked as read");
    } catch (e) {
      toast.error("Error setting stats");
    }
  };

  const handleDeleteAll = async () => {
    if (!user || notifications.length === 0) return;
    if (!window.confirm(isArabic ? "هل أنت متأكد من حذف جميع الإشعارات؟" : "Are you sure you want to delete all notifications?")) return;

    try {
      const batch = writeBatch(db);
      notifications.forEach(n => {
        batch.delete(doc(db, "notifications", n.id));
      });
      await batch.commit();
      toast.success(isArabic ? "تم مسح جميع الإشعارات" : "All notifications deleted");
    } catch (err) {
      console.error("Delete all failed:", err);
    }
  };

  const handleMarkOneRead = async (id: string, read: boolean, notification?: any) => {
    if (read) return; // already read
    if (notification && !isNotificationVisibleToUser(notification, viewerContext)) {
      return;
    }
    await notificationService.markAsRead(id);
  };

  const handleDeleteOne = async (e: React.MouseEvent, id: string, notification?: any) => {
    e.stopPropagation();
    if (notification && !isNotificationVisibleToUser(notification, viewerContext)) {
      return;
    }
    await notificationService.delete(id);
    toast.success(isArabic ? "تم حذف الإشعار" : "Notification deleted");
  };

  // Sound Config Sync
  const handleUpdateSoundSettings = (updates: Partial<UserSoundSettings>) => {
    const updated = { ...soundSettings, ...updates };
    setSoundSettings(updated);
    saveSoundSettings(updated);
  };

  const toggleCategoryMute = (cat: NotificationCategory) => {
    const arr = [...soundSettings.mutedCategories];
    const idx = arr.indexOf(cat);
    if (idx > -1) {
      arr.splice(idx, 1);
    } else {
      arr.push(cat);
    }
    handleUpdateSoundSettings({ mutedCategories: arr });
  };

  const triggerTestSound = () => {
    playCategorizedSound(testCategory, soundSettings);
  };

  const handleNotificationClick = async (n: any, openDetailsOnly = false) => {
    await handleMarkOneRead(n.id, n.read, n);

    if (openDetailsOnly) {
      setSelectedNotification(n);
      setMainView('detail');
      return;
    }

    const role = normalizeDashboardRole(userRole, profile?.role);
    const targetTab = resolveNotificationTab(n, role);

    if (targetTab && activeTabSetter) {
      notificationDiag.clickRoute({ notifId: n.id, targetTab, type: n.type });
      activeTabSetter(targetTab);
      onClose();
      return;
    }

    notificationDiag.clickRoute({ notifId: n.id, targetTab: null, type: n.type });
    setSelectedNotification(n);
    setMainView('detail');
  };

  const handleNotificationAction = async (n: any) => {
    const role = normalizeDashboardRole(userRole, profile?.role);
    const targetTab = resolveNotificationTab(n, role);
    await handleMarkOneRead(n.id, n.read, n);
    if (targetTab && activeTabSetter) {
      notificationDiag.clickRoute({ notifId: n.id, targetTab, type: n.type });
      activeTabSetter(targetTab);
      setSelectedNotification(null);
      setMainView('list');
      onClose();
    }
  };

  // Admin delivery simulation tool
  const triggerSimulationPush = async (item: any) => {
    try {
      const targetRef = doc(db, "notifications", item.id);
      
      // Update with Delivery Tracking status mimicking server-side transmission retry
      await updateDoc(targetRef, {
        deliveryStatus: 'delivered',
        retryCount: (item.retryCount || 0) + 1,
        deliveredAt: serverTimestamp()
      });

      // Show telemetry update to simulated retry
      toast.success(isArabic ? "تم إعادة إرسال الإشارة وتحديث سجل التوصيل" : "Emulated retry dispatch successful! Status logs synced.");
      
      // Update local copy
      setDeliveryLogs(prev => prev.map(log => log.id === item.id ? { 
        ...log, 
        deliveryStatus: 'delivered',
        retryCount: (log.retryCount || 0) + 1 
      } : log));

    } catch (e) {
      console.error(e);
    }
  };

  const triggerTestPush = async () => {
    if (!user?.uid || !profile?.schoolId || testPushSent || testPushPending) return;
    const role = normalizeDashboardRole(userRole, profile?.role);
    if (role !== 'superadmin' && !import.meta.env.DEV) return;

    setTestPushPending(true);
    try {
      const ok = await sendTestPushNotification(user.uid, profile.schoolId);
      if (ok) {
        setTestPushSent(true);
        toast.success(isArabic ? 'تم إنشاء إشعار تجريبي — أغلق التطبيق وانتظر Push' : 'Test notification created — close app and wait for push');
      } else {
        toast.error(isArabic ? 'تعذر إنشاء الإشعار التجريبي' : 'Could not create test notification');
      }
    } catch (e) {
      console.error('[NotificationsPush] test failed', e);
      toast.error(isArabic ? 'فشل الاختبار' : 'Test failed');
    } finally {
      setTestPushPending(false);
    }
  };

  const getCategoryIcon = (notification: Record<string, unknown>, gold = false) => {
    const catId = resolveNotificationCategoryId(notification);
    const useGold = gold || !notification.read;
    return renderCategoryIcon(catId, useGold);
  };

  const getCategoryLabel = (notification: Record<string, unknown>) => {
    const cat = getCategoryConfig(resolveNotificationCategoryId(notification));
    return isArabic ? cat.labelAr : cat.labelEn;
  };

  const groupedNotifs = React.useMemo(() => {
    const groups: Record<'today' | 'yesterday' | 'older', any[]> = {
      today: [],
      yesterday: [],
      older: [],
    };
    filteredNotifs.forEach((n) => {
      const d =
        n.createdAt instanceof Date
          ? n.createdAt
          : n.createdAt?.toDate?.() || new Date(n.createdAt);
      groups[getTimeGroup(d)].push(n);
    });
    return groups;
  }, [filteredNotifs]);

  const handleRefreshList = () => {
    setLoadError(false);
    toast.success(isArabic ? 'تم تحديث الإشعارات' : 'Notifications refreshed');
  };

  const displayCategories = NOTIFICATION_CATEGORIES.filter((c) =>
    DISPLAY_CATEGORY_IDS.includes(c.id),
  );

  const renderNotificationCard = (n: any) => {
    const role = normalizeDashboardRole(userRole, profile?.role);
    const hasRoute = Boolean(resolveNotificationTab(n, role));

    return (
      <div
        key={n.id}
        onClick={() => handleNotificationClick(n, !hasRoute)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleNotificationClick(n, !hasRoute);
          }
        }}
        className={`sx-notif-card ${!n.read ? 'sx-notif-card--unread' : 'sx-notif-card--read'}`}
        role="button"
        tabIndex={0}
        aria-label={getNotificationTitle(n)}
      >
        {!n.read && <span className="sx-notif-card__dot" aria-hidden />}
        <div className="sx-notif-card__icon">
          {getCategoryIcon(n, !n.read)}
        </div>
        <div className="sx-notif-card__top">
          <span className="sx-notif-card__category">{getCategoryLabel(n)}</span>
          <time className="sx-notif-card__time">
            {n.createdAt?.toLocaleTimeString?.([], { hour: '2-digit', minute: '2-digit' }) || ''}
          </time>
        </div>
        <h4 className="sx-notif-card__title">{getNotificationTitle(n)}</h4>
        <p className="sx-notif-card__message">{n.message}</p>
        <div className="sx-notif-card__footer">
          {hasRoute ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNotificationAction(n);
              }}
              className="sx-notif-card__action"
              aria-label={isArabic ? 'عرض' : 'View'}
            >
              {isArabic ? 'عرض' : 'View'}
              <ArrowLeft className="sx-notif-lucide" style={{ width: 14, height: 14 }} aria-hidden />
            </button>
          ) : (
            <span className="sx-notif-card__hint">
              {isArabic ? 'اضغط للتفاصيل' : 'Tap for details'}
            </span>
          )}
          <div className="sx-notif-card__menu">
            <button
              type="button"
              className="sx-notif-card__menu-btn"
              aria-label={isArabic ? 'المزيد' : 'More actions'}
              onClick={(e) => {
                e.stopPropagation();
                setCardMenuId(cardMenuId === n.id ? null : n.id);
              }}
            >
              <MoreVertical className="sx-notif-lucide sx-notif-lucide--muted" aria-hidden />
            </button>
            {cardMenuId === n.id && (
              <div className="sx-notif-card-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  onClick={(e) => {
                    void handleDeleteOne(e, n.id, n);
                    setCardMenuId(null);
                  }}
                >
                  <Trash2 className="sx-notif-lucide" style={{ width: 16, height: 16 }} aria-hidden />
                  {isArabic ? 'حذف' : 'Delete'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderListView = () => (
    <>
      <div className="sx-notif-search" dir={isArabic ? 'rtl' : 'ltr'}>
        <div className="sx-notif-search__wrap">
          <Search className="sx-notif-lucide sx-notif-lucide--muted sx-notif-search__icon" aria-hidden />
          <input
            type="search"
            className="has-icon"
            placeholder={isArabic ? 'ابحث في الإشعارات…' : 'Search notifications…'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label={isArabic ? 'بحث' : 'Search'}
          />
        </div>
      </div>

      {loadError ? (
        <div className="sx-notif-state">
          <AlertTriangle className="sx-notif-lucide sx-notif-lucide--gold" aria-hidden />
          <p>{isArabic ? 'تعذر تحميل الإشعارات' : 'Could not load notifications'}</p>
          <button type="button" onClick={handleRefreshList} className="sx-notif-card__action" style={{ marginTop: 16 }}>
            <RefreshCw className="sx-notif-lucide" style={{ width: 14, height: 14 }} aria-hidden />
            {isArabic ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      ) : loadingNotifications ? (
        <div className="sx-notif-state">
          <Loader2 className="sx-notif-lucide sx-notif-lucide--gold animate-spin" aria-hidden />
          <p>{isArabic ? 'جاري تحميل الإشعارات…' : 'Loading notifications…'}</p>
        </div>
      ) : filteredNotifs.length === 0 ? (
        <div className="sx-notif-empty">
          <Bell className="sx-notif-lucide sx-notif-lucide--gold" aria-hidden />
          <p>{isArabic ? 'لا توجد إشعارات حالياً' : 'No notifications right now'}</p>
          <p className="sx-notif-muted">{isArabic ? 'كل شيء محدث' : 'All caught up'}</p>
        </div>
      ) : (
        <div className="sx-notif-list">
          {(['today', 'yesterday', 'older'] as const).map((groupKey) =>
            groupedNotifs[groupKey].length > 0 ? (
              <div key={groupKey} className="sx-notif-group">
                <h3 className="sx-notif-group-label">
                  {isArabic ? TIME_GROUP_LABELS[groupKey].ar : TIME_GROUP_LABELS[groupKey].en}
                </h3>
                {groupedNotifs[groupKey].map(renderNotificationCard)}
              </div>
            ) : null,
          )}
        </div>
      )}
    </>
  );

  const renderDetailView = () => {
    if (!selectedNotification) return null;
    const role = normalizeDashboardRole(userRole, profile?.role);
    const hasRoute = Boolean(resolveNotificationTab(selectedNotification, role));

    return (
      <div className="sx-notif-detail-view">
        <div className="sx-notif-detail-card">
          <div className="sx-notif-detail-view__icon">
            {getCategoryIcon(selectedNotification, true)}
          </div>
          <span className="sx-notif-detail-view__badge">{getCategoryLabel(selectedNotification)}</span>
          <h3 className="sx-notif-detail-view__title">{getNotificationTitle(selectedNotification)}</h3>
          <p className="sx-notif-detail-view__message">{selectedNotification.message}</p>
          <div className="sx-notif-detail-view__meta">
            {(selectedNotification.senderName || selectedNotification.metadata?.senderName) && (
              <div className="sx-notif-detail-view__meta-row">
                <MessageSquare className="sx-notif-lucide sx-notif-lucide--muted" style={{ width: 14, height: 14 }} aria-hidden />
                <span>
                  {isArabic ? 'المرسل:' : 'From:'}{' '}
                  {selectedNotification.senderName || selectedNotification.metadata?.senderName}
                </span>
              </div>
            )}
            {selectedNotification.metadata?.studentName && (
              <div className="sx-notif-detail-view__meta-row">
                <BookOpen className="sx-notif-lucide sx-notif-lucide--muted" style={{ width: 14, height: 14 }} aria-hidden />
                <span>
                  {isArabic ? 'الطالب:' : 'Student:'} {selectedNotification.metadata.studentName}
                </span>
              </div>
            )}
            <div className="sx-notif-detail-view__meta-row">
              <Bell className="sx-notif-lucide sx-notif-lucide--muted" style={{ width: 14, height: 14 }} aria-hidden />
              <span>{selectedNotification.createdAt?.toLocaleString?.() || ''}</span>
            </div>
          </div>
          {hasRoute && (
            <button
              type="button"
              onClick={() => handleNotificationAction(selectedNotification)}
              className="sx-notif-card__action sx-notif-detail-view__action"
            >
              {isArabic ? 'عرض' : 'View'}
              <ArrowLeft className="sx-notif-lucide" style={{ width: 16, height: 16 }} aria-hidden />
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderSettingsView = () => (
    <div className="sx-notif-settings">
      <details className="sx-notif-settings__section">
        <summary>
          {isArabic ? 'إعدادات الصوت' : 'Sound settings'}
          <Volume2 className="sx-notif-lucide" aria-hidden />
        </summary>
        <div className="sx-notif-settings__body">
          <div className="sx-notif-settings__stack">
            <div className="sx-notif-chip-grid">
              {[
                { id: 'crystal', label: isArabic ? 'كريستالي' : 'Crystal' },
                { id: 'minimal', label: isArabic ? 'مبسّط' : 'Minimal' },
                { id: 'relaxing', label: isArabic ? 'هادئ' : 'Relaxing' },
                { id: 'modern', label: isArabic ? 'عصري' : 'Modern' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleUpdateSoundSettings({ profile: p.id as UserSoundSettings['profile'] })}
                  className={`sx-notif-chip ${soundSettings.profile === p.id ? 'sx-notif-chip--active' : ''}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div>
              <label className="sx-notif-card__category">
                {isArabic ? 'مستوى الصوت' : 'Volume'}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={soundSettings.volume}
                onChange={(e) => handleUpdateSoundSettings({ volume: parseFloat(e.target.value) })}
                className="sx-notif-range"
              />
            </div>
            <div className="sx-notif-settings__stack">
              {[
                { id: 'announcement' as NotificationCategory, label: isArabic ? 'الإعلانات' : 'Announcements' },
                { id: 'message' as NotificationCategory, label: isArabic ? 'الرسائل' : 'Messages' },
                { id: 'payment' as NotificationCategory, label: isArabic ? 'الأقساط' : 'Payments' },
                { id: 'attendance' as NotificationCategory, label: isArabic ? 'الحضور' : 'Attendance' },
                { id: 'grade' as NotificationCategory, label: isArabic ? 'الدرجات' : 'Grades' },
                { id: 'system' as NotificationCategory, label: isArabic ? 'النظام' : 'System' },
              ].map((cat) => {
                const isMuted = soundSettings.mutedCategories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategoryMute(cat.id)}
                    className={`sx-notif-toggle-row ${isMuted ? 'sx-notif-chip--muted' : ''}`}
                  >
                    <span>{cat.label}</span>
                    <span>{isMuted ? <VolumeX className="sx-notif-lucide sx-notif-lucide--muted" aria-hidden /> : <Volume2 className="sx-notif-lucide" aria-hidden />}</span>
                  </button>
                );
              })}
            </div>
            <div className="sx-notif-select-row">
              <select
                value={testCategory}
                onChange={(e) => setTestCategory(e.target.value as NotificationCategory)}
                className="sx-notif-select"
              >
                <option value="announcement">{isArabic ? 'إعلان' : 'Announcement'}</option>
                <option value="message">{isArabic ? 'رسالة' : 'Message'}</option>
                <option value="payment">{isArabic ? 'دفع' : 'Payment'}</option>
              </select>
              <button type="button" onClick={triggerTestSound} className="sx-notif-card__action">
                {isArabic ? 'استمع' : 'Play'}
              </button>
            </div>
          </div>
        </div>
      </details>

      <details className="sx-notif-settings__section">
        <summary>
          {isArabic ? 'إعدادات الإشعارات' : 'Notification settings'}
          <Bell className="sx-notif-lucide" aria-hidden />
        </summary>
        <div className="sx-notif-settings__body">
          <div className="sx-notif-settings__stack">
            <p>
              {isArabic
                ? 'فعّل استلام التنبيهات على هذا الجهاز حتى عند إغلاق التطبيق.'
                : 'Enable push on this device even when the app is closed.'}
            </p>
            {webPushWarning && (
              <p className="sx-notif-settings__alert sx-notif-settings__alert--warn">{webPushWarning}</p>
            )}
            {webPushStatus === 'denied' && (
              <p className="sx-notif-settings__alert sx-notif-settings__alert--danger">
                {getPermissionDeniedGuidance(isArabic)}
              </p>
            )}
            {!Capacitor.isNativePlatform() && (
              <button
                type="button"
                onClick={handleRegisterDevice}
                disabled={registeringDevice}
                className="sx-notif-footer__btn sx-notif-footer__btn--primary"
                style={{ width: '100%' }}
              >
                <Bell className="sx-notif-lucide" aria-hidden />
                {registeringDevice
                  ? isArabic ? 'جاري التسجيل…' : 'Registering…'
                  : isArabic ? 'تسجيل هذا الجهاز' : 'Register this device'}
              </button>
            )}
            {webPushStatus === 'granted' && pushDiag?.tokenSavedToFirestore && (
              <p className="sx-notif-settings__alert sx-notif-settings__alert--success">
                {isArabic ? '✓ مفعل ونشط' : '✓ Active'}
              </p>
            )}
            {(normalizeDashboardRole(userRole, profile?.role) === 'superadmin' || import.meta.env.DEV) && (
              <button
                type="button"
                disabled={testPushSent || testPushPending || !profile?.schoolId}
                onClick={triggerTestPush}
                className="sx-notif-footer__btn sx-notif-footer__btn--ghost"
                style={{ width: '100%' }}
              >
                <RefreshCw className="sx-notif-lucide" aria-hidden />
                {testPushPending
                  ? isArabic ? 'جاري الإرسال…' : 'Sending…'
                  : testPushSent
                    ? isArabic ? 'تم الإرسال' : 'Sent'
                    : isArabic ? 'إرسال push تجريبي' : 'Send test push'}
              </button>
            )}
          </div>
        </div>
      </details>

      <details className="sx-notif-settings__section">
        <summary>
          {isArabic ? 'تشخيص FCM' : 'FCM diagnostics'}
          <Settings className="sx-notif-lucide" aria-hidden />
        </summary>
        <div className="sx-notif-settings__body">
          {pushDiag ? (
            <div className="sx-notif-diag-grid">
              <div>VAPID: {pushDiag.vapidConfigured ? 'yes' : 'no'} ({pushDiag.vapidSource})</div>
              <div>Permission: {pushDiag.permission}</div>
              <div>SW: {pushDiag.serviceWorkerActive ? 'active' : 'inactive'}</div>
              <div>FCM token: {pushDiag.fcmTokenGenerated ? 'yes' : 'no'}</div>
              <div>Firestore tokens: {pushDiag.firestoreTokenCount}</div>
              {pushDiag.lastError && <div className="sx-notif-diag-error">Error: {pushDiag.lastError}</div>}
            </div>
          ) : (
            <p>{isArabic ? 'افتح هذا القسم لتحميل التشخيص' : 'Open to load diagnostics'}</p>
          )}
          <button
            type="button"
            disabled={runningTokenDiag || !user?.uid}
            onClick={handleRunTokenDiagnostics}
            className="sx-notif-footer__btn sx-notif-footer__btn--ghost"
            style={{ width: '100%', marginTop: 12 }}
          >
            <RefreshCw className="sx-notif-lucide" aria-hidden />
            {runningTokenDiag
              ? isArabic ? 'جاري الفحص…' : 'Running…'
              : isArabic ? 'فحص التوكن' : 'Run token check'}
          </button>
        </div>
      </details>

      {isAdminUser && (
        <details className="sx-notif-settings__section">
          <summary>
            {isArabic ? 'سجل الإرسال' : 'Delivery logs'}
            <ClipboardCheck className="sx-notif-lucide" aria-hidden />
          </summary>
          <div className="sx-notif-settings__body">
            <p>{isArabic ? 'عرض سجل توصيل الإشعارات للمدرسة.' : 'View notification delivery history for your school.'}</p>
            <button
              type="button"
              onClick={() => setMainView('logs')}
              className="sx-notif-footer__btn sx-notif-footer__btn--ghost"
              style={{ width: '100%', marginTop: 12 }}
            >
              {isArabic ? 'فتح السجل' : 'Open logs'}
            </button>
          </div>
        </details>
      )}
    </div>
  );

  const renderLogsView = () => (
    <div className="sx-notif-logs">
      <div className="sx-notif-logs__header">
        <h3 className="sx-notif-logs__title">
          {isArabic ? 'سجل الإرسال' : 'Delivery logs'}
        </h3>
        <button
          type="button"
          onClick={() => {
            setIsLoadingLogs(true);
            if (!profile) return;
            getDocs(
              profile.role === 'superadmin'
                ? query(collection(db, 'notifications'), where('schoolId', '==', 'system'), orderBy('createdAt', 'desc'))
                : query(
                    collection(db, 'notifications'),
                    where('schoolId', '==', profile.schoolId),
                    where('userId', '==', profile.uid),
                    orderBy('createdAt', 'desc'),
                  ),
            ).then((snap) => {
              const list = filterNotificationsForUser(
                snap.docs.map((d) => ({
                  id: d.id,
                  ...d.data(),
                  createdAt: d.data().createdAt?.toDate ? d.data().createdAt.toDate() : new Date(),
                })),
                viewerContext,
              );
              setDeliveryLogs(list);
              setIsLoadingLogs(false);
              toast.success(isArabic ? 'تم التحديث' : 'Updated');
            });
          }}
          className="sx-btn-icon sx-notif-header__btn"
          aria-label={isArabic ? 'تحديث' : 'Refresh'}
        >
          <RefreshCw className="sx-notif-lucide" aria-hidden />
        </button>
      </div>
      {isLoadingLogs ? (
        <div className="sx-notif-state">
          <Loader2 className="sx-notif-lucide sx-notif-lucide--gold animate-spin" aria-hidden />
        </div>
      ) : deliveryLogs.length === 0 ? (
        <div className="sx-notif-state">
          <p className="sx-notif-muted">{isArabic ? 'لا توجد سجلات' : 'No logs'}</p>
        </div>
      ) : (
        <div>
          {deliveryLogs.slice(0, 10).map((log) => (
            <div key={log.id} className="sx-notif-log-item">
              <p className="sx-notif-log-item__title">{log.title}</p>
              <p className="sx-notif-log-item__msg">{log.message}</p>
              <div className="sx-notif-log-item__row">
                <span className="sx-notif-log-item__type">{log.type}</span>
                <button
                  type="button"
                  onClick={() => triggerSimulationPush(log)}
                  className="sx-notif-log-item__retry"
                >
                  <RefreshCw className="sx-notif-lucide" style={{ width: 12, height: 12, display: 'inline' }} aria-hidden />
                  {isArabic ? 'إعادة' : 'Retry'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return createPortal(
    <div
      className="sx-notif-overlay fixed inset-0"
      style={{ zIndex: 9999 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={isArabic ? 'مركز الإشعارات' : 'Notification center'}
    >
      <div
        className="sx-notif-shell"
        dir={isArabic ? 'rtl' : 'ltr'}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sx-notif-panel">
          {/* Header */}
          <header className="sx-notif-header">
            <div className="sx-notif-header__row">
              <div className="sx-notif-header__title-wrap">
                {mainView !== 'list' && (
                  <button
                    type="button"
                    className="sx-btn-icon sx-notif-header__btn"
                    onClick={() => {
                      if (mainView === 'detail') {
                        setSelectedNotification(null);
                        setMainView('list');
                      } else {
                        setMainView('list');
                      }
                    }}
                    aria-label={isArabic ? 'رجوع' : 'Back'}
                  >
                    <ArrowLeft className="sx-notif-lucide" aria-hidden />
                  </button>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h2 className="sx-notif-header__title">
                      {mainView === 'detail'
                        ? isArabic ? 'تفاصيل الإشعار' : 'Notification details'
                        : mainView === 'settings'
                          ? isArabic ? 'الإعدادات' : 'Settings'
                          : mainView === 'logs'
                            ? isArabic ? 'سجل الإرسال' : 'Delivery logs'
                            : isArabic ? 'الإشعارات' : 'Notifications'}
                    </h2>
                    {mainView === 'list' && unreadCount > 0 && (
                      <span className="sx-notif-unread-badge" aria-label={isArabic ? 'غير مقروء' : 'Unread'}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>
                  {mainView === 'list' && (
                    <p className="sx-notif-header__sub">
                      {unreadCount > 0
                        ? isArabic
                          ? `${unreadCount} غير مقروء`
                          : `${unreadCount} unread`
                        : isArabic
                          ? 'كل شيء محدث'
                          : 'All caught up'}
                    </p>
                  )}
                </div>
              </div>
              <div className="sx-notif-header__actions">
                {mainView === 'list' && (
                  <button
                    type="button"
                    onClick={() => setMainView('settings')}
                    className="sx-btn-icon sx-notif-header__btn"
                    aria-label={isArabic ? 'الإعدادات' : 'Settings'}
                  >
                    <Settings className="sx-notif-lucide" aria-hidden />
                  </button>
                )}
                {mainView !== 'list' && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="sx-btn-icon sx-notif-header__btn"
                    aria-label={isArabic ? 'إغلاق' : 'Close'}
                  >
                    <X className="sx-notif-lucide" aria-hidden />
                  </button>
                )}
              </div>
            </div>
          </header>

          {/* Category tabs — list view only */}
          {mainView === 'list' && (
            <div className="sx-notif-tabs-wrap">
              <div className="sx-notif-tabs" role="tablist" aria-label={isArabic ? 'فئات الإشعارات' : 'Notification categories'}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={categoryFilter === 'all'}
                  className={`sx-notif-tab ${categoryFilter === 'all' ? 'sx-notif-tab--active' : ''}`}
                  onClick={() => setCategoryFilter('all')}
                >
                  {isArabic ? 'الكل' : 'All'}
                </button>
                {displayCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    role="tab"
                    aria-selected={categoryFilter === cat.id}
                    className={`sx-notif-tab ${categoryFilter === cat.id ? 'sx-notif-tab--active' : ''}`}
                    onClick={() => setCategoryFilter(cat.id)}
                  >
                    {isArabic ? cat.labelAr : cat.labelEn}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Body */}
          <main className="sx-notif-body">
            {mainView === 'list' && renderListView()}
            {mainView === 'detail' && renderDetailView()}
            {mainView === 'settings' && renderSettingsView()}
            {mainView === 'logs' && renderLogsView()}
          </main>

          {/* Footer — list view */}
          {mainView === 'list' && (
            <footer className="sx-notif-footer">
              <button
                type="button"
                className="sx-notif-footer__btn sx-notif-footer__btn--ghost"
                onClick={handleRefreshList}
                aria-label={isArabic ? 'تحديث' : 'Refresh'}
              >
                <RefreshCw className="sx-notif-lucide" aria-hidden />
                {isArabic ? 'تحديث' : 'Refresh'}
              </button>
              <button
                type="button"
                className="sx-notif-footer__btn sx-notif-footer__btn--primary"
                onClick={handleMarkAllRead}
                disabled={unreadCount === 0}
                aria-label={isArabic ? 'تحديد الكل كمقروء' : 'Mark all read'}
              >
                <Check className="sx-notif-lucide" aria-hidden />
                {isArabic ? 'تحديد الكل' : 'Mark all'}
              </button>
              <button
                type="button"
                className="sx-notif-footer__btn sx-notif-footer__btn--danger"
                onClick={onClose}
                aria-label={isArabic ? 'إغلاق' : 'Close'}
              >
                <X className="sx-notif-lucide" aria-hidden />
                {isArabic ? 'إغلاق' : 'Close'}
              </button>
            </footer>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};
