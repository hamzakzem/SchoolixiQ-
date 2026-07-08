import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { db, storage } from '../../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, getDocs, doc, updateDoc, orderBy, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useLanguage } from '../../lib/LanguageContext';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { notificationService } from '../../lib/notificationService';
import { useSystemConfig } from '../../lib/SystemConfigContext';
import { Search, Building2, Megaphone } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SchoolixChatShell, type ChatShellContact } from '../../components/chat/SchoolixChatShell';
import { ChatAvatarFrame, DefaultContactAvatar, RoleBadge } from '../../components/chat/chatAvatars';
import { useChatBack } from '../../hooks/useChatBack';
import { enterChatMode, leaveChatMode } from '../../lib/chatFreezeGuard';
import { withMessageRetentionFields } from '../../lib/dataRetention';
import { markSystemMessagesRead } from '../../lib/chatMessageReads';
import { markChatPerf, openChatSnapshotListener, resetChatPerf } from '../../lib/chatPerf';
import {
  applyThreadMessagesIfChanged,
  buildLegacySchoolSupportThreadQuery,
  buildPlatformOpsThreadMessagesQuery,
  buildThreadMessagesQuery,
  shouldMarkThreadUnread,
  unreadIdsForReceiver,
} from '../../lib/chatThreadMessages';
import {
  filterConversationsForAccess,
  filterMessagesForAccess,
  resolveMessagingAccess,
} from '../../lib/messagingAccess';
import { adminPermanentDeleteMessage } from '../../lib/adminApi';

const BROADCAST_ID = '__broadcast__';

function canUsePlatformChat(profile: { role?: string; schoolId?: string } | null) {
  if (!profile) return false;
  const access = resolveMessagingAccess(profile as Record<string, unknown>);
  return access.canAccessPlatformInbox;
}

export default function SuperAdminChatTab() {
  const { profile } = useAuth();
  const { isRtl } = useLanguage();
  const { config } = useSystemConfig();
  const messagingAccess = useMemo(
    () => resolveMessagingAccess(profile as Record<string, unknown> | null),
    [profile],
  );
  const isPlatformAssistantView = messagingAccess.role === 'platform_assistant';
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [schools, setSchools] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeContact, setActiveContact] = useState<{ id: string, name: string, type: string, extra?: any } | null>(null);
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
    resetChatPerf('SuperAdminChatTab');
    enterChatMode('SuperAdminChatTab');
    console.info('[ChatFreeze] LISTENER_SETUP', { tab: 'SuperAdminChatTab' });
    return () => {
      console.info('[ChatFreeze] LISTENER_CLEANUP', { tab: 'SuperAdminChatTab' });
      leaveChatMode('SuperAdminChatTab');
      messagesSigRef.current = '';
      unreadKeyRef.current = '';
      messagesFirstSnapshotRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!canUsePlatformChat(profile)) return;

    const q = query(collection(db, 'schools'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const schs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      setSchools(schs);
      setContactsLoaded(true);
      markChatPerf('contacts_loaded', 'SuperAdminChatTab', { contacts: schs.length });
      if (schs.length > 0 && !didAutoSelectRef.current) {
        didAutoSelectRef.current = true;
        setActiveContact({ id: schs[0].id, name: schs[0].name, type: 'school', extra: schs[0] });
      }
    });
    const untrackSchools = openChatSnapshotListener('SuperAdminChatTab:schools');

    // Platform assistants: only ops visibility — avoids rules rejection on SA private docs
    const qUnread = isPlatformAssistantView
      ? query(
          collection(db, 'system_messages'),
          where('receiverId', '==', 'super_admin'),
          where('visibility', '==', 'platform_operations'),
          where('read', '==', false),
        )
      : query(
          collection(db, 'system_messages'),
          where('receiverId', '==', 'super_admin'),
          where('read', '==', false),
        );
    const unsubUnread = onSnapshot(
      qUnread,
      (snapshot) => {
        const counts: Record<string, number> = {};
        snapshot.docs.forEach((docSnap) => {
          const msg = { id: docSnap.id, ...docSnap.data() } as Record<string, unknown>;
          if (
            filterMessagesForAccess(
              [msg],
              messagingAccess,
              profile?.uid || '',
              profile as Record<string, unknown>,
            ).length === 0
          ) {
            return;
          }
          const schoolId = String(msg.schoolId ?? '');
          if (!schoolId) return;
          counts[schoolId] = (counts[schoolId] || 0) + 1;
        });
        setUnreadCounts(counts);
      },
      (err) => {
        console.warn('Unread listener error:', err);
        // Fallback without composite visibility index: client-filter only for SA
        if (!isPlatformAssistantView) return;
        setUnreadCounts({});
      },
    );
    const untrackUnread = openChatSnapshotListener('SuperAdminChatTab:unread');

    const qConversations = isPlatformAssistantView
      ? query(
          collection(db, 'conversations'),
          where('participants', 'array-contains', 'super_admin'),
          where('visibility', '==', 'platform_operations'),
          orderBy('updatedAt', 'desc'),
        )
      : query(
          collection(db, 'conversations'),
          where('participants', 'array-contains', 'super_admin'),
          orderBy('updatedAt', 'desc'),
        );

    const unsubConversations = onSnapshot(
      qConversations,
      (snapshot) => {
        const raw = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        const allowed = filterConversationsForAccess(
          raw as Record<string, unknown>[],
          messagingAccess,
          profile as Record<string, unknown>,
        );

        setLastInteractionTimes((prev) => {
          const next = { ...prev };
          let changed = false;
          allowed.forEach((data) => {
            const schoolId = String(data.schoolId ?? '');
            const updatedAt = data.updatedAt as { toMillis?: () => number } | undefined;
            if (updatedAt?.toMillis && schoolId) {
              const time = updatedAt.toMillis();
              if (next[schoolId] !== time) {
                next[schoolId] = time;
                changed = true;
              }
            }
          });
          return changed ? next : prev;
        });
        setLastMessageSnippets((prev) => {
          const next = { ...prev };
          let changed = false;
          allowed.forEach((data) => {
            const schoolId = String(data.schoolId ?? '');
            const lastMessage = data.lastMessage;
            if (!lastMessage || !schoolId) return;
            if (next[schoolId] !== lastMessage) {
              next[schoolId] = String(lastMessage);
              changed = true;
            }
          });
          return changed ? next : prev;
        });
      },
      (err) => {
        console.warn('Conversations listener error:', err);
      },
    );
    const untrackConversations = openChatSnapshotListener('SuperAdminChatTab:conversations');

    return () => {
      unsubscribe();
      unsubUnread();
      unsubConversations();
      untrackSchools();
      untrackUnread();
      untrackConversations();
    };
  }, [
    profile?.role,
    profile?.schoolId,
    profile?.uid,
    messagingAccess,
    isPlatformAssistantView,
  ]);

  useEffect(() => {
    if (!profile?.uid || !activeContact || activeContact.id === BROADCAST_ID) {
      if (activeContact?.id === BROADCAST_ID) setMessages([]);
      return;
    }

    messagesSigRef.current = '';
    unreadKeyRef.current = '';
    messagesFirstSnapshotRef.current = false;

    const convId = `superadmin_${activeContact.id}`;
    const untrackMessages = openChatSnapshotListener('SuperAdminChatTab:messages');

    const mergeAndApply = (docs: Record<string, unknown>[]) => {
      const byId = new Map<string, Record<string, unknown>>();
      for (const d of docs) byId.set(String(d.id), d);
      const filtered = filterMessagesForAccess(
        Array.from(byId.values()),
        messagingAccess,
        profile.uid,
        profile as Record<string, unknown>,
      );
      const sorted = applyThreadMessagesIfChanged(
        filtered as any[],
        messagesSigRef,
        setMessages,
      );
      if (!messagesFirstSnapshotRef.current) {
        messagesFirstSnapshotRef.current = true;
        markChatPerf('messages_first_snapshot', 'SuperAdminChatTab', {
          conversationId: convId,
          count: sorted.length,
        });
      }
      prevMessagesLength.current = sorted.length;
      isFirstLoad.current = false;
      const unreadIds = unreadIdsForReceiver(sorted, ['super_admin']);
      if (shouldMarkThreadUnread(unreadIds, unreadKeyRef)) {
        markSystemMessagesRead(unreadIds, 'SuperAdminChatTab');
      }
    };

    if (isPlatformAssistantView) {
      // Two scoped queries — never fetch superadmin_private docs (rules would deny the whole list)
      const opsDocs = new Map<string, Record<string, unknown>>();
      const legacyDocs = new Map<string, Record<string, unknown>>();
      const flush = () => {
        mergeAndApply([
          ...Array.from(opsDocs.values()),
          ...Array.from(legacyDocs.values()),
        ]);
      };

      const unsubOps = onSnapshot(
        buildPlatformOpsThreadMessagesQuery(activeContact.id, convId),
        (snap) => {
          opsDocs.clear();
          snap.docs.forEach((d) => opsDocs.set(d.id, { id: d.id, ...d.data() }));
          flush();
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'SuperAdminChatTab:ops_messages');
        },
      );
      const unsubLegacy = onSnapshot(
        buildLegacySchoolSupportThreadQuery(activeContact.id, convId),
        (snap) => {
          legacyDocs.clear();
          snap.docs.forEach((d) => {
            const data = d.data() as Record<string, unknown>;
            // Skip any doc that somehow has SA private visibility
            if (
              data.visibility === 'superadmin_private' ||
              data.visibilityScope === 'superadmin_private'
            ) {
              return;
            }
            legacyDocs.set(d.id, { id: d.id, ...data });
          });
          flush();
        },
        (error) => {
          // Composite indexes may be missing for legacy path — non-fatal
          console.warn('[SuperAdminChatTab] legacy support query:', error);
        },
      );

      return () => {
        unsubOps();
        unsubLegacy();
        untrackMessages();
      };
    }

    const q = buildThreadMessagesQuery(activeContact.id, convId);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as any),
      }));
      mergeAndApply(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'SuperAdminChatTab:system_messages');
    });

    return () => {
      unsubscribe();
      untrackMessages();
    };
  }, [
    profile?.uid,
    profile?.role,
    profile?.schoolId,
    activeContact?.id,
    messagingAccess,
    isPlatformAssistantView,
  ]);

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

  const sendToSchool = async (
    school: { id: string; name?: string },
    messageText: string,
    file?: { fileUrl: string | null; fileType: string | null; fileName: string | null },
  ) => {
    if (!profile?.uid) return;

    const convId = `superadmin_${school.id}`;
    const attachmentLabel = isRtl ? 'ملف مرفق' : 'Attachment';
    // Super Admin → school is private. Platform Assistant → school is ops only.
    const visibility = isPlatformAssistantView
      ? 'platform_operations'
      : 'superadmin_private';
    const allowedRoles = isPlatformAssistantView
      ? ['superadmin', 'platform_assistant', 'admin', 'school_admin']
      : ['superadmin', 'admin', 'school_admin'];
    const actorRole = messagingAccess.role || profile.role || 'superadmin';

    await addDoc(collection(db, 'system_messages'), withMessageRetentionFields({
      conversationId: convId,
      schoolId: school.id,
      senderId: profile.uid,
      senderName:
        profile.name ||
        (isPlatformAssistantView ? 'System Assistant' : 'إدارة المنصة'),
      senderRole: actorRole,
      receiverId: 'admin',
      audience: 'school_admin',
      createdBy: profile.uid,
      createdByRole: actorRole,
      visibility,
      visibilityScope: visibility,
      allowedRoles,
      content: messageText || attachmentLabel,
      fileUrl: file?.fileUrl || null,
      fileType: file?.fileType || null,
      fileName: file?.fileName || null,
      createdAt: serverTimestamp(),
      read: false,
    }));

    await setDoc(
      doc(db, 'conversations', convId),
      {
        conversationId: convId,
        schoolId: school.id,
        participants: ['super_admin', 'admin'],
        createdBy: profile.uid,
        createdByRole: actorRole,
        visibility,
        visibilityScope: visibility,
        allowedRoles,
        lastMessage: messageText || attachmentLabel,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    const q = query(
      collection(db, 'users'),
      where('schoolId', '==', school.id),
      where('role', 'in', ['admin', 'assistant', 'school_assistant']),
    );
    const adminSnaps = await getDocs(q);
    const adminIds = adminSnaps.docs.map((d) => d.id);
    if (adminIds.length > 0) {
      await notificationService.sendToMultiple(adminIds, {
        title: 'رسالة جديدة من إدارة المنصة',
        message: messageText.substring(0, 50) + (messageText.length > 50 ? '...' : ''),
        type: 'system',
        schoolId: school.id,
        metadata: { senderId: profile.uid, conversationId: convId, audience: 'school_admin', routeTarget: 'chat' },
      });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !profile?.uid || !activeContact) return;
    if (!messagingAccess.canAccessPlatformInbox) {
      toast.error(isRtl ? 'لا صلاحية للمراسلة' : 'No messaging permission');
      return;
    }

    const messageText = newMessage.trim();
    const isBroadcast = activeContact.id === BROADCAST_ID;

    if (isBroadcast && isPlatformAssistantView) {
      toast.error(
        isRtl
          ? 'البث الجماعي متاح لمدير النظام فقط'
          : 'Broadcast is Super Admin only',
      );
      return;
    }

    if (isBroadcast && selectedFile) {
      toast.error(isRtl ? 'البث الجماعي يدعم النص فقط حالياً' : 'Broadcast supports text only');
      return;
    }

    if (isBroadcast) {
      const confirmed = window.confirm(
        isRtl
          ? `إرسال هذه الرسالة إلى ${schools.length} مدرسة؟`
          : `Send this message to ${schools.length} schools?`,
      );
      if (!confirmed) return;
    }

    setNewMessage('');
    setIsLoading(true);

    try {
      let filePayload: { fileUrl: string | null; fileType: string | null; fileName: string | null } | undefined;

      if (selectedFile && !isBroadcast) {
        const convId = `superadmin_${activeContact.id}`;
        const fileExt = selectedFile.name.split('.').pop();
        const path = `chat_files/${convId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, selectedFile);
        const fileUrl = await getDownloadURL(storageRef);
        filePayload = {
          fileUrl,
          fileType: selectedFile.type.startsWith('video/') ? 'video' : 'image',
          fileName: selectedFile.name,
        };
        setSelectedFile(null);
      }

      if (isBroadcast) {
        let sent = 0;
        for (const school of schools) {
          await sendToSchool(school, messageText);
          sent += 1;
        }
        toast.success(
          isRtl ? `تم إرسال الرسالة إلى ${sent} مدرسة` : `Message sent to ${sent} schools`,
        );
      } else {
        await sendToSchool(activeContact, messageText, filePayload);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'system_messages');
      toast.error(isRtl ? 'فشل إرسال الرسالة' : 'Failed to send message');
      setNewMessage(messageText);
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

  const filteredSchools = schools.filter(s => 
    (s.name && s.name.toLowerCase().includes(searchTerm.toLowerCase()))
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

  const shellContacts: ChatShellContact[] = filteredSchools.map((school) => ({
    id: school.id,
    name: school.name,
    type: 'school',
    extra: school,
  }));

  const renderContactAvatar = (contact: ChatShellContact, isSelected: boolean, size: 'list' | 'header' | 'message' = 'list') => {
    if (contact.id === BROADCAST_ID) {
      return <DefaultContactAvatar contact={{ ...contact, type: 'broadcast' }} selected={isSelected} />;
    }
    const logoUrl = contact.extra?.logoUrl as string | undefined;
    if (logoUrl) {
      return (
        <ChatAvatarFrame selected={isSelected} size={size}>
          <img src={logoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        </ChatAvatarFrame>
      );
    }
    return <DefaultContactAvatar contact={contact} selected={isSelected} />;
  };

  const activeShellContact: ChatShellContact | null = activeContact
    ? { id: activeContact.id, name: activeContact.name, type: activeContact.type, extra: activeContact.extra }
    : null;

  const headerStatus =
    activeContact?.id === BROADCAST_ID
      ? isRtl ? 'بث جماعي — مدرسة بمدرسة' : 'Broadcast — per school'
      : activeContact?.type === 'school'
        ? isRtl ? 'مدرسة' : 'School'
        : undefined;

  const handleChatBack = useChatBack({
    activeContact,
    mobileShowChat,
    setMobileShowChat,
    setActiveContact: () => setActiveContact(null),
  });

  const broadcastIntro = activeContact?.id === BROADCAST_ID ? (
    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
      <div className="w-20 h-20 rounded-full bg-[#D4AF37]/15 flex items-center justify-center mb-4 text-[#0B2345]">
        <Megaphone size={36} />
      </div>
      <h3 className="text-lg font-black text-[#0B2345] dark:text-white">
        {isRtl ? 'مراسلة جميع المدارس' : 'Message all schools'}
      </h3>
      <p className="text-sm text-[#0B2345]/60 dark:text-slate-400 mt-2 max-w-md font-semibold leading-relaxed">
        {isRtl
          ? 'سيتم إرسال الرسالة بشكل منفصل لكل مدرسة مع schoolId وsenderId صحيحين — دون تسريب بين المدارس.'
          : 'Each school receives a separate message with correct schoolId and senderId.'}
      </p>
    </div>
  ) : null;

  return (
    <SchoolixChatShell
      isRtl={isRtl}
      listTitle={
        isPlatformAssistantView
          ? isRtl
            ? 'رسائل العمليات — System Assistant'
            : 'Ops Inbox — System Assistant'
          : isRtl
            ? 'رسائل الإدارة العليا'
            : 'Super Admin Messages'
      }
      searchPlaceholder={isRtl ? 'بحث باسم المدرسة...' : 'Search schools...'}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      contacts={shellContacts}
      unreadCounts={unreadCounts}
      lastInteractionTimes={lastInteractionTimes}
      lastMessageSnippets={lastMessageSnippets}
      activeContact={activeShellContact}
      onSelectContact={(contact) => {
        setActiveContact({ id: contact.id, name: contact.name, type: contact.type || 'school', extra: contact.extra });
        setMobileShowChat(true);
      }}
      mobileShowChat={mobileShowChat}
      onChatBack={handleChatBack}
      groupedMessages={activeContact?.id === BROADCAST_ID ? {} : groupedMessages}
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
      headerStatusText={
        headerStatus ||
        (isPlatformAssistantView
          ? messagingAccess.displayLabelEn
          : undefined)
      }
      isLoadingContacts={!contactsLoaded}
      disableAttachments={activeContact?.id === BROADCAST_ID}
      inputPlaceholder={
        activeContact?.id === BROADCAST_ID
          ? (isRtl ? 'اكتب رسالة البث لجميع المدارس...' : 'Write broadcast message...')
          : (isRtl ? 'اكتب رسالة...' : 'Type a message...')
      }
      emptyListMessage={isRtl ? 'لا توجد مدارس مطابقة' : 'No matching schools'}
      listTopContent={
        !isPlatformAssistantView ? (
        <button
          type="button"
          onClick={() => {
            setActiveContact({ id: BROADCAST_ID, name: isRtl ? 'جميع المدارس' : 'All Schools', type: 'broadcast' });
            setMobileShowChat(true);
          }}
          className={`mx-2 mb-2 flex items-center gap-3 p-3 rounded-2xl w-[calc(100%-1rem)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] ${
            activeContact?.id === BROADCAST_ID ? 'sx-chat-contact--active' : 'border border-dashed border-[#D4AF37]/40 hover:bg-[#D4AF37]/5'
          }`}
          aria-label={isRtl ? 'رسالة لجميع المدارس' : 'Broadcast to all schools'}
        >
          <DefaultContactAvatar contact={{ id: BROADCAST_ID, name: '', type: 'broadcast' }} selected={activeContact?.id === BROADCAST_ID} />
          <div className="flex-1 min-w-0 text-start">
            <h3 className="font-bold text-sm text-[#0B2345] dark:text-amber-200 truncate">
              {isRtl ? 'رسالة لجميع المدارس' : 'Broadcast to all schools'}
            </h3>
            <p className="text-xs text-[#0B2345]/55 truncate mt-0.5">
              {isRtl ? 'إرسال آمن لكل مدرسة على حدة' : 'Secure per-school delivery'}
            </p>
          </div>
        </button>
        ) : (
          <div className="mx-2 mb-2 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 text-[11px] font-bold text-blue-700 dark:text-blue-300">
            {isRtl
              ? 'صندوق رسائل مساعد المنصة — لا يشمل رسائل السوبر أدمن الخاصة'
              : 'System Assistant inbox — excludes Super Admin private messages'}
          </div>
        )
      }
      renderListAvatar={(contact, isSelected) => renderContactAvatar(contact, isSelected, 'list')}
      renderHeaderAvatar={() =>
        activeShellContact ? renderContactAvatar(activeShellContact, true, 'header') : null
      }
      renderIncomingMessageAvatar={() => {
        const logoUrl = activeContact?.extra?.logoUrl as string | undefined;
        if (!logoUrl) return null;
        return (
          <ChatAvatarFrame size="message">
            <img src={logoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </ChatAvatarFrame>
        );
      }}
      renderOutgoingMessageAvatar={() => {
        if (!config.appLogo) return null;
        return (
          <ChatAvatarFrame size="message">
            <img src={config.appLogo} alt="" className="w-full h-full object-contain p-0.5" referrerPolicy="no-referrer" />
          </ChatAvatarFrame>
        );
      }}
      renderRoleBadge={() => (
        <RoleBadge
          label={
            isPlatformAssistantView
              ? isRtl
                ? 'System Assistant'
                : 'System Assistant'
              : isRtl
                ? 'مدرسة'
                : 'School'
          }
        />
      )}
      renderEmptyThreadIntro={() => (activeContact?.id === BROADCAST_ID ? broadcastIntro : null)}
      showEmptyThreadIntro
      headerTrailing={
        config.appLogo ? (
          <img src={config.appLogo} alt={config.appName || ''} className="w-10 h-10 object-contain hidden sm:block rounded-xl border border-[#0B2345]/10 p-1 bg-white" referrerPolicy="no-referrer" />
        ) : undefined
      }
      chatActor={
        profile
          ? {
              uid: profile.uid,
              role: messagingAccess.role || profile.role || 'superadmin',
              schoolId: profile.schoolId,
              permissions: Array.isArray(profile.permissions)
                ? profile.permissions
                : undefined,
            }
          : null
      }
      canPermanentDelete={messagingAccess.canDelete}
      onPermanentDeleteMessage={async (msg) => {
        const id = String(msg.id ?? '');
        if (!id) return;
        await adminPermanentDeleteMessage(id);
        setMessages((prev) => prev.filter((m) => m.id !== id));
      }}
    />
  );
}