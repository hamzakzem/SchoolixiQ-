import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { db, storage } from '../../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc, orderBy, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useLanguage } from '../../lib/LanguageContext';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { notificationService } from '../../lib/notificationService';
import { sendChatMessageOfflineSafe, offlineActorFromProfile } from '../../lib/offline/offlineHelpers';
import { getOfflineStatusSnapshot } from '../../lib/offline/offlineStatus';
import { useSystemConfig } from '../../lib/SystemConfigContext';
import { Phone, GraduationCap } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SchoolixChatShell, type ChatShellContact } from '../../components/chat/SchoolixChatShell';
import { ChatAvatarFrame, DefaultContactAvatar, RoleBadge } from '../../components/chat/chatAvatars';
import { useChatBack } from '../../hooks/useChatBack';
import { enterChatMode, leaveChatMode } from '../../lib/chatFreezeGuard';
import { markSystemMessagesRead } from '../../lib/chatMessageReads';
import { markChatPerf, openChatSnapshotListener, resetChatPerf } from '../../lib/chatPerf';
import {
  applyThreadMessagesIfChanged,
  buildThreadMessagesQuery,
  shouldMarkThreadUnread,
  unreadIdsForReceiver,
} from '../../lib/chatThreadMessages';

console.info('[AdminChatTab] BUILD_MARKER', 'superadmin-recipient-expansion-2026-06-17');

export default function AdminChatTab() {
  const { profile } = useAuth();
  const { isRtl } = useLanguage();
  const { config } = useSystemConfig();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [contacts, setContacts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeContact, setActiveContact] = useState<{ id: string, name: string, type: string, extra?: any } | null>(null);

  const [students, setStudents] = useState<any[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [lastInteractionTimes, setLastInteractionTimes] = useState<Record<string, number>>({});
  const [lastMessageSnippets, setLastMessageSnippets] = useState<Record<string, string>>({});
  const [contactsLoaded, setContactsLoaded] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const prevMessagesLength = useRef<number>(0);
  const isFirstLoad = useRef<boolean>(true);
  const didAutoSelectRef = useRef(false);
  const messagesSigRef = useRef('');
  const unreadKeyRef = useRef('');
  const messagesFirstSnapshotRef = useRef(false);

  useEffect(() => {
    resetChatPerf('AdminChatTab');
    enterChatMode('AdminChatTab');
    console.info('[ChatFreeze] LISTENER_SETUP', { tab: 'AdminChatTab' });
    return () => {
      console.info('[ChatFreeze] LISTENER_CLEANUP', { tab: 'AdminChatTab' });
      leaveChatMode('AdminChatTab');
      messagesSigRef.current = '';
      unreadKeyRef.current = '';
      messagesFirstSnapshotRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (profile?.schoolId) {
      // Fetch teachers and parents for this school
      const q = query(
        collection(db, 'users'), 
        where('schoolId', '==', profile.schoolId),
        where('role', 'in', ['teacher', 'parent'])
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const cts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        const adminContact = {
          id: 'super_admin',
          name: isRtl ? 'إدارة المنصة (الدعم الفني)' : 'Platform Admin (Support)',
          role: 'superadmin',
          type: 'superadmin'
        };
        const allContacts = [adminContact, ...cts];
        setContacts(allContacts);
        setContactsLoaded(true);
        markChatPerf('contacts_loaded', 'AdminChatTab', { contacts: allContacts.length });
        if (!didAutoSelectRef.current) {
          didAutoSelectRef.current = true;
          setActiveContact({ id: 'super_admin', name: adminContact.name, type: 'superadmin', extra: adminContact });
        }
      });
      const untrackUsers = openChatSnapshotListener('AdminChatTab:users');

      // Fetch students for this school
      const qStudents = query(collection(db, 'students'), where('schoolId', '==', profile.schoolId));
      const unsubStudents = onSnapshot(qStudents, (snapshot) => {
        const s = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        setStudents(s);
      });
      const untrackStudents = openChatSnapshotListener('AdminChatTab:students');

      const qUnread = query(
        collection(db, 'system_messages'),
        where('schoolId', '==', profile.schoolId),
        where('receiverId', 'in', ['admin', profile.uid]),
        where('read', '==', false),
      );
      const unsubUnread = onSnapshot(qUnread, (snapshot) => {
        const counts: Record<string, number> = {};
        
        snapshot.docs.forEach(doc => {
          const msg = doc.data() as any;
          if (msg.receiverId === 'admin' || msg.receiverId === profile.uid) {
            const senderKey = msg.senderRole === 'superadmin' ? 'super_admin' : msg.senderId;
            counts[senderKey] = (counts[senderKey] || 0) + 1;
          }
        });
        setUnreadCounts(counts);
      });
      const untrackUnread = openChatSnapshotListener('AdminChatTab:unread');

      const qConversations = query(
        collection(db, "conversations"),
        where("schoolId", "==", profile.schoolId),
        where("participants", "array-contains", "admin"),
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
              const otherIds = data.participants.filter((p: string) => p !== "admin");
              otherIds.forEach((otherId: string) => {
                const key = otherId === 'super_admin' ? 'super_admin' : otherId;
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
            const otherIds = data.participants.filter((p: string) => p !== "admin");
            otherIds.forEach((otherId: string) => {
              const key = otherId === 'super_admin' ? 'super_admin' : otherId;
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
      const untrackConversations = openChatSnapshotListener('AdminChatTab:conversations');

      return () => {
        unsubscribe();
        unsubStudents();
        unsubUnread();
        unsubConversations();
        untrackUsers();
        untrackStudents();
        untrackUnread();
        untrackConversations();
      };
    }
  }, [profile?.schoolId, profile?.uid, isRtl]);

  useEffect(() => {
    if (!profile?.uid || !profile?.schoolId || !activeContact) return;

    messagesSigRef.current = '';
    unreadKeyRef.current = '';
    messagesFirstSnapshotRef.current = false;

    const convId = activeContact.id === 'super_admin' ? `superadmin_${profile.schoolId}` : `${profile.schoolId}_${activeContact.id}`;

    const q = buildThreadMessagesQuery(profile.schoolId, convId);
    const untrackMessages = openChatSnapshotListener('AdminChatTab:messages');

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as any
      }));

      const sorted = applyThreadMessagesIfChanged(docs, messagesSigRef, setMessages);

      if (!messagesFirstSnapshotRef.current) {
        messagesFirstSnapshotRef.current = true;
        markChatPerf('messages_first_snapshot', 'AdminChatTab', {
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

      const unreadIds = unreadIdsForReceiver(sorted, ['admin', profile.uid]);
      if (shouldMarkThreadUnread(unreadIds, unreadKeyRef)) {
        markSystemMessagesRead(unreadIds, 'AdminChatTab');
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'AdminChatTab:system_messages');
    });

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
    setNewMessage('');
    setIsLoading(true);

    const convId = activeContact.id === 'super_admin' ? `superadmin_${profile.schoolId}` : `${profile.schoolId}_${activeContact.id}`;

    try {
      let fileUrl = null;
      let fileType = null;
      let fileName = null;

      if (selectedFile) {
        if (!getOfflineStatusSnapshot().isOnline) {
          toast.error(isRtl ? 'إرسال الملفات يحتاج اتصالاً بالإنترنت' : 'File uploads require an internet connection');
          setNewMessage(messageText);
          return;
        }
        const fileExt = selectedFile.name.split('.').pop();
        const path = `chat_files/${convId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, selectedFile);
        fileUrl = await getDownloadURL(storageRef);
        fileType = selectedFile.type.startsWith('video/') ? 'video' : 'image';
        fileName = selectedFile.name;
        setSelectedFile(null);
      }

      const sendResult = await sendChatMessageOfflineSafe({
        actor: offlineActorFromProfile(profile),
        conversationId: convId,
        schoolId: profile.schoolId!,
        receiverId: activeContact.id,
        senderName: profile.name || 'Admin',
        senderRole: 'admin',
        content: messageText || (isRtl ? 'ملف مرفق' : 'Attachment'),
        fileUrl,
        fileType,
        fileName,
      });

      if (sendResult.mode === 'online') {
        if (activeContact.id === 'super_admin') {
          console.info('[Notifications] SUPER_ADMIN_PRODUCER_FIXED', {
            source: 'AdminChatTab',
            conversationId: convId,
          });
          await notificationService.notifySuperAdmins({
            title: 'رسالة جديدة من إدارة مدرسة',
            message: messageText.substring(0, 50) + (messageText.length > 50 ? '...' : ''),
            type: 'system',
            metadata: { senderId: profile.uid, conversationId: convId, schoolId: profile.schoolId, routeTarget: 'chat' }
          });
        } else {
          await notificationService.send({
            userId: activeContact.id,
            title: 'رسالة جديدة من الإدارة',
            message: messageText.substring(0, 50) + (messageText.length > 50 ? '...' : ''),
            type: 'system',
            schoolId: profile.schoolId,
            metadata: { senderId: profile.uid, conversationId: convId, routeTarget: 'chat' }
          });
        }
      } else {
        toast('سيتم إرسال الإشعار بعد المزامنة', { icon: 'ℹ️' });
      }

      setLastInteractionTimes(prev => ({ ...prev, [activeContact.id]: Date.now() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'system_messages');
      toast.error(isRtl ? 'فشل إرسال الرسالة' : 'Failed to send message');
      setNewMessage(messageText); // restore
    } finally {
      setIsLoading(false);
    }
  };

  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return '';
    if (typeof timestamp.toDate === 'function') {
      const date = timestamp.toDate();
      return date.toLocaleTimeString(isRtl ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' });
    }
    return '';
  };

  const filteredContacts = contacts.filter(c => 
    (c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.role && c.role.toLowerCase().includes(searchTerm.toLowerCase()))
  ).sort((a, b) => {
    const timeA = lastInteractionTimes[a.id] || 0;
    const timeB = lastInteractionTimes[b.id] || 0;
    if (timeA !== timeB) return timeB - timeA;
    return (a.name || '').localeCompare(b.name || '');
  });

  const groupedMessages = useMemo(() => messages.reduce((acc, msg) => {
    let dateStr = isRtl ? 'اليوم' : 'Today';
    if (msg.createdAt && typeof msg.createdAt.toDate === 'function') {
      const date = msg.createdAt.toDate();
      const today = new Date();
      const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
      if (!isToday) {
        dateStr = date.toLocaleDateString(isRtl ? 'ar-SA' : 'en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      }
    }
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(msg);
    return acc;
  }, {} as Record<string, any[]>), [messages, isRtl]);

  const shellContacts: ChatShellContact[] = filteredContacts.map((c) => ({
    id: c.id,
    name: c.name || c.email || c.id,
    type: c.role || c.type,
    role: c.role,
    extra: c,
  }));

  const parentStudentPhoto = (contactId: string) =>
    students.find((s) => s.parentIds?.includes(contactId))?.photoUrl;

  const renderContactAvatar = (contact: ChatShellContact, isSelected: boolean, size: 'list' | 'header' | 'message' = 'list') => {
    if (contact.id === 'super_admin') {
      return <DefaultContactAvatar contact={contact} selected={isSelected} appLogo={config.appLogo} />;
    }
    const photo = contact.role === 'parent' ? parentStudentPhoto(contact.id) : undefined;
    if (photo) {
      return (
        <ChatAvatarFrame selected={isSelected} size={size}>
          <img src={photo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        </ChatAvatarFrame>
      );
    }
    return <DefaultContactAvatar contact={contact} selected={isSelected} appLogo={config.appLogo} />;
  };

  const activeShellContact: ChatShellContact | null = activeContact
    ? {
        id: activeContact.id,
        name: activeContact.name,
        type: activeContact.type,
        extra: activeContact.extra,
      }
    : null;

  const headerStatus =
    activeContact?.type === 'superadmin'
      ? isRtl
        ? 'قناة الدعم والمنصة'
        : 'Support Channel'
      : activeContact?.type === 'teacher'
        ? isRtl
          ? 'معلم المدرسة'
          : 'Teacher'
        : activeContact?.type === 'parent' || activeContact?.extra?.role === 'parent'
          ? isRtl
            ? 'ولي أمر'
            : 'Parent'
          : undefined;

  const handleChatBack = useChatBack({
    activeContact,
    mobileShowChat,
    setMobileShowChat,
    setActiveContact: () => setActiveContact(null),
    allowClearOnDesktop: false,
  });

  return (
    <SchoolixChatShell
      isRtl={isRtl}
      listTitle={isRtl ? 'مراسلات المدرسة' : 'School Messages'}
      searchPlaceholder={isRtl ? 'بحث في المعلمين وأولياء الأمور...' : 'Search teachers and parents...'}
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
          type: contact.type || contact.role || 'user',
          extra: contact.extra,
        });
        setMobileShowChat(true);
      }}
      mobileShowChat={mobileShowChat}
      onChatBack={handleChatBack}
      groupedMessages={groupedMessages}
      isOutgoingMessage={(msg) => msg.senderRole === 'admin' || msg.senderId === profile?.uid}
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
        if (!activeShellContact) return null;
        if (activeShellContact.id === 'super_admin' && config.appLogo) {
          return (
            <ChatAvatarFrame size="message">
              <img src={config.appLogo} alt="" className="w-full h-full object-contain p-0.5" referrerPolicy="no-referrer" />
            </ChatAvatarFrame>
          );
        }
        const photo = parentStudentPhoto(activeShellContact.id);
        if (photo) {
          return (
            <ChatAvatarFrame size="message">
              <img src={photo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </ChatAvatarFrame>
          );
        }
        return null;
      }}
      renderRoleBadge={(contact) => {
        if (contact.id === 'super_admin') return <RoleBadge label={isRtl ? 'الدعم' : 'Support'} />;
        if (contact.role === 'teacher') return <RoleBadge label={isRtl ? 'معلم' : 'Teacher'} />;
        if (contact.role === 'parent') return <RoleBadge label={isRtl ? 'ولي أمر' : 'Parent'} />;
        return null;
      }}
      renderContactMeta={(contact) => {
        if (contact.role !== 'parent') return null;
        const parentStudents = students.filter((s) => s.parentIds?.includes(contact.id));
        if (parentStudents.length === 0) return null;
        return (
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 font-bold truncate max-w-full">
            <GraduationCap size={11} className="shrink-0" />
            <span className="truncate">{parentStudents.map((s) => s.name).join(' • ')}</span>
          </span>
        );
      }}
      headerTrailing={
        activeContact?.extra?.phone ? (
          <a
            href={`tel:${activeContact.extra.phone}`}
            className="sx-chat-icon-btn"
            aria-label={isRtl ? 'اتصال' : 'Call'}
          >
            <Phone size={18} />
          </a>
        ) : undefined
      }
      chatActor={
        profile
          ? { uid: profile.uid, role: profile.role ?? 'admin', schoolId: profile.schoolId }
          : null
      }
    />
  );
}
