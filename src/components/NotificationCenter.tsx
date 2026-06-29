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
import { isResourceExhaustedError } from "../lib/firestoreQuota";
import { useAuth } from "../lib/AuthContext";
import { 
  Bell,
  BellRing, 
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
  Shield,
  Wallet,
  UserRound,
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
  NOTIF_FILTER_TABS,
  countNotifFilter,
  matchesNotifFilter,
  emptyStateForFilter,
  type NotifFilterId,
} from "../lib/notificationFilters";
import {
  mergeNotificationPreferences,
  filterNotificationsByPreferences,
  saveNotificationPreferences,
  PREFERENCE_TOGGLES,
  type NotificationPreferences,
  type NotificationPreferenceKey,
} from "../lib/notificationPreferences";
import {
  buildGroupedNotificationList,
  groupSummaryLabel,
  type NotificationListItem,
} from "../lib/notificationGrouping";
import { isCriticalNotification, canManuallyDeleteNotification } from "../lib/notificationRetention";
import { NotificationSwipeCard } from "./NotificationSwipeCard";
import { PremiumSectionHeader, SectionHeaderButton } from "./PremiumSectionHeader";
import {
  filterNotificationsForUser,
  isNotificationVisibleToUser,
} from "../lib/notificationVisibility";
import { getSafeHomeworkNotificationTitle } from "../lib/homeworkSubjects";
import { buildTeacherRedactionContext } from "../lib/userProfile";
import { toast } from "react-hot-toast";
import {
  resolveNotificationCategoryId,
  getCategoryConfig,
  getTimeGroup,
  TIME_GROUP_LABELS,
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

type MainView = 'list' | 'detail' | 'settings' | 'logs' | 'preferences';

const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  messages: MessageSquare,
  tuition: Wallet,
  attendance: ClipboardCheck,
  homework: BookOpen,
  system: Settings,
  announcements: Bell,
  reports: UserRound,
  smart_gate: Shield,
};

/** Icons keyed by raw notification type for premium card styling. */
const TYPE_ICON_MAP: Record<string, LucideIcon> = {
  tuition: Wallet,
  payment: CreditCard,
  homework: BookOpen,
  behavior: UserRound,
  attendance: ClipboardCheck,
  chat: MessageSquare,
  message: MessageSquare,
  system: Settings,
  security: Shield,
  billing: CreditCard,
  subscription: CreditCard,
  system_critical: Shield,
};

const TYPE_ICON_CLASS: Record<string, string> = {
  tuition: 'sx-notif-icon--tuition',
  payment: 'sx-notif-icon--payment',
  homework: 'sx-notif-icon--homework',
  behavior: 'sx-notif-icon--behavior',
  attendance: 'sx-notif-icon--attendance',
  chat: 'sx-notif-icon--chat',
  message: 'sx-notif-icon--chat',
  system: 'sx-notif-icon--system',
  security: 'sx-notif-icon--security',
};

function resolveTypeIcon(notification: Record<string, unknown>): LucideIcon {
  const rawType = String(notification.type ?? '').toLowerCase();
  if (TYPE_ICON_MAP[rawType]) return TYPE_ICON_MAP[rawType];
  const catId = resolveNotificationCategoryId(notification);
  return CATEGORY_ICON_MAP[catId] ?? Bell;
}

function resolveTypeIconClass(notification: Record<string, unknown>): string {
  const rawType = String(notification.type ?? '').toLowerCase();
  return TYPE_ICON_CLASS[rawType] ?? 'sx-notif-icon--default';
}

function formatNotificationTime(
  value: Date | { toDate?: () => Date; seconds?: number } | undefined,
  isArabic: boolean,
): string {
  if (!value) return '';
  const date =
    value instanceof Date
      ? value
      : typeof (value as { toDate?: () => Date }).toDate === 'function'
        ? (value as { toDate: () => Date }).toDate()
        : typeof (value as { seconds?: number }).seconds === 'number'
          ? new Date((value as { seconds: number }).seconds * 1000)
          : new Date();
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const isToday = date.toDateString() === now.toDateString();

  if (diffMin < 1) return isArabic ? 'الآن' : 'Just now';
  if (diffMin < 60) return isArabic ? `منذ ${diffMin} د` : `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24 && isToday) {
    return date.toLocaleTimeString(isArabic ? 'ar-IQ' : undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    const time = date.toLocaleTimeString(isArabic ? 'ar-IQ' : undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
    return isArabic ? `أمس ${time}` : `Yesterday ${time}`;
  }
  return date.toLocaleDateString(isArabic ? 'ar-IQ' : undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function renderCategoryIcon(
  notification: Record<string, unknown>,
  gold = false,
) {
  const Icon = resolveTypeIcon(notification);
  const typeClass = resolveTypeIconClass(notification);
  return (
    <Icon
      className={`sx-action-icon sx-notif-lucide ${typeClass}${gold ? ' sx-notif-lucide--gold' : ''}`}
      strokeWidth={2.25}
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
  const [categoryFilter, setCategoryFilter] = useState<NotifFilterId>('all');
  const [loadError, setLoadError] = useState(false);
  const [cardMenuId, setCardMenuId] = useState<string | null>(null);
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<Set<string>>(new Set());
  const [notifPreferences, setNotifPreferences] = useState<NotificationPreferences>(
    mergeNotificationPreferences(profile?.notificationPreferences),
  );
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [touchSwipeEnabled, setTouchSwipeEnabled] = useState(false);
  
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
  const todayCount = React.useMemo(() => {
    const today = new Date().toDateString();
    return notifications.filter((n) => {
      const d =
        n.createdAt instanceof Date
          ? n.createdAt
          : n.createdAt?.toDate?.() || new Date(n.createdAt);
      return d.toDateString() === today;
    }).length;
  }, [notifications]);

  const preferenceVisibleNotifs = React.useMemo(
    () => filterNotificationsByPreferences(notifications, notifPreferences),
    [notifications, notifPreferences],
  );

  const filterCounts = React.useMemo(() => {
    const counts: Record<NotifFilterId, number> = {
      all: preferenceVisibleNotifs.length,
      unread: 0,
      messages: 0,
      tuition: 0,
      homework: 0,
      attendance: 0,
      system: 0,
    };
    for (const tab of NOTIF_FILTER_TABS) {
      if (tab.id === 'all') continue;
      counts[tab.id] = countNotifFilter(preferenceVisibleNotifs, tab.id);
    }
    return counts;
  }, [preferenceVisibleNotifs]);
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
      if (mainView === 'settings' || mainView === 'logs' || mainView === 'preferences') {
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
    setNotifPreferences(mergeNotificationPreferences(profile?.notificationPreferences));
  }, [profile?.notificationPreferences, user?.uid]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const touch = 'ontouchstart' in window;
    setTouchSwipeEnabled(coarse || touch);
  }, []);

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

  // 3. Filter notifications (client-side only)
  useEffect(() => {
    let result = filterNotificationsByPreferences([...notifications], notifPreferences);

    if (categoryFilter !== 'all') {
      result = result.filter((n) => matchesNotifFilter(n, categoryFilter));
    }

    if (searchTerm.trim() !== '') {
      const kw = searchTerm.toLowerCase();
      result = result.filter(
        (n) =>
          n.title?.toLowerCase().includes(kw) ||
          n.message?.toLowerCase().includes(kw),
      );
    }

    result.sort((a, b) => {
      if (!!a.read !== !!b.read) return a.read ? 1 : -1;
      const ta = a.createdAt?.getTime?.() || a.createdAt?.seconds * 1000 || 0;
      const tb = b.createdAt?.getTime?.() || b.createdAt?.seconds * 1000 || 0;
      return tb - ta;
    });

    setFilteredNotifs(result);
  }, [notifications, categoryFilter, searchTerm, notifPreferences]);

  const cleanupRanRef = React.useRef(false);

  useEffect(() => {
    if (loadingNotifications) {
      cleanupRanRef.current = false;
      return;
    }
    if (notifications.length === 0 || cleanupRanRef.current) return;
    cleanupRanRef.current = true;
    void notificationService.cleanupExpiredSeenFromList(notifications);
  }, [loadingNotifications, notifications]);

  // Bulk Actions
  const handleMarkAllRead = async () => {
    if (!user) return;
    try {
      const ok = await notificationService.markAllAsRead(user.uid);
      if (ok) {
        toast.success(isArabic ? "تم تحديد الكل كمقروء" : "All marked as read");
      }
    } catch (e) {
      if (!isResourceExhaustedError(e)) {
        toast.error("Error setting stats");
      }
    }
  };

  const handleDeleteAll = async () => {
    if (!user || notifications.length === 0) return;
    const role = normalizeDashboardRole(userRole, profile?.role);
    const deletable = notifications.filter(
      (n) => n.read && canManuallyDeleteNotification(n, role),
    );
    if (deletable.length === 0) {
      toast.error(
        isArabic ? 'لا توجد إشعارات مقروءة قابلة للحذف' : 'No deletable read notifications',
      );
      return;
    }
    if (
      !window.confirm(
        isArabic
          ? `حذف ${Math.min(deletable.length, 50)} إشعاراً مقروءاً؟`
          : `Delete ${Math.min(deletable.length, 50)} read notifications?`,
      )
    ) {
      return;
    }

    try {
      const count = await notificationService.deleteAllReadNonCritical(notifications, role, 50);
      if (count > 0) {
        toast.success(
          isArabic ? `تم حذف ${count} إشعاراً مقروءاً` : `Deleted ${count} read notifications`,
        );
      } else {
        toast.error(isArabic ? 'تعذر الحذف' : 'Delete failed');
      }
    } catch (err) {
      console.error('Delete read failed:', err);
      toast.error(isArabic ? 'تعذر حذف الإشعارات' : 'Could not delete notifications');
    }
  };

  const handleMarkOneRead = async (id: string, read: boolean, notification?: any) => {
    if (read) return;
    if (notification && !isNotificationVisibleToUser(notification, viewerContext)) {
      return;
    }
    await notificationService.markAsRead(id, notification);
  };

  const handleDeleteOne = async (e: React.MouseEvent | null, id: string, notification?: any) => {
    e?.stopPropagation();
    if (notification && !isNotificationVisibleToUser(notification, viewerContext)) {
      return;
    }
    const role = normalizeDashboardRole(userRole, profile?.role);
    if (notification && !canManuallyDeleteNotification(notification, role)) {
      toast.error(
        isArabic ? 'لا يمكن حذف إشعارات النظام الحرجة' : 'Critical notifications cannot be deleted',
      );
      return;
    }
    const ok = await notificationService.delete(id, notification);
    if (ok) {
      toast.success(isArabic ? 'تم حذف الإشعار' : 'Notification deleted');
    } else {
      toast.error(isArabic ? 'تعذر حذف الإشعار' : 'Could not delete notification');
    }
  };

  const handleSwipeMarkRead = async (n: any) => {
    if (n.read) return;
    await handleMarkOneRead(n.id, n.read, n);
    toast.success(isArabic ? 'تم التحديد كمقروء' : 'Marked as read');
  };

  const handleSwipeDelete = async (n: any) => {
    await handleDeleteOne(null, n.id, n);
  };

  const handleTogglePreference = async (key: NotificationPreferenceKey) => {
    if (!user?.uid) return;
    const nextValue = !mergeNotificationPreferences(notifPreferences)[key];
    setPrefsSaving(true);
    try {
      const saved = await saveNotificationPreferences(user.uid, notifPreferences, {
        [key]: nextValue,
      });
      setNotifPreferences(saved);
      toast.success(isArabic ? 'تم حفظ التفضيلات' : 'Preferences saved');
    } catch (err) {
      console.error('Failed to save notification preferences', err);
      toast.error(isArabic ? 'تعذر حفظ التفضيلات' : 'Could not save preferences');
    } finally {
      setPrefsSaving(false);
    }
  };

  const toggleGroupExpanded = (key: string) => {
    setExpandedGroupKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
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

  const consumeNotificationOnOpen = async (n: any) => {
    if (!n?.id) return;
    if (!isNotificationVisibleToUser(n, viewerContext)) return;

    const ok = await notificationService.markAsSeenOnOpen(n.id, n);
    if (!ok) {
      await handleMarkOneRead(n.id, n.read, n);
    }
  };

  const handleNotificationClick = async (n: any, openDetailsOnly = false) => {
    await consumeNotificationOnOpen(n);

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
    await consumeNotificationOnOpen(n);
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
    const useGold = gold || !notification.read;
    return renderCategoryIcon(notification, useGold);
  };

  const getCategoryLabel = (notification: Record<string, unknown>) => {
    const cat = getCategoryConfig(resolveNotificationCategoryId(notification));
    return isArabic ? cat.labelAr : cat.labelEn;
  };

  const groupedListItems = React.useMemo(() => {
    const byTime: Record<'today' | 'yesterday' | 'older', NotificationListItem[]> = {
      today: [],
      yesterday: [],
      older: [],
    };

    const timeBuckets: Record<'today' | 'yesterday' | 'older', any[]> = {
      today: [],
      yesterday: [],
      older: [],
    };

    filteredNotifs.forEach((n) => {
      const d =
        n.createdAt instanceof Date
          ? n.createdAt
          : n.createdAt?.toDate?.() || new Date(n.createdAt);
      timeBuckets[getTimeGroup(d)].push(n);
    });

    (['today', 'yesterday', 'older'] as const).forEach((bucket) => {
      byTime[bucket] = buildGroupedNotificationList(timeBuckets[bucket]);
    });

    return byTime;
  }, [filteredNotifs]);

  const handleRefreshList = () => {
    setLoadError(false);
    toast.success(isArabic ? 'تم تحديث الإشعارات' : 'Notifications refreshed');
  };

  const renderNotificationCardInner = (n: any) => {
    const role = normalizeDashboardRole(userRole, profile?.role);
    const hasRoute = Boolean(resolveNotificationTab(n, role));

    return (
      <div
        onClick={() => handleNotificationClick(n, !hasRoute)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleNotificationClick(n, !hasRoute);
          }
        }}
        className={`sx-notif-card ${!n.read ? 'sx-notif-card--unread' : 'sx-notif-card--read'} ${resolveTypeIconClass(n)}`}
        role="button"
        tabIndex={0}
        aria-label={getNotificationTitle(n)}
      >
        {!n.read && <span className="sx-notif-card__dot" aria-hidden />}
        <div className={`sx-notif-card__icon ${resolveTypeIconClass(n)}`}>
          {getCategoryIcon(n, !n.read)}
        </div>
        <div className="sx-notif-card__top">
          <span className="sx-notif-card__category">{getCategoryLabel(n)}</span>
          {isCriticalNotification(n) && (
            <span className="sx-notif-card__critical-badge">
              {isArabic ? 'حرج' : 'Critical'}
            </span>
          )}
          <time
            className="sx-notif-card__time"
            dateTime={n.createdAt instanceof Date ? n.createdAt.toISOString() : undefined}
          >
            {formatNotificationTime(n.createdAt, isArabic)}
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
              <span className="sx-action-label">{isArabic ? 'عرض' : 'View'}</span>
              <ArrowLeft className="sx-action-icon" strokeWidth={2.25} aria-hidden />
            </button>
          ) : (
            <span className="sx-notif-card__hint">
              {isArabic ? 'اضغط للتفاصيل' : 'Tap for details'}
            </span>
          )}
          <div className="sx-notif-card__menu">
            <button
              type="button"
              className="sx-action-btn sx-action-btn-icon sx-notif-card__menu-btn"
              aria-label={isArabic ? 'المزيد' : 'More actions'}
              onClick={(e) => {
                e.stopPropagation();
                setCardMenuId(cardMenuId === n.id ? null : n.id);
              }}
            >
              <MoreVertical className="sx-action-icon sx-notif-lucide--muted" strokeWidth={2.25} aria-hidden />
            </button>
            {cardMenuId === n.id && (
              <div className="sx-notif-card-menu" role="menu">
                {canManuallyDeleteNotification(
                  n,
                  normalizeDashboardRole(userRole, profile?.role),
                ) && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={(e) => {
                      void handleDeleteOne(e, n.id, n);
                      setCardMenuId(null);
                    }}
                    aria-label={isArabic ? 'حذف الإشعار' : 'Delete notification'}
                  >
                    <Trash2 className="sx-notif-lucide" style={{ width: 16, height: 16 }} aria-hidden />
                    {isArabic ? 'حذف' : 'Delete'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderNotificationCard = (n: any) => (
    <NotificationSwipeCard
      key={n.id}
      notification={n}
      isArabic={isArabic}
      enableSwipe={touchSwipeEnabled && mainView === 'list'}
      userRole={normalizeDashboardRole(userRole, profile?.role)}
      onMarkRead={() => void handleSwipeMarkRead(n)}
      onDelete={() => void handleSwipeDelete(n)}
      onCriticalDeleteBlocked={() =>
        toast.error(
          isArabic ? 'لا يمكن حذف إشعارات النظام الحرجة' : 'Critical notifications cannot be deleted',
        )
      }
    >
      {renderNotificationCardInner(n)}
    </NotificationSwipeCard>
  );

  const renderGroupCard = (item: Extract<NotificationListItem, { kind: 'group' }>) => {
    const expanded = expandedGroupKeys.has(item.key);
    const latest = item.notifications[0];
    const summary = groupSummaryLabel(item.type, item.notifications.length, isArabic);
    const unreadInGroup = item.notifications.filter((n) => !n.read).length;

    return (
      <div key={item.key} className="sx-notif-group-card">
        <button
          type="button"
          className={`sx-notif-group-card__header${unreadInGroup > 0 ? ' sx-notif-group-card__header--unread' : ''}`}
          onClick={() => toggleGroupExpanded(item.key)}
          aria-expanded={expanded}
          aria-label={summary}
        >
          <div className={`sx-notif-card__icon ${resolveTypeIconClass(latest)}`}>
            {getCategoryIcon(latest, unreadInGroup > 0)}
          </div>
          <div className="sx-notif-group-card__body">
            <span className="sx-notif-group-card__count">{item.notifications.length}</span>
            <span className="sx-notif-group-card__title">{summary}</span>
            <span className="sx-notif-group-card__hint">
              {expanded
                ? isArabic ? 'اضغط للطي' : 'Tap to collapse'
                : isArabic ? 'اضغط لعرض التفاصيل' : 'Tap to expand'}
            </span>
          </div>
        </button>
        {expanded && (
          <div className="sx-notif-group-card__items">
            {item.notifications.map(renderNotificationCard)}
          </div>
        )}
      </div>
    );
  };

  const renderListItem = (item: NotificationListItem) => {
    if (item.kind === 'single') return renderNotificationCard(item.notification);
    return renderGroupCard(item);
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
          <button type="button" onClick={handleRefreshList} className="sx-action-btn sx-action-btn-secondary sx-action-btn--block" style={{ marginTop: 16 }}>
            <RefreshCw className="sx-action-icon" strokeWidth={2.25} aria-hidden />
            <span className="sx-action-label">{isArabic ? 'إعادة المحاولة' : 'Retry'}</span>
          </button>
        </div>
      ) : loadingNotifications ? (
        <div className="sx-notif-state sx-notif-state--loading" role="status" aria-live="polite">
          <div className="sx-notif-state__ring">
            <Loader2 className="sx-notif-lucide sx-notif-lucide--gold animate-spin" aria-hidden />
          </div>
          <p className="sx-notif-state__title">{isArabic ? 'جاري تحميل الإشعارات…' : 'Loading notifications…'}</p>
          <p className="sx-notif-muted">{isArabic ? 'يرجى الانتظار' : 'Please wait'}</p>
        </div>
      ) : filteredNotifs.length === 0 ? (
        <div className="sx-notif-empty" role="status">
          <div className="sx-notif-empty__icon-wrap">
            <Bell className="sx-notif-lucide sx-notif-lucide--gold" aria-hidden />
          </div>
          <p className="sx-notif-empty__title">
            {emptyStateForFilter(categoryFilter, isArabic).title}
          </p>
          <p className="sx-notif-muted">
            {emptyStateForFilter(categoryFilter, isArabic).hint}
          </p>
        </div>
      ) : (
        <div className="sx-notif-list">
          {(['today', 'yesterday', 'older'] as const).map((groupKey) =>
            groupedListItems[groupKey].length > 0 ? (
              <div key={groupKey} className="sx-notif-group">
                <h3 className="sx-notif-group-label">
                  {isArabic ? TIME_GROUP_LABELS[groupKey].ar : TIME_GROUP_LABELS[groupKey].en}
                </h3>
                {groupedListItems[groupKey].map(renderListItem)}
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
          <div className={`sx-notif-detail-view__icon ${resolveTypeIconClass(selectedNotification)}`}>
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
              <span>{formatNotificationTime(selectedNotification.createdAt, isArabic)}</span>
            </div>
          </div>
          {hasRoute && (
            <button
              type="button"
              onClick={() => handleNotificationAction(selectedNotification)}
              className="sx-action-btn sx-action-btn-primary sx-action-btn--block sx-notif-detail-view__action"
            >
              <span className="sx-action-label">{isArabic ? 'عرض' : 'View'}</span>
              <ArrowLeft className="sx-action-icon" strokeWidth={2.25} aria-hidden />
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderPreferencesView = () => (
    <div className="sx-notif-prefs">
      <p className="sx-notif-prefs__intro">
        {isArabic
          ? 'تحكم في ظهور وصوت الإشعارات. تنبيهات الأمان الحرجة تبقى ظاهرة دائماً.'
          : 'Control which notifications appear and play sound. Critical security alerts always remain visible.'}
      </p>
      <div className="sx-notif-prefs__list">
        {PREFERENCE_TOGGLES.map((toggle) => {
          const enabled = mergeNotificationPreferences(notifPreferences)[toggle.key];
          return (
            <button
              key={toggle.key}
              type="button"
              className={`sx-notif-prefs__row${enabled ? '' : ' sx-notif-prefs__row--off'}`}
              onClick={() => void handleTogglePreference(toggle.key)}
              disabled={prefsSaving}
              aria-pressed={enabled}
              aria-label={isArabic ? toggle.labelAr : toggle.labelEn}
            >
              <span className="sx-notif-prefs__label">
                {isArabic ? toggle.labelAr : toggle.labelEn}
                {toggle.criticalNote && (
                  <span className="sx-notif-prefs__note">
                    {isArabic ? ' (الحرجة تبقى)' : ' (critical kept)'}
                  </span>
                )}
              </span>
              <span className={`sx-notif-prefs__switch${enabled ? ' is-on' : ''}`} aria-hidden />
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="sx-action-btn sx-action-btn-secondary sx-action-btn--block sx-notif-prefs__advanced"
        onClick={() => setMainView('settings')}
      >
        <Settings className="sx-action-icon" strokeWidth={2.25} aria-hidden />
        <span className="sx-action-label">
          {isArabic ? 'إعدادات متقدمة (صوت ودفع)' : 'Advanced settings (sound & push)'}
        </span>
      </button>
    </div>
  );

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
              <button type="button" onClick={triggerTestSound} className="sx-action-btn sx-action-btn-secondary">
                <span className="sx-action-label">{isArabic ? 'استمع' : 'Play'}</span>
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
                className="sx-action-btn sx-action-btn-primary sx-action-btn--block"
              >
                <Bell className="sx-action-icon" strokeWidth={2.25} aria-hidden />
                <span className="sx-action-label">
                {registeringDevice
                  ? isArabic ? 'جاري التسجيل…' : 'Registering…'
                  : isArabic ? 'تسجيل هذا الجهاز' : 'Register this device'}
                </span>
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
                className="sx-action-btn sx-action-btn-ghost sx-action-btn--block"
              >
                <RefreshCw className="sx-action-icon" strokeWidth={2.25} aria-hidden />
                <span className="sx-action-label">
                {testPushPending
                  ? isArabic ? 'جاري الإرسال…' : 'Sending…'
                  : testPushSent
                    ? isArabic ? 'تم الإرسال' : 'Sent'
                    : isArabic ? 'إرسال push تجريبي' : 'Send test push'}
                </span>
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
            className="sx-action-btn sx-action-btn-ghost sx-action-btn--block"
            style={{ marginTop: 12 }}
          >
            <RefreshCw className="sx-action-icon" strokeWidth={2.25} aria-hidden />
            <span className="sx-action-label">
            {runningTokenDiag
              ? isArabic ? 'جاري الفحص…' : 'Running…'
              : isArabic ? 'فحص التوكن' : 'Run token check'}
            </span>
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
              className="sx-action-btn sx-action-btn-ghost sx-action-btn--block"
              style={{ marginTop: 12 }}
            >
              <ClipboardCheck className="sx-action-icon" strokeWidth={2.25} aria-hidden />
              <span className="sx-action-label">{isArabic ? 'فتح السجل' : 'Open logs'}</span>
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
          className="sx-action-btn sx-action-btn-icon"
          aria-label={isArabic ? 'تحديث' : 'Refresh'}
        >
          <RefreshCw className="sx-action-icon" strokeWidth={2.25} aria-hidden />
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
        <div className="sx-notif-grab" aria-hidden />
        <div className="sx-notif-panel">
          {/* Header */}
          {mainView === 'list' ? (
            <PremiumSectionHeader
              sticky
              className="sx-section-header--multi-actions"
              icon={BellRing}
              iconTone="gold"
              title={isArabic ? 'مركز الإشعارات' : 'Notification center'}
              subtitle={
                isArabic
                  ? 'تابع التنبيهات والرسائل المهمة في مكان واحد'
                  : 'Track important alerts and messages in one place'
              }
              actions={
                <>
                  <SectionHeaderButton
                    onClick={handleRefreshList}
                    ariaLabel={isArabic ? 'تحديث' : 'Refresh'}
                  >
                    <RefreshCw size={20} strokeWidth={2.25} aria-hidden />
                  </SectionHeaderButton>
                  <SectionHeaderButton
                    onClick={() => setMainView('preferences')}
                    ariaLabel={isArabic ? 'تفضيلات الإشعارات' : 'Notification preferences'}
                  >
                    <Settings size={20} strokeWidth={2.25} aria-hidden />
                  </SectionHeaderButton>
                  <SectionHeaderButton onClick={onClose} ariaLabel={isArabic ? 'إغلاق' : 'Close'}>
                    <X size={20} strokeWidth={2.25} aria-hidden />
                  </SectionHeaderButton>
                </>
              }
            />
          ) : (
          <header className="sx-notif-header">
            <div className="sx-notif-header__row">
              <div className="sx-notif-header__title-wrap">
                {mainView !== 'list' && (
                  <button
                    type="button"
                    className="sx-action-btn sx-action-btn-icon"
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
                    <ArrowLeft className="sx-action-icon" strokeWidth={2.25} aria-hidden />
                  </button>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h2 className="sx-notif-header__title">
                      {mainView === 'detail'
                        ? isArabic ? 'تفاصيل الإشعار' : 'Notification details'
                        : mainView === 'settings'
                          ? isArabic ? 'الإعدادات' : 'Settings'
                          : mainView === 'preferences'
                            ? isArabic ? 'تفضيلات الإشعارات' : 'Notification preferences'
                          : mainView === 'logs'
                            ? isArabic ? 'سجل الإرسال' : 'Delivery logs'
                            : isArabic ? 'الإشعارات' : 'Notifications'}
                    </h2>
                  </div>
                </div>
              </div>
              <div className="sx-notif-header__actions sx-notif-header-actions">
                <button
                  type="button"
                  onClick={onClose}
                  className="sx-action-btn sx-action-btn-icon"
                  aria-label={isArabic ? 'إغلاق' : 'Close'}
                >
                  <X className="sx-action-icon" strokeWidth={2.25} aria-hidden />
                </button>
              </div>
            </div>
          </header>
          )}

          {/* Category tabs — list view only */}
          {mainView === 'list' && (
            <div className="sx-notif-tabs-wrap">
              <div
                className="sx-notif-tabs sx-notif-tabs--chips"
                role="tablist"
                aria-label={isArabic ? 'فلاتر الإشعارات' : 'Notification filters'}
              >
                {NOTIF_FILTER_TABS.map((tab) => {
                  const count = filterCounts[tab.id];
                  const showBadge = tab.id !== 'all' && count > 0;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={categoryFilter === tab.id}
                      className={`sx-notif-tab sx-notif-filter-chip ${categoryFilter === tab.id ? 'sx-notif-tab--active' : ''}`}
                      onClick={() => setCategoryFilter(tab.id)}
                    >
                      <span className="sx-notif-tab-label">
                        {isArabic ? tab.labelAr : tab.labelEn}
                      </span>
                      {showBadge && (
                        <span className="sx-notif-filter-chip__badge" aria-hidden>
                          {count > 99 ? '99+' : count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Body */}
          <main className="sx-notif-body">
            {mainView === 'list' && renderListView()}
            {mainView === 'detail' && renderDetailView()}
            {mainView === 'preferences' && renderPreferencesView()}
            {mainView === 'settings' && renderSettingsView()}
            {mainView === 'logs' && renderLogsView()}
          </main>

          {/* Footer — list view */}
          {mainView === 'list' && (
            <footer className="sx-notif-footer">
              <div className="sx-notif-footer-actions">
                <button
                  type="button"
                  className="sx-notif-footer-btn sx-notif-footer-btn--ghost"
                  onClick={handleRefreshList}
                  aria-label={isArabic ? 'تحديث' : 'Refresh'}
                >
                  <RefreshCw className="sx-action-icon" strokeWidth={2.4} aria-hidden />
                  <span className="sx-action-label">{isArabic ? 'تحديث' : 'Refresh'}</span>
                </button>
                <button
                  type="button"
                  className="sx-notif-footer-btn sx-notif-footer-btn--primary"
                  onClick={handleMarkAllRead}
                  disabled={unreadCount === 0}
                  aria-label={isArabic ? 'تحديد الكل كمقروء' : 'Mark all read'}
                >
                  <Check className="sx-action-icon" strokeWidth={2.4} aria-hidden />
                  <span className="sx-action-label">{isArabic ? 'تحديد الكل' : 'Mark all'}</span>
                </button>
                <button
                  type="button"
                  className="sx-notif-footer-btn sx-notif-footer-btn--ghost"
                  onClick={handleDeleteAll}
                  disabled={
                    notifications.filter((n) =>
                      n.read &&
                      canManuallyDeleteNotification(
                        n,
                        normalizeDashboardRole(userRole, profile?.role),
                      ),
                    ).length === 0
                  }
                  aria-label={isArabic ? 'حذف الكل المقروء' : 'Delete all read'}
                >
                  <Trash2 className="sx-action-icon" strokeWidth={2.4} aria-hidden />
                  <span className="sx-action-label">
                    {isArabic ? 'حذف المقروء' : 'Delete read'}
                  </span>
                </button>
                <button
                  type="button"
                  className="sx-notif-footer-btn sx-notif-footer-btn--secondary"
                  onClick={onClose}
                  aria-label={isArabic ? 'إغلاق' : 'Close'}
                >
                  <X className="sx-action-icon" strokeWidth={2.4} aria-hidden />
                  <span className="sx-action-label">{isArabic ? 'إغلاق' : 'Close'}</span>
                </button>
              </div>
            </footer>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};
