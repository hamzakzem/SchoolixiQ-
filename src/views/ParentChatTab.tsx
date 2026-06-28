import React, { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "../lib/AuthContext";
import { db, storage } from "../lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  orderBy,
  setDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useLanguage } from "../lib/LanguageContext";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";
import { getTeacherSubjectDisplay } from "../lib/userProfile";
import { notificationService } from "../lib/notificationService";
import { useSystemConfig } from "../lib/SystemConfigContext";
import {
  Building2,
  Phone,
  User,
  GraduationCap,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { SchoolixChatShell, type ChatShellContact } from "../components/chat/SchoolixChatShell";
import { ChatAvatarFrame, DefaultContactAvatar, RoleBadge } from "../components/chat/chatAvatars";
import { useChatBack } from "../hooks/useChatBack";
import { enterChatMode, leaveChatMode } from "../lib/chatFreezeGuard";
import { withMessageRetentionFields } from "../lib/dataRetention";
import { markSystemMessagesRead } from "../lib/chatMessageReads";
import { markChatPerf, openChatSnapshotListener, resetChatPerf } from "../lib/chatPerf";
import {
  applyThreadMessagesIfChanged,
  buildThreadMessagesQuery,
  shouldMarkThreadUnread,
  unreadIdsForReceiver,
} from "../lib/chatThreadMessages";

export default function ParentChatTab() {
  const { profile } = useAuth();
  const { isRtl, t } = useLanguage();
  const { config } = useSystemConfig();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [activeContact, setActiveContact] = useState<{
    id: string;
    name: string;
    type: "admin" | "teacher";
    subtitle?: string;
  } | null>(null);
  
  const [schoolContacts, setSchoolContacts] = useState<any[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [lastInteractionTimes, setLastInteractionTimes] = useState<Record<string, number>>({});
  const [lastMessageSnippets, setLastMessageSnippets] = useState<Record<string, string>>({});
  const [contactsLoaded, setContactsLoaded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);

  const prevMessagesLength = useRef<number>(0);
  const isFirstLoad = useRef<boolean>(true);
  const didAutoSelectRef = useRef(false);
  const messagesSigRef = useRef("");
  const unreadKeyRef = useRef("");
  const messagesFirstSnapshotRef = useRef(false);

  useEffect(() => {
    resetChatPerf("ParentChatTab");
    enterChatMode("ParentChatTab");
    console.info("[ChatFreeze] LISTENER_SETUP", { tab: "ParentChatTab" });
    return () => {
      console.info("[ChatFreeze] LISTENER_CLEANUP", { tab: "ParentChatTab" });
      leaveChatMode("ParentChatTab");
      messagesSigRef.current = "";
      unreadKeyRef.current = "";
      messagesFirstSnapshotRef.current = false;
    };
  }, []);

  // Fetch school info for current parent
  useEffect(() => {
    if (profile?.schoolId) {
      getDoc(doc(db, 'schools', profile.schoolId)).then(snap => {
        if (snap.exists()) {
          setSchoolInfo({ id: snap.id, ...snap.data() as any });
        }
      });
    }
  }, [profile?.schoolId]);

  // Fetch children of the parent to present student photographs and ties as requested
  useEffect(() => {
    if (profile?.uid) {
      const qStudents = query(
        collection(db, 'students'),
        where('parentIds', 'array-contains', profile.uid)
      );
      const unsub = onSnapshot(qStudents, (snap) => {
        setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() as any })));
      });
      const untrackStudents = openChatSnapshotListener("ParentChatTab:students");
      return () => {
        unsub();
        untrackStudents();
      };
    }
  }, [profile?.uid]);

  useEffect(() => {
    if (!profile?.schoolId) return;

    // Fetch teachers for this school who the parent might chat with
    const q = query(
      collection(db, "users"),
      where("schoolId", "==", profile.schoolId),
      where("role", "in", ["teacher", "admin", "staff"]),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const contacts = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));

      const adminContact = {
        id: "admin",
        name: isRtl ? "إدارة المدرسة" : "School Administration",
        type: "admin" as const,
        subtitle: isRtl ? "الدعم المدرسي والشكاوى" : "Direct Administration Support",
      };

      const teachers = contacts
        .filter((c) => c.role === "teacher")
        .map((t) => ({
          ...t,
          id: t.id,
          name: t.name || t.email,
          type: "teacher" as const,
          subtitle:
            getTeacherSubjectDisplay(t) ||
            (isRtl ? "معلم الفصل" : "Class Teacher"),
        }));

      // Combine admin at the top, then teachers
      setSchoolContacts([adminContact, ...teachers]);
      setContactsLoaded(true);
      markChatPerf("contacts_loaded", "ParentChatTab", { contacts: teachers.length + 1 });
      if (!didAutoSelectRef.current) {
        didAutoSelectRef.current = true;
        setActiveContact(adminContact);
      }
    });
    const untrackContacts = openChatSnapshotListener("ParentChatTab:contacts");

    // Fetch unread messages meant for this parent
    const qUnread = query(
      collection(db, "system_messages"),
      where("schoolId", "==", profile.schoolId),
      where("receiverId", "==", profile?.uid || ""),
      where("read", "==", false),
    );
    const unsubUnread = onSnapshot(qUnread, (snapshot) => {
      const counts: Record<string, number> = {};
      
      snapshot.docs.forEach((doc) => {
        const msg = doc.data() as any;
        const senderIdStr =
          msg.senderRole === "admin" || msg.senderId === "admin"
            ? "admin"
            : msg.senderId;
        counts[senderIdStr] = (counts[senderIdStr] || 0) + 1;
      });
      setUnreadCounts(counts);
    });
    const untrackUnread = openChatSnapshotListener("ParentChatTab:unread");

    const qConversations = query(
      collection(db, "conversations"),
      where("schoolId", "==", profile.schoolId),
      where("participants", "array-contains", profile?.uid || ""),
      orderBy("updatedAt", "desc")
    );
    
    const unsubConversations = onSnapshot(qConversations, (snapshot) => {
      setLastInteractionTimes(prev => {
        const next = { ...prev };
        let changed = false;
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.updatedAt) {
            const time = data.updatedAt.toMillis();
            const otherIds = data.participants.filter((p: string) => p !== profile?.uid);
            otherIds.forEach((otherId: string) => {
              const key = otherId === 'admin' ? 'admin' : otherId;
              if (next[key] !== time) {
                next[key] = time;
                changed = true;
              }
            });
          }
        });
        return changed ? next : prev;
      });
      setLastMessageSnippets(prev => {
        const next = { ...prev };
        let changed = false;
        snapshot.docs.forEach(docSnap => {
          const data = docSnap.data();
          if (!data.lastMessage) return;
          const otherIds = data.participants.filter((p: string) => p !== profile?.uid);
          otherIds.forEach((otherId: string) => {
            const key = otherId === 'admin' ? 'admin' : otherId;
            if (next[key] !== data.lastMessage) {
              next[key] = data.lastMessage;
              changed = true;
            }
          });
        });
        return changed ? next : prev;
      });
    }, (err) => {
      console.warn("Conversations listener error:", err);
    });
    const untrackConversations = openChatSnapshotListener("ParentChatTab:conversations");

    return () => {
      unsubscribe();
      unsubUnread();
      unsubConversations();
      untrackContacts();
      untrackUnread();
      untrackConversations();
    };
  }, [profile?.schoolId, profile?.uid, isRtl]);

  useEffect(() => {
    if (!profile?.uid || !profile?.schoolId || !activeContact) return;

    messagesSigRef.current = "";
    unreadKeyRef.current = "";
    messagesFirstSnapshotRef.current = false;

    let convId = "";
    if (activeContact.type === "admin") {
      convId = `${profile.schoolId}_${profile.uid}`;
    } else {
      convId = [profile.uid, activeContact.id].sort().join("_");
    }

    const q = buildThreadMessagesQuery(profile.schoolId, convId);
    const untrackMessages = openChatSnapshotListener("ParentChatTab:messages");

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as any),
        }));

        const sorted = applyThreadMessagesIfChanged(docs, messagesSigRef, setMessages);

        if (!messagesFirstSnapshotRef.current) {
          messagesFirstSnapshotRef.current = true;
          markChatPerf("messages_first_snapshot", "ParentChatTab", {
            conversationId: convId,
            count: sorted.length,
          });
        }

        if (sorted.length > 0) {
          const lastMsg = sorted[sorted.length - 1];
          const msgTime = lastMsg.createdAt?.toMillis() || Date.now();
          const contactId = activeContact.id;
          setLastInteractionTimes(prev => {
            if (msgTime > (prev[contactId] || 0)) {
              return { ...prev, [contactId]: msgTime };
            }
            return prev;
          });
        }

        prevMessagesLength.current = sorted.length;
        isFirstLoad.current = false;

        const unreadIds = unreadIdsForReceiver(sorted, [profile.uid]);
        if (shouldMarkThreadUnread(unreadIds, unreadKeyRef)) {
          markSystemMessagesRead(unreadIds, "ParentChatTab");
        }
      },
      (error) => {
        handleFirestoreError(
          error,
          OperationType.LIST,
          "ParentChatTab:system_messages",
        );
      },
    );

    return () => {
      unsubscribe();
      untrackMessages();
    };
  }, [profile?.uid, profile?.schoolId, activeContact?.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/webm'];
      if (!validTypes.includes(file.type)) {
        toast.error(isRtl ? 'صيغة الملف غير مدعومة' : 'Unsupported file type');
        return;
      }
      if (file.size > 50 * 1024 * 1024) { // 50MB
        toast.error(isRtl ? 'حجم الملف كبير جداً' : 'File is too large');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !profile?.uid || !activeContact) return;

    const messageText = newMessage.trim();
    setNewMessage("");
    setIsLoading(true);

    let convId = "";
    let receiverId = "";
    if (activeContact.type === "admin") {
      convId = `${profile.schoolId}_${profile.uid}`;
      receiverId = "admin";
    } else {
      convId = [profile.uid, activeContact.id].sort().join("_");
      receiverId = activeContact.id;
    }

    try {
      let fileUrl = null;
      let fileType = null;
      let fileName = null;

      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const path = `chat_files/${convId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, selectedFile);
        fileUrl = await getDownloadURL(storageRef);
        fileType = selectedFile.type.startsWith('video/') ? 'video' : 'image';
        fileName = selectedFile.name;
        setSelectedFile(null);
      }

      await addDoc(collection(db, "system_messages"), withMessageRetentionFields({
        conversationId: convId,
        schoolId: profile.schoolId,
        senderId: profile.uid,
        senderName: profile.name || "Parent",
        senderRole: "parent",
        receiverId,
        content: messageText || (isRtl ? 'ملف مرفق' : 'Attachment'),
        fileUrl,
        fileType,
        fileName,
        createdAt: serverTimestamp(),
        read: false,
      }));

      // Update conversation document for real-time sorting
      await setDoc(doc(db, "conversations", convId), {
        conversationId: convId,
        schoolId: profile.schoolId,
        participants: [profile.uid, receiverId],
        lastMessage: messageText || (isRtl ? 'ملف مرفق' : 'Attachment'),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // Notify the teacher or admin...
      if (activeContact.type === "teacher") {
        await notificationService.send({
          userId: receiverId,
          title: "رسالة جديدة من ولي الأمر",
          message:
            messageText.substring(0, 50) +
            (messageText.length > 50 ? "..." : ""),
          type: "system",
          schoolId: profile.schoolId,
          metadata: { senderId: profile.uid, conversationId: convId, routeTarget: 'chat' },
        });
      } else if (activeContact.type === "admin") {
        const { getDocs, query, collection, where } =
          await import("firebase/firestore");
        const q = query(
          collection(db, "users"),
          where("schoolId", "==", profile.schoolId),
          where("role", "in", ["admin", "assistant"]),
        );
        const adminSnaps = await getDocs(q);
        const adminIds = adminSnaps.docs.map((d) => d.id);
        if (adminIds.length > 0) {
          await notificationService.sendToMultiple(adminIds, {
            title: "رسالة جديدة من ولي أمر (الإدارة)",
            message:
              messageText.substring(0, 50) +
              (messageText.length > 50 ? "..." : ""),
            type: "system",
            schoolId: profile.schoolId,
            metadata: { senderId: profile.uid, conversationId: convId, routeTarget: 'chat' },
          });
        }
      }
      
      setLastInteractionTimes(prev => ({ ...prev, [receiverId]: Date.now() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "system_messages");
      toast.error(isRtl ? "فشل إرسال الرسالة" : "Failed to send message");
      setNewMessage(messageText);
    } finally {
      setIsLoading(false);
    }
  };

  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return "";
    if (typeof timestamp.toDate === "function") {
      const date = timestamp.toDate();
      return date.toLocaleTimeString(isRtl ? "ar-SA" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return "";
  };

  const groupedMessages = useMemo(() => messages.reduce(
    (acc, msg) => {
      let dateStr = isRtl ? "اليوم" : "Today";
      if (msg.createdAt && typeof msg.createdAt.toDate === "function") {
        const date = msg.createdAt.toDate();
        const today = new Date();
        const isToday =
          date.getDate() === today.getDate() &&
          date.getMonth() === today.getMonth() &&
          date.getFullYear() === today.getFullYear();
        if (!isToday) {
          dateStr = date.toLocaleDateString(isRtl ? "ar-SA" : "en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
          });
        }
      }
      if (!acc[dateStr]) acc[dateStr] = [];
      acc[dateStr].push(msg);
      return acc;
    },
    {} as Record<string, any[]>,
  ), [messages, isRtl]);

  const sortedContacts = [...schoolContacts].sort((a, b) => {
    const timeA = lastInteractionTimes[a.id] || 0;
    const timeB = lastInteractionTimes[b.id] || 0;
    if (timeA !== timeB) return timeB - timeA;
    return (a.name || "").localeCompare(b.name || "");
  });

  const filteredContacts = sortedContacts.filter(
    (c) =>
      !searchTerm.trim() ||
      (c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.subtitle && c.subtitle.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const shellContacts: ChatShellContact[] = filteredContacts.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    subtitle: c.subtitle,
    extra: c,
  }));

  const renderContactAvatar = (contact: ChatShellContact, isSelected: boolean, size: 'list' | 'header' | 'message' = 'list') => {
    if (contact.type === 'admin') {
      if (schoolInfo?.logoUrl) {
        return (
          <ChatAvatarFrame selected={isSelected} size={size}>
            <img src={schoolInfo.logoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </ChatAvatarFrame>
        );
      }
      if (config.appLogo) {
        return (
          <ChatAvatarFrame selected={isSelected} size={size}>
            <img src={config.appLogo} alt="" className="w-full h-full object-contain p-1" referrerPolicy="no-referrer" />
          </ChatAvatarFrame>
        );
      }
      return <DefaultContactAvatar contact={{ ...contact, type: 'admin' }} selected={isSelected} appLogo={config.appLogo} />;
    }
    return <DefaultContactAvatar contact={contact} selected={isSelected} />;
  };

  const activeShellContact: ChatShellContact | null = activeContact
    ? { id: activeContact.id, name: activeContact.name, type: activeContact.type, subtitle: activeContact.subtitle, extra: activeContact as any }
    : null;

  const headerStatus =
    activeContact?.type === 'admin'
      ? isRtl ? 'إدارة المدرسة' : 'School Administration'
      : activeContact?.type === 'teacher'
        ? isRtl ? 'المعلم الدراسي' : 'Class Teacher'
        : undefined;

  const handleChatBack = useChatBack({
    activeContact,
    mobileShowChat,
    setMobileShowChat,
    setActiveContact: () => setActiveContact(null),
  });

  return (
    <SchoolixChatShell
      isRtl={isRtl}
      listTitle={isRtl ? 'صندوق الرسائل' : 'Direct Channels'}
      searchPlaceholder={isRtl ? 'بحث في المحادثات...' : 'Search conversations...'}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      contacts={shellContacts}
      unreadCounts={unreadCounts}
      lastInteractionTimes={lastInteractionTimes}
      lastMessageSnippets={lastMessageSnippets}
      activeContact={activeShellContact}
      onSelectContact={(contact) => {
        setActiveContact({
          id: contact.id,
          name: contact.name,
          type: contact.type as 'admin' | 'teacher',
          subtitle: contact.subtitle,
        });
        setMobileShowChat(true);
      }}
      mobileShowChat={mobileShowChat}
      onChatBack={handleChatBack}
      groupedMessages={groupedMessages}
      isOutgoingMessage={(msg) => msg.senderId === profile?.uid}
      formatMessageTime={formatMessageTime}
      messagesEndRef={messagesEndRef}
      newMessage={newMessage}
      onNewMessageChange={setNewMessage}
      onSendMessage={handleSendMessage}
      isSending={isLoading}
      selectedFile={selectedFile}
      onClearFile={() => setSelectedFile(null)}
      onFileChange={handleFileChange}
      fileInputRef={fileInputRef}
      headerStatusText={headerStatus}
      isLoadingContacts={!contactsLoaded && !!profile?.schoolId}
      inputPlaceholder={isRtl ? 'اكتب رسالة...' : 'Type a message...'}
      renderListAvatar={(contact, isSelected) => renderContactAvatar(contact, isSelected, 'list')}
      renderHeaderAvatar={() =>
        activeShellContact ? renderContactAvatar(activeShellContact, true, 'header') : null
      }
      renderIncomingMessageAvatar={() => {
        if (!activeShellContact || activeShellContact.type !== 'admin' || !schoolInfo?.logoUrl) return null;
        return (
          <ChatAvatarFrame size="message">
            <img src={schoolInfo.logoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </ChatAvatarFrame>
        );
      }}
      renderOutgoingMessageAvatar={() => {
        if (students.length > 0 && students[0].photoUrl) {
          return (
            <ChatAvatarFrame size="message">
              <img src={students[0].photoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </ChatAvatarFrame>
          );
        }
        return null;
      }}
      renderRoleBadge={(contact) => {
        if (contact.type === 'admin') return <RoleBadge label={isRtl ? 'إدارة' : 'Admin'} />;
        if (contact.type === 'teacher') return <RoleBadge label={isRtl ? 'معلم' : 'Teacher'} />;
        return null;
      }}
      chatActor={
        profile
          ? { uid: profile.uid, role: profile.role ?? 'parent', schoolId: profile.schoolId }
          : null
      }
      headerTrailing={
        activeContact?.type === 'admin' && (schoolInfo?.phone || schoolInfo?.whatsapp) ? (
          schoolInfo?.phone ? (
            <a href={'tel:' + String(schoolInfo.phone)} className="sx-chat-icon-btn" aria-label={isRtl ? 'اتصال' : 'Call'}>
              <Phone size={18} />
            </a>
          ) : undefined
        ) : undefined
      }
    />
  );
}