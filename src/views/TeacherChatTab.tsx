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
import { notificationService } from "../lib/notificationService";
import { useSystemConfig } from "../lib/SystemConfigContext";
import {
  MoreVertical,
  Phone,
  Info,
  Building2,
  X,
  MapPin,
  Mail,
  Edit2,
  Save,
  User,
  GraduationCap,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "react-hot-toast";
import { SchoolixChatShell, type ChatShellContact } from "../components/chat/SchoolixChatShell";
import { useChatBack } from "../hooks/useChatBack";
import { enterChatMode, leaveChatMode } from "../lib/chatFreezeGuard";
import { withMessageRetentionFields } from "../lib/dataRetention";
import { markSystemMessagesRead } from "../lib/chatMessageReads";
import { markChatPerf, openChatSnapshotListener, recordChatRender, resetChatPerf } from "../lib/chatPerf";
import {
  applyThreadMessagesIfChanged,
  buildThreadMessagesQuery,
  shouldMarkThreadUnread,
  unreadIdsForReceiver,
} from "../lib/chatThreadMessages";
import { ChatAvatarFrame, DefaultContactAvatar, RoleBadge } from "../components/chat/chatAvatars";

export default function TeacherChatTab() {
  const { profile } = useAuth();
  const { isRtl } = useLanguage();
  const { config } = useSystemConfig();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const [showSchoolInfo, setShowSchoolInfo] = useState(false);
  const [isEditingSchoolInfo, setIsEditingSchoolInfo] = useState(false);
  const [editedPhone, setEditedPhone] = useState("");
  const [editedWhatsapp, setEditedWhatsapp] = useState("");

  const [showTeacherContactModal, setShowTeacherContactModal] = useState(false);
  const [teacherPhone, setTeacherPhone] = useState(
    (profile as any)?.phone || "",
  );
  const [teacherWhatsapp, setTeacherWhatsapp] = useState(
    (profile as any)?.whatsapp || "",
  );

  const [parents, setParents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeContact, setActiveContact] = useState<{
    id: string;
    name: string;
    type: "admin" | "parent";
    extra?: any;
  } | null>(null);

  const adminName =
    schoolInfo?.name || (isRtl ? "إدارة المدرسة" : "School Administration");

  const [students, setStudents] = useState<any[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [lastInteractionTimes, setLastInteractionTimes] = useState<Record<string, number>>({});
  const [lastMessageSnippets, setLastMessageSnippets] = useState<Record<string, string>>({});
  const [contactsLoaded, setContactsLoaded] = useState(false);

  const prevMessagesLength = useRef<number>(0);
  const isFirstLoad = useRef<boolean>(true);
  const didAutoSelectRef = useRef(false);
  const messagesSigRef = useRef("");
  const unreadKeyRef = useRef("");
  const messagesFirstSnapshotRef = useRef(false);

  useEffect(() => {
    resetChatPerf("TeacherChatTab");
    enterChatMode("TeacherChatTab");
    console.info("[ChatFreeze] LISTENER_SETUP", { tab: "TeacherChatTab" });
    return () => {
      console.info("[ChatFreeze] LISTENER_CLEANUP", { tab: "TeacherChatTab" });
      leaveChatMode("TeacherChatTab");
      messagesSigRef.current = "";
      unreadKeyRef.current = "";
      messagesFirstSnapshotRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (profile?.schoolId) {
      getDoc(doc(db, "schools", profile.schoolId)).then((docSnap) => {
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...(docSnap.data() as any) };
          setSchoolInfo(data);
          if (!didAutoSelectRef.current) {
            didAutoSelectRef.current = true;
            setActiveContact({
              id: "admin",
              name:
                data.name ||
                (isRtl ? "إدارة المدرسة" : "School Administration"),
              type: "admin",
            });
          }
        }
      });
      // Fetch parents for this school
      const qParents = query(
        collection(db, "users"),
        where("schoolId", "==", profile.schoolId),
        where("role", "==", "parent"),
      );
      const unsubParents = onSnapshot(qParents, (snapshot) => {
        const p = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as any),
        }));
        setParents(p);
        setContactsLoaded(true);
        markChatPerf("contacts_loaded", "TeacherChatTab", { contacts: p.length + 1 });
      });
      const untrackParents = openChatSnapshotListener("TeacherChatTab:parents");
      // Fetch students for this school
      const qStudents = query(
        collection(db, "students"),
        where("schoolId", "==", profile.schoolId),
      );
      const unsubStudents = onSnapshot(qStudents, (snapshot) => {
        const s = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as any),
        }));
        setStudents(s);
      });
      const untrackStudents = openChatSnapshotListener("TeacherChatTab:students");

      // Fetch unread messages
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
          counts[msg.senderId] = (counts[msg.senderId] || 0) + 1;
        });
        
        setUnreadCounts(counts);
      });
      const untrackUnread = openChatSnapshotListener("TeacherChatTab:unread");

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
      const untrackConversations = openChatSnapshotListener("TeacherChatTab:conversations");

      return () => {
        unsubParents();
        unsubStudents();
        unsubUnread();
        unsubConversations();
        untrackParents();
        untrackStudents();
        untrackUnread();
        untrackConversations();
      };
    }
  }, [profile?.schoolId, profile?.uid, isRtl]);

  useEffect(() => {
    if (profile) {
      setTeacherPhone((profile as any).phone || "");
      setTeacherWhatsapp((profile as any).whatsapp || "");
    }
  }, [profile]);

  const handleEditSchoolInfo = () => {
    setEditedPhone(schoolInfo?.phone || "");
    setEditedWhatsapp(schoolInfo?.whatsapp || "");
    setIsEditingSchoolInfo(true);
  };

  const handleSaveSchoolInfo = async () => {
    if (!schoolInfo?.id) return;
    setIsLoading(true);
    try {
      await updateDoc(doc(db, "schools", schoolInfo.id), {
        phone: editedPhone,
        whatsapp: editedWhatsapp,
      });
      setSchoolInfo((prev: any) => ({
        ...prev,
        phone: editedPhone,
        whatsapp: editedWhatsapp,
      }));
      setIsEditingSchoolInfo(false);
      toast.success(
        isRtl
          ? "تم تحديث أرقام التواصل بنجاح"
          : "Contact numbers updated successfully",
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "schools");
      toast.error(isRtl ? "فشل تحديث البيانات" : "Failed to update details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTeacherContact = async () => {
    if (!profile?.uid) return;
    setIsLoading(true);
    try {
      await updateDoc(doc(db, "users", profile.uid), {
        phone: teacherPhone,
        whatsapp: teacherWhatsapp,
      });
      setShowTeacherContactModal(false);
      toast.success(
        isRtl
          ? "تم تحديث أرقام التواصل الخاصة بك بنجاح"
          : "Your contact numbers updated successfully",
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "users");
      toast.error(isRtl ? "فشل تحديث البيانات" : "Failed to update details");
    } finally {
      setIsLoading(false);
    }
  };

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
    const untrackMessages = openChatSnapshotListener("TeacherChatTab:messages");

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
          markChatPerf("messages_first_snapshot", "TeacherChatTab", {
            conversationId: convId,
            count: sorted.length,
          });
        }

        if (sorted.length > 0) {
          const lastMsg = sorted[sorted.length - 1];
          const msgTime = lastMsg.createdAt?.toMillis() || Date.now();
          setLastInteractionTimes(prev => {
            const opponentId = activeContact.id === 'admin' ? 'admin' : activeContact.id;
            if (msgTime > (prev[opponentId] || 0)) {
              return { ...prev, [opponentId]: msgTime };
            }
            return prev;
          });
        }

        prevMessagesLength.current = sorted.length;
        isFirstLoad.current = false;

        const unreadIds = unreadIdsForReceiver(sorted, [profile.uid]);
        if (shouldMarkThreadUnread(unreadIds, unreadKeyRef)) {
          markSystemMessagesRead(unreadIds, "TeacherChatTab");
        }
      },
      (error) => {
        handleFirestoreError(
          error,
          OperationType.LIST,
          "TeacherChatTab:system_messages",
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
        senderName: profile.name,
        senderRole: "teacher",
        receiverId: receiverId,
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

      if (activeContact.type === "parent") {
        await notificationService.send({
          userId: receiverId,
          title: "رسالة جديدة من المعلم",
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
            title: "رسالة جديدة من معلم (الإدارة)",
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

  const handlePhoneClick = () => {
    if (schoolInfo?.phone) {
      window.location.href = `tel:${schoolInfo.phone}`;
    } else {
      toast.error(isRtl ? "لم يتم إدخال رقم هاتف للمدرسة" : "No phone listed for the school");
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

  const filteredContacts = [
    {
      id: "admin",
      name: adminName,
      type: "admin" as const,
    },
    ...parents.map(p => ({
      id: p.id,
      name: p.name || "ولي أمر",
      type: "parent" as const,
      extra: p,
      email: p.email
    }))
  ].filter(
    (c) =>
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  ).sort((a, b) => {
    const timeA = lastInteractionTimes[a.id] || 0;
    const timeB = lastInteractionTimes[b.id] || 0;
    if (timeA !== timeB) return timeB - timeA;
    return (a.name || "").localeCompare(b.name || "");
  });

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

  const shellContacts: ChatShellContact[] = filteredContacts.map((c) => ({
    id: c.id,
    name: c.name || (c.type === 'admin' ? adminName : 'ولي أمر'),
    type: c.type,
    extra: c.extra,
    subtitle: c.type === 'admin' ? (isRtl ? 'إدارة المدرسة' : 'School Management') : undefined,
  }));

  const parentStudentPhoto = (contactId: string) =>
    students.find((st) => st.parentIds?.includes(contactId))?.photoUrl;

  const renderContactAvatar = (contact: ChatShellContact, isSelected: boolean, size: 'list' | 'header' | 'message' = 'list') => {
    if (contact.type === 'admin') {
      if (schoolInfo?.logoUrl) {
        return (
          <ChatAvatarFrame selected={isSelected} size={size}>
            <img src={schoolInfo.logoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </ChatAvatarFrame>
        );
      }
      return <DefaultContactAvatar contact={{ ...contact, type: 'admin' }} selected={isSelected} />;
    }
    const photo = parentStudentPhoto(contact.id);
    if (photo) {
      return (
        <ChatAvatarFrame selected={isSelected} size={size}>
          <img src={photo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        </ChatAvatarFrame>
      );
    }
    return <DefaultContactAvatar contact={contact} selected={isSelected} />;
  };

  const activeShellContact: ChatShellContact | null = activeContact
    ? { id: activeContact.id, name: activeContact.name, type: activeContact.type, extra: activeContact.extra }
    : null;

  const headerStatus =
    activeContact?.type === 'admin'
      ? isRtl ? 'إرشاد الإدارة' : 'Administration support'
      : activeContact?.type === 'parent'
        ? isRtl ? 'ولي أمر' : 'Parent'
        : undefined;

  const handleChatBack = useChatBack({
    activeContact,
    mobileShowChat,
    setMobileShowChat,
    setActiveContact: () => setActiveContact(null),
  });

  return (
    <>
      <SchoolixChatShell
        isRtl={isRtl}
        listTitle={isRtl ? 'محادثات الطلاب' : 'Direct Chats'}
        searchPlaceholder={isRtl ? 'بحث باسم ولي الأمر...' : 'Search parent names...'}
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
            type: (contact.type as 'admin' | 'parent') || 'parent',
            extra: contact.extra,
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
        listHeaderAction={
          <button
            type="button"
            onClick={() => setShowTeacherContactModal(true)}
            className="sx-chat-icon-btn"
            aria-label={isRtl ? 'إعدادات التواصل' : 'Contact settings'}
          >
            <MoreVertical size={18} />
          </button>
        }
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
        renderRoleBadge={(contact) => {
          if (contact.type === 'admin') return <RoleBadge label={isRtl ? 'إدارة' : 'Admin'} />;
          if (contact.type === 'parent') return <RoleBadge label={isRtl ? 'ولي أمر' : 'Parent'} />;
          return null;
        }}
        renderContactMeta={(contact) => {
          if (contact.type !== 'parent') return null;
          const parentStudents = students.filter((st) => st.parentIds?.includes(contact.id));
          if (parentStudents.length === 0) return null;
          return (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 font-bold truncate max-w-full">
              <GraduationCap size={11} className="shrink-0" />
              <span className="truncate">{parentStudents.map((st) => st.name).join(' • ')}</span>
            </span>
          );
        }}
        headerTrailing={
          activeContact?.type === 'admin' ? (
            <div className="flex items-center gap-1">
              <button type="button" onClick={handlePhoneClick} className="sx-chat-icon-btn hidden md:inline-flex" aria-label={isRtl ? 'اتصال' : 'Call'}>
                <Phone size={18} />
              </button>
              <button type="button" onClick={() => setShowSchoolInfo(true)} className="sx-chat-icon-btn" aria-label={isRtl ? 'تفاصيل المدرسة' : 'School details'}>
                <Info size={18} />
              </button>
            </div>
          ) : activeContact?.type === 'parent' && activeContact.extra?.phone ? (
            <a href={'tel:' + String(activeContact.extra.phone)} className="sx-chat-icon-btn hidden md:inline-flex" aria-label={isRtl ? 'اتصال' : 'Call'}>
              <Phone size={18} />
            </a>
          ) : undefined
        }
      />

      {/* School details modal (preserved & polished) */}
      <AnimatePresence>
        {showSchoolInfo && schoolInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 dark:border-slate-800"
              dir={isRtl ? "rtl" : "ltr"}
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between bg-slate-50 dark:bg-slate-800/45">
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  {isRtl ? "تفاصيل المدرسة" : "School Details"}
                </h2>
                <button
                  onClick={() => setShowSchoolInfo(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex flex-col items-center justify-center">
                  {schoolInfo.logoUrl ? (
                    <img
                      src={schoolInfo.logoUrl}
                      alt="Logo"
                      className="w-20 h-20 rounded-3xl object-cover shadow-md mb-3 border-2 border-white dark:border-slate-800"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-3xl bg-indigo-50 dark:bg-slate-800 flex items-center justify-center mb-3 text-indigo-600 dark:text-indigo-400 shadow-inner">
                      <Building2 size={36} />
                    </div>
                  )}
                  <h3 className="text-base font-black text-slate-900 dark:text-white text-center">
                    {schoolInfo.name}
                  </h3>
                </div>

                <div className="space-y-4">
                  {schoolInfo.address && (
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-500 rounded-xl shrink-0">
                        <MapPin size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-450 uppercase">
                          {isRtl ? "العنوان" : "Address"}
                        </p>
                        <p className="text-slate-900 dark:text-white font-bold text-sm">
                          {schoolInfo.address}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-slate-700 dark:text-slate-350 text-xs uppercase tracking-wide">
                      {isRtl ? "أرقام التواصل" : "Contact Numbers"}
                    </h4>
                    {!isEditingSchoolInfo ? (
                      <button
                        onClick={handleEditSchoolInfo}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                    ) : (
                      <button
                        onClick={handleSaveSchoolInfo}
                        disabled={isLoading}
                        className="p-1.5 text-indigo-650 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-all font-bold text-xs flex items-center gap-1"
                      >
                        <Save size={14} />
                        {isRtl ? "حفظ" : "Save"}
                      </button>
                    )}
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-500 rounded-xl shrink-0">
                      <Phone size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-slate-450 uppercase">
                        {isRtl ? "رقم الهاتف" : "Phone"}
                      </p>
                      {isEditingSchoolInfo ? (
                        <input
                          type="tel"
                          value={editedPhone}
                          onChange={(e) => setEditedPhone(e.target.value)}
                          className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-850 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs font-bold"
                          dir="ltr"
                        />
                      ) : (
                        <p className="text-slate-900 dark:text-slate-200 font-bold text-sm" dir="ltr">
                          {schoolInfo.phone || "-"}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-emerald-50 dark:bg-[#06241a] text-emerald-500 rounded-xl shrink-0">
                      <Phone size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-slate-450 uppercase">
                        {isRtl ? "واتساب" : "WhatsApp"}
                      </p>
                      {isEditingSchoolInfo ? (
                        <input
                          type="tel"
                          value={editedWhatsapp}
                          onChange={(e) => setEditedWhatsapp(e.target.value)}
                          className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-850 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs font-bold"
                          dir="ltr"
                        />
                      ) : (
                        <p className="text-slate-900 dark:text-slate-200 font-bold text-sm" dir="ltr">
                          {schoolInfo.whatsapp || "-"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Teacher Contact details Settings modal (preserved & polished) */}
      <AnimatePresence>
        {showTeacherContactModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 dark:border-slate-800"
              dir={isRtl ? "rtl" : "ltr"}
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  {isRtl ? "أرقام التواصل الخاصة بك" : "Your Contact Numbers"}
                </h2>
                <button
                  onClick={() => setShowTeacherContactModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase mb-2">
                      {isRtl ? "رقم الهاتف" : "Phone Number"}
                    </label>
                    <div className="relative">
                      <Phone
                        size={16}
                        className="absolute top-1/2 -translate-y-1/2 text-slate-400 right-4"
                      />
                      <input
                        type="tel"
                        value={teacherPhone}
                        onChange={(e) => setTeacherPhone(e.target.value)}
                        placeholder="07xxxxxxxx"
                        className="w-full pl-4 pr-12 py-3 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-bold"
                        dir="ltr"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase mb-2">
                      {isRtl ? "رقم الواتساب" : "WhatsApp Number"}
                    </label>
                    <div className="relative">
                      <Phone
                        size={16}
                        className="absolute top-1/2 -translate-y-1/2 text-emerald-450 right-4"
                      />
                      <input
                        type="tel"
                        value={teacherWhatsapp}
                        onChange={(e) => setTeacherWhatsapp(e.target.value)}
                        placeholder="07xxxxxxxx"
                        className="w-full pl-4 pr-12 py-3 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-bold"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSaveTeacherContact}
                  disabled={isLoading}
                  className="w-full mt-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {isRtl ? "حفظ التغييرات" : "Save Changes"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
