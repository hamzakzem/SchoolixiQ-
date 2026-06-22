import React, { useEffect } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  type DocumentData,
  type QuerySnapshot,
} from "firebase/firestore";
import { useAuth } from "../lib/AuthContext";
import { SCHOOLIXIQ_LOGO_SRC } from '../lib/brandAssets';
import {
  playPremiumNotificationSound,
  playGradeNotificationSound,
  playReportNotificationSound,
  playMarketplaceNotificationSound,
  playSubscriptionNotificationSound,
} from "../lib/notificationSound";
import { isNotificationVisibleToUser } from "../lib/notificationVisibility";
import {
  ensureNotificationSession,
  resetNotificationSession,
  hydrateListenerSnapshot,
  evaluateNotificationAudioTrigger,
  beginListenerSubscription,
  isListenerHydrated,
} from "../lib/notificationSessionGuard";

export const AudioNotificationManager: React.FC = () => {
  const { user, profile } = useAuth();

  const triggerNativeNotification = (title: string, body: string, type: string, tag?: string) => {
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      try {
        const notif = new Notification(title, {
          body,
          icon: SCHOOLIXIQ_LOGO_SRC,
          tag,
          requireInteraction: false,
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
          if (type) {
            localStorage.setItem('schoolix_pending_tab_redirect', type);
            window.dispatchEvent(new CustomEvent('schoolix_tab_redirect', { detail: { type } }));
          }
        };
      } catch (err) {
        console.warn("Could not dispatch native Notification:", err);
      }
    }
  };

  const playNotificationSound = (type: string, isSuper = false) => {
    if (type === "grade" || type === "grades") {
      playGradeNotificationSound();
    } else if (type === "report" || type === "advanced_report" || type === "evaluation") {
      playReportNotificationSound();
    } else if (type === "payment" || type === "marketplace" || type === "order") {
      playMarketplaceNotificationSound();
    } else if (type === "system" && isSuper) {
      playSubscriptionNotificationSound();
    } else {
      playPremiumNotificationSound();
    }
  };

  useEffect(() => {
    if (!user?.uid || !profile) {
      resetNotificationSession();
      return;
    }

    ensureNotificationSession(user.uid);
    const unsubs: (() => void)[] = [];

    const processSnapshot = (
      snap: QuerySnapshot<DocumentData>,
      listenerKey: string,
      onNewDoc: (id: string, data: DocumentData) => void,
      filterDoc?: (id: string, data: DocumentData) => boolean,
    ) => {
      if (!isListenerHydrated(listenerKey)) {
        const docIds = snap.docs.map((d) => d.id);
        hydrateListenerSnapshot(listenerKey, docIds, {
          markHydrated: !snap.metadata.fromCache || docIds.length > 0,
        });
        return;
      }

      snap.docChanges().forEach((change) => {
        if (change.type !== "added") return;
        const data = change.doc.data();
        if (filterDoc && !filterDoc(change.doc.id, data)) return;

        const decision = evaluateNotificationAudioTrigger(change.doc.id, data, listenerKey);
        if (decision.action !== "trigger") return;
        onNewDoc(change.doc.id, data);
      });
    };

    const subscribeNotifications = (
      firestoreQuery: ReturnType<typeof query>,
      listenerKey: string,
      onNewDoc: (id: string, data: DocumentData) => void,
      filterDoc?: (id: string, data: DocumentData) => boolean,
      onError?: (err: unknown) => void,
    ) => {
      beginListenerSubscription(listenerKey);
      return onSnapshot(
        firestoreQuery,
        (snap) => processSnapshot(snap, listenerKey, onNewDoc, filterDoc),
        onError,
      );
    };

    const unsubNotif = subscribeNotifications(
      query(collection(db, "notifications"), where("userId", "==", user.uid)),
      `notifications:user:${user.uid}`,
      (_id, data) => {
          const type = (data.type as string) || "system";
          const title = (data.title as string) || (profile.language === "ar" ? "إشعار جديد" : "New Notification");
          const msg = (data.message as string) || "";
          playNotificationSound(type, false);
          triggerNativeNotification(title, msg, type, _id);
        },
      (_id, data) =>
          isNotificationVisibleToUser(
            { id: _id, ...data },
            { uid: user.uid, role: profile.role, schoolId: profile.schoolId },
          ) && data.read !== true,
      (err) => console.log("AudioNotificationManager Error:", err),
    );
    unsubs.push(unsubNotif);

    if (profile.role === "superadmin") {
      unsubs.push(
        subscribeNotifications(
          query(collection(db, "notifications"), where("userId", "==", "super_admin")),
          "notifications:super_admin",
          (_id, data) => {
              if (
                !isNotificationVisibleToUser(
                  { id: _id, ...data },
                  { uid: user.uid, role: profile.role, schoolId: profile.schoolId },
                )
              ) {
                return;
              }
              const type = (data.type as string) || "system";
              const title = (data.title as string) || (profile.language === "ar" ? "إشعار جديد" : "New Notification");
              const msg = (data.message as string) || "";
              playNotificationSound(type, true);
              triggerNativeNotification(title, msg, type, _id);
            },
          (_id, data) =>
              isNotificationVisibleToUser(
                { id: _id, ...data },
                { uid: user.uid, role: profile.role, schoolId: profile.schoolId },
              ) && data.read !== true,
          (err) => console.log("AudioNotificationManager Super Error:", err),
        ),
      );

      unsubs.push(
        subscribeNotifications(
          query(collection(db, "registrations"), where("status", "==", "pending")),
          "registrations:pending",
          (_id, reg) => {
              const schoolName = (reg.schoolName as string) || (reg.name as string) || "مدرسة جديدة";
              const title = profile.language === "ar" ? "طلب تسجيل مدرسة جديد" : "New School Registration Request";
              const body = profile.language === "ar"
                ? `المدرسة: ${schoolName} - يرجى مراجعة النظام لتفعيل الحساب.`
                : `School: ${schoolName} - Please review the dashboard to approve.`;
              playSubscriptionNotificationSound();
              triggerNativeNotification(title, body, "system", _id);
            },
          undefined,
          (err) => console.log("Reg listener error in audio manager:", err),
        ),
      );

      unsubs.push(
        subscribeNotifications(
          query(collection(db, "orders"), where("status", "==", "pending")),
          "orders:pending",
          (_id, order) => {
              const customerInfo = order.customerInfo as { name?: string } | undefined;
              const customerName = customerInfo?.name || (order.schoolName as string) || "مدرسة";
              const packageName = (order.packageName as string) || "باقة غير معروفة";
              const title = profile.language === "ar" ? "طلب تفعيل اشتراك/تجديد" : "New Subscription / Renewal Order";
              const body = profile.language === "ar"
                ? `العميل: ${customerName} - الباقة: ${packageName}`
                : `Client: ${customerName} - Package: ${packageName}`;
              playSubscriptionNotificationSound();
              triggerNativeNotification(title, body, "tuition", _id);
            },
          undefined,
          (err) => console.log("Orders listener error in audio manager:", err),
        ),
      );

      unsubs.push(
        subscribeNotifications(
          query(collection(db, "subscriptionRequests"), where("status", "==", "pending")),
          "subscriptionRequests:pending",
          (_id, req) => {
              const schoolName = (req.schoolName as string) || (req.name as string) || "مدرسة جديدة";
              const title = profile.language === "ar" ? "طلب اشتراك مدرسي جديد" : "New School Subscription Request";
              const body = profile.language === "ar"
                ? `المدرسة: ${schoolName} - يرجى مراجعة طلب الاشتراك وتفعيل الحساب.`
                : `School: ${schoolName} - Please process the subscription request.`;
              playSubscriptionNotificationSound();
              triggerNativeNotification(title, body, "system", _id);
            },
          undefined,
          (err) => console.log("SubRequests listener error in audio manager:", err),
        ),
      );
    }

    unsubs.push(
      subscribeNotifications(
        query(collection(db, "system_messages"), where("receiverId", "==", user.uid)),
        `messages:${user.uid}`,
        (_id, data) => {
              const senderName = (data.senderName as string) || (profile.language === "ar" ? "مستخدم" : "User");
              const senderRole = data.senderRole as string | undefined;
              const senderRoleText =
                senderRole === "parent" ? (profile.language === "ar" ? "ولي أمر" : "Parent") :
                senderRole === "teacher" ? (profile.language === "ar" ? "معلم" : "Teacher") :
                profile.language === "ar" ? "إشعار" : "Notice";
              const title = profile.language === "ar"
                ? `رسالة جديدة من ${senderName} (${senderRoleText})`
                : `New message from ${senderName} (${senderRoleText})`;
              const body = (data.content as string) || "";
              playPremiumNotificationSound();
              triggerNativeNotification(title, body, "message", _id);
            },
        (_id, data) => data.read !== true && data.senderId !== user.uid,
        (err) => console.log("Messages audio manager error:", err),
      ),
    );

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [user?.uid, profile?.role, profile?.schoolId, profile?.language]);

  return null;
};
