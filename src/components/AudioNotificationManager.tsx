import React, { useEffect, useRef } from "react";
import { db } from "../lib/firebase";
import { collection, query, where, onSnapshot, limit, orderBy } from "firebase/firestore";
import { useAuth } from "../lib/AuthContext";
import { getNotificationInboxUserIdsFromProfile } from "../lib/notificationTargets";
import {
  playPremiumNotificationSound,
  playGradeNotificationSound,
  playReportNotificationSound,
  playMarketplaceNotificationSound,
  playSubscriptionNotificationSound,
} from "../lib/notificationSound";

export const AudioNotificationManager: React.FC = () => {
  const { user, profile } = useAuth();
  
  // Refs to avoid playing historical notifications on initial snapshot load
  const isNotificationsInitialLoad = useRef(true);
  const isMessagesInitialLoad = useRef(true);
  const isSuperRegistrationsInitialLoad = useRef(true);
  const isSuperOrdersInitialLoad = useRef(true);
  const isSuperSubRequestsInitialLoad = useRef(true);

  // Initialize browser permissions for desk notifications
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  // Helper trigger for HTML5 background native notification
  const triggerNativeNotification = (title: string, body: string, tag?: string) => {
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      try {
        const notif = new Notification(title, {
          body,
          icon: "/icon.svg",
          tag,
          requireInteraction: false,
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch (err) {
        console.warn("Could not dispatch native Notification:", err);
      }
    }
  };

  useEffect(() => {
    if (!user || !profile) return;

    const unsubs: (() => void)[] = [];

    // --- 1. System/In-App Notifications Listener ---
    // Listen to standard notification documents for the user
    const handleNotificationsSnapshot = (snap: any, isSuper: boolean) => {
      if (isNotificationsInitialLoad.current) {
        isNotificationsInitialLoad.current = false;
        return;
      }

      snap.docChanges().forEach((change: any) => {
        if (change.type === "added") {
          const data = change.doc.data();
          // Filter only unread or newly received ones
          if (data.read === true) return;

          const title = data.title || (profile.language === "ar" ? "إشعار جديد" : "New Notification");
          const msg = data.message || "";
          const type = data.type || "system";

          // Play matching audio profile based on specific category
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

          // Trigger OS native notification banners in background
          triggerNativeNotification(title, msg, change.doc.id);
        }
      });
    };

    const inboxIds = getNotificationInboxUserIdsFromProfile(profile);
    inboxIds.forEach((inboxUserId) => {
      const notificationsQ = query(
        collection(db, "notifications"),
        where("userId", "==", inboxUserId),
        limit(30),
      );
      const isSuperChannel = inboxUserId === "super_admin";
      unsubs.push(
        onSnapshot(
          notificationsQ,
          (snap) => handleNotificationsSnapshot(snap, isSuperChannel),
          (err) => console.log("AudioNotificationManager Error:", err),
        ),
      );
    });

    if (profile.role === "superadmin") {
      // --- 1B. Super Admin direct Registration Requests Listener ---
      const registrationsQ = query(
        collection(db, "registrations"),
        where("status", "==", "pending")
      );
      const unsubReg = onSnapshot(
        registrationsQ,
        (snap) => {
          if (isSuperRegistrationsInitialLoad.current) {
            isSuperRegistrationsInitialLoad.current = false;
            return;
          }
          snap.docChanges().forEach((change: any) => {
            if (change.type === "added") {
              const reg = change.doc.data();
              const schoolName = reg.schoolName || reg.name || "مدرسة جديدة";
              
              const title = profile.language === "ar" ? "طلب تسجيل مدرسة جديد" : "New School Registration Request";
              const body = profile.language === "ar" 
                ? `المدرسة: ${schoolName} - يرجى مراجعة النظام لتفعيل الحساب.`
                : `School: ${schoolName} - Please review the dashboard to approve.`;
              
              playSubscriptionNotificationSound();
              triggerNativeNotification(title, body, change.doc.id);
            }
          });
        },
        (err) => console.log("Reg listener error in audio manager:", err)
      );
      unsubs.push(unsubReg);

      // --- 1C. Super Admin direct Order/License Renewal Requests Listener ---
      const ordersQ = query(
        collection(db, "orders"),
        where("status", "==", "pending")
      );
      const unsubOrders = onSnapshot(
        ordersQ,
        (snap) => {
          if (isSuperOrdersInitialLoad.current) {
            isSuperOrdersInitialLoad.current = false;
            return;
          }
          snap.docChanges().forEach((change: any) => {
            if (change.type === "added") {
              const order = change.doc.data();
              const customerName = order.customerInfo?.name || order.schoolName || "مدرسة";
              const packageName = order.packageName || "باقة غير معروفة";

              const title = profile.language === "ar" ? "طلب تفعيل اشتراك/تجديد" : "New Subscription / Renewal Order";
              const body = profile.language === "ar"
                ? `العميل: ${customerName} - الباقة: ${packageName}`
                : `Client: ${customerName} - Package: ${packageName}`;

              playSubscriptionNotificationSound();
              triggerNativeNotification(title, body, change.doc.id);
            }
          });
        },
        (err) => console.log("Orders listener error in audio manager:", err)
      );
      unsubs.push(unsubOrders);

      // --- 1D. Super Admin subscriptionRequests Listener ---
      const subscriptionRequestsQ = query(
        collection(db, "subscriptionRequests"),
        where("status", "==", "pending")
      );
      const unsubSubRequests = onSnapshot(
        subscriptionRequestsQ,
        (snap) => {
          if (isSuperSubRequestsInitialLoad.current) {
            isSuperSubRequestsInitialLoad.current = false;
            return;
          }
          snap.docChanges().forEach((change: any) => {
            if (change.type === "added") {
              const req = change.doc.data();
              const schoolName = req.schoolName || req.name || "مدرسة جديدة";
              const title = profile.language === "ar" ? "طلب اشتراك مدرسي جديد" : "New School Subscription Request";
              const body = profile.language === "ar"
                ? `المدرسة: ${schoolName} - يرجى مراجعة طلب الاشتراك وتفعيل الحساب.`
                : `School: ${schoolName} - Please process the subscription request.`;

              playSubscriptionNotificationSound();
              triggerNativeNotification(title, body, change.doc.id);
            }
          });
        },
        (err) => console.log("SubRequests listener error in audio manager:", err)
      );
      unsubs.push(unsubSubRequests);
    }

    // --- 2. Direct Messages (system_messages) Listener ---
    // Find unread messages where this user is the receiver
    const messagesQ = query(
      collection(db, "system_messages"),
      where("receiverId", "==", user.uid)
    );
    const unsubMessages = onSnapshot(
      messagesQ,
      (snap) => {
        if (isMessagesInitialLoad.current) {
          isMessagesInitialLoad.current = false;
          return;
        }

        snap.docChanges().forEach((change: any) => {
          if (change.type === "added") {
            const data = change.doc.data();
            // Ensure message is unread and not from current user
            if (data.read === true || data.senderId === user.uid) return;

            const senderName = data.senderName || (profile.language === "ar" ? "مستخدم" : "User");
            const senderRoleText = 
              data.senderRole === "parent" ? (profile.language === "ar" ? "ولي أمر" : "Parent") :
              data.senderRole === "teacher" ? (profile.language === "ar" ? "معلم" : "Teacher") :
              profile.language === "ar" ? "إشعار" : "Notice";

            const title = profile.language === "ar" 
              ? `رسالة جديدة من ${senderName} (${senderRoleText})` 
              : `New message from ${senderName} (${senderRoleText})`;
              
            const body = data.content || "";

            // Play elegant chat chime bubble
            playPremiumNotificationSound();

            // Trigger OS native notification banners
            triggerNativeNotification(title, body, change.doc.id);
          }
        });
      },
      (err) => console.log("Messages audio manager error:", err)
    );
    unsubs.push(unsubMessages);

    // --- Cleanup all listeners on unmount or user change ---
    return () => {
      unsubs.forEach((unsub) => unsub());
      // Reset ref states
      isNotificationsInitialLoad.current = true;
      isMessagesInitialLoad.current = true;
      isSuperRegistrationsInitialLoad.current = true;
      isSuperOrdersInitialLoad.current = true;
    };
  }, [user, profile]);

  return null; // Side-effect executor only, no render payload
};
