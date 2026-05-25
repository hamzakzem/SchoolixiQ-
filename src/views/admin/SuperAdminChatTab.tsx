import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { db, storage } from '../../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, getDocs, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useLanguage } from '../../lib/LanguageContext';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { notificationService } from '../../lib/notificationService';
import { useSystemConfig } from '../../lib/SystemConfigContext';
import { playPremiumNotificationSound } from '../../lib/notificationSound';
import { Send, Search, Building2, Check, CheckCheck, Sparkles, SendHorizontal, Dot, ArrowRight, ArrowLeft, Paperclip, X, Image as ImageIcon, FileVideo } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';

export default function SuperAdminChatTab() {
  const { profile } = useAuth();
  const { isRtl } = useLanguage();
  const { config } = useSystemConfig();
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
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const prevMessagesLength = useRef<number>(0);
  const isFirstLoad = useRef<boolean>(true);

  useEffect(() => {
    if (profile?.role !== 'superadmin') return;

    const q = query(collection(db, 'schools'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const schs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      setSchools(schs);
      if (schs.length > 0 && !activeContact) {
          setActiveContact({ id: schs[0].id, name: schs[0].name, type: 'school', extra: schs[0] });
      }
    });

    // Fetch all unread messages meant for superadmin
    const qUnread = query(
      collection(db, 'system_messages'),
      where('receiverId', '==', 'super_admin'),
      where('read', '==', false)
    );
    const unsubUnread = onSnapshot(qUnread, (snapshot) => {
      const counts: Record<string, number> = {};
      snapshot.docs.forEach(doc => {
        const msg = doc.data() as any;
        counts[msg.schoolId] = (counts[msg.schoolId] || 0) + 1;
      });
      setUnreadCounts(counts);
    });

    return () => { unsubscribe(); unsubUnread(); };
  }, [profile?.role]);

  useEffect(() => {
    if (!profile?.uid || !activeContact) return;

    // conversationId is superadmin_schoolId
    const convId = `superadmin_${activeContact.id}`;

    const q = query(
      collection(db, 'system_messages'),
      where('schoolId', '==', activeContact.id),
      where('conversationId', '==', convId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as any
      }));
      // Sort in memory by createdAt
      docs.sort((a: any, b: any) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeA - timeB;
      });

      setMessages(docs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

      // Play chime if messages increased and last is from others
      if (docs.length > prevMessagesLength.current) {
        if (!isFirstLoad.current && docs.length > 0) {
          const latestMsg = docs[docs.length - 1];
          if (latestMsg.senderId !== profile.uid && !latestMsg.read) {
            playPremiumNotificationSound();
          }
        }
      }
      prevMessagesLength.current = docs.length;
      isFirstLoad.current = false;

      // Mark unread as read if it's meant for superadmin
      const unreadMe = docs.filter(m => !m.read && m.receiverId === 'super_admin');
      if (unreadMe.length > 0) {
        unreadMe.forEach(m => {
          updateDoc(doc(db, 'system_messages', m.id), { read: true }).catch(err => console.log(err));
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'SuperAdminChatTab:system_messages');
    });

    return () => {
      unsubscribe();
    };
  }, [profile, activeContact]);

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

    const convId = `superadmin_${activeContact.id}`;

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

      await addDoc(collection(db, 'system_messages'), {
        conversationId: convId,
        schoolId: activeContact.id,
        senderId: profile.uid,
        senderName: profile.name || 'Super Admin',
        senderRole: 'superadmin',
        receiverId: 'admin',
        content: messageText || (isRtl ? 'ملف مرفق' : 'Attachment'),
        fileUrl,
        fileType,
        fileName,
        createdAt: serverTimestamp(),
        read: false
      });

      // Notify the receiver (school admins)
      const q = query(
        collection(db, 'users'), 
        where('schoolId', '==', activeContact.id), 
        where('role', 'in', ['admin', 'assistant'])
      );
      const adminSnaps = await getDocs(q);
      const adminIds = adminSnaps.docs.map(d => d.id);
      if (adminIds.length > 0) {
        await notificationService.sendToMultiple(adminIds, {
          title: 'رسالة جديدة من إدارة المنصة',
          message: messageText.substring(0, 50) + (messageText.length > 50 ? '...' : ''),
          type: 'system',
          schoolId: activeContact.id,
          metadata: { senderId: profile.uid, conversationId: convId }
        });
      }

      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
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

  const filteredSchools = schools.filter(s => 
    (s.name && s.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const groupedMessages = messages.reduce((acc, msg) => {
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
  }, {} as Record<string, any[]>);

  return (
    <div className="h-full min-h-0 w-full bg-white dark:bg-slate-950 overflow-hidden flex" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Sidebar - Schools Contacts List */}
      <div className={`w-full md:w-80 border-r dark:border-l border-slate-200/50 dark:border-slate-800/40 flex flex-col bg-white dark:bg-slate-900/40 shrink-0 ${mobileShowChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-ping" />
            <h2 className="text-lg font-black text-slate-900 dark:text-white font-display">
              {isRtl ? 'المحادثات والمدارس' : 'School Chats'}
            </h2>
          </div>
          
          <div className="relative">
            <Search size={16} className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${isRtl ? 'right-4' : 'left-4'}`} />
            <input 
              type="text" 
              placeholder={isRtl ? 'بحث باسم المدرسة...' : 'Search schools...'} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full bg-slate-50 dark:bg-slate-800/40 border-0 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-950/20 rounded-2xl py-3 ${isRtl ? 'pr-11 pl-4' : 'pl-11 pr-4'} text-xs font-bold text-slate-800 dark:text-white outline-none transition-all`}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto w-full custom-scrollbar space-y-1 p-2">
          {filteredSchools.map((school) => {
             const unreadCount = unreadCounts[school.id] || 0;
             const isSelected = activeContact?.id === school.id;
             return (
             <button 
               key={school.id}
               onClick={() => {
                 setActiveContact({ id: school.id, name: school.name, type: 'school', extra: school });
                 setMobileShowChat(true);
               }}
               className={`flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer transition-all duration-200 w-full relative ${
                 isSelected 
                   ? 'bg-gradient-to-l from-indigo-50/70 to-blue-50/50 dark:from-indigo-950/40 dark:to-slate-900/20 shadow-sm border-l-4 border-indigo-600' 
                   : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
               }`}
             >
               <div className="relative shrink-0">
                 {school.logoUrl ? (
                   <img 
                     src={school.logoUrl} 
                     alt={school.name} 
                     className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-md dark:border-slate-800" 
                     referrerPolicy="no-referrer"
                   />
                 ) : (
                   <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner font-bold text-lg ${
                     isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                   }`}>
                     <Building2 size={20} />
                   </div>
                 )}
                 {unreadCount > 0 && !isSelected && (
                   <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full animate-bounce">
                     {unreadCount > 9 ? '9+' : unreadCount}
                   </span>
                 )}
               </div>
               <div className="flex-1 text-right min-w-0">
                  <h3 className={`font-bold text-sm truncate ${isSelected ? 'text-indigo-950 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                    {school.name}
                  </h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                    {school.address || (isRtl ? 'مدرسة نشطة' : 'Active School')}
                  </p>
               </div>
             </button>
             );
          })}
        </div>
      </div>

      {/* Main Chat Content Area */}
      <div className={`flex-1 flex flex-col bg-slate-50/40 dark:bg-slate-900/10 w-full min-w-0 ${mobileShowChat ? 'flex' : 'hidden md:flex'}`}>
        
        {/* Active Contact Header */}
        {activeContact && (
          <div className="h-20 px-6 md:px-8 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between shadow-sm z-10 shrink-0">
            <div className="flex items-center gap-4 min-w-0">
              {/* Mobile Back Button */}
              <button
                type="button"
                onClick={() => setMobileShowChat(false)}
                className="md:hidden p-2 -mr-2 ml-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                title={isRtl ? "رجوع" : "Back"}
              >
                {isRtl ? <ArrowRight size={20} /> : <ArrowLeft size={20} />}
              </button>
               {activeContact.extra?.logoUrl ? (
                 <img 
                   src={activeContact.extra.logoUrl} 
                   alt={activeContact.name} 
                   className="w-11 h-11 rounded-2xl object-cover border-2 border-indigo-100 dark:border-indigo-950" 
                   referrerPolicy="no-referrer"
                 />
               ) : (
                 <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100/30">
                    <Building2 size={20} />
                 </div>
               )}
               <div className="min-w-0">
                 <h2 className="font-bold text-slate-900 dark:text-white truncate font-display text-base">{activeContact.name}</h2>
                 <p className="text-[10px] md:text-xs text-slate-400 dark:text-slate-500 font-bold flex items-center gap-1">
                   <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                   {isRtl ? 'دردشة مفعّلة مباشرة' : 'Active Channel'} - {isRtl ? 'المدرسة' : 'School'}
                 </p>
               </div>
            </div>
            {config.appLogo && (
              <img 
                src={config.appLogo} 
                alt={config.appName} 
                className="w-10 h-10 object-contain max-h-12 hidden sm:block border border-slate-100 dark:border-slate-800 p-1 rounded-xl bg-slate-50/50 dark:bg-slate-900" 
              />
            )}
          </div>
        )}

        {/* Messages Component list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-[#fcfdfe] dark:bg-slate-950/20">
          {activeContact && (
            <div className="flex flex-col items-center justify-center py-8">
               {activeContact.extra?.logoUrl ? (
                 <img 
                   src={activeContact.extra.logoUrl} 
                   alt={activeContact.name} 
                   className="w-20 h-20 rounded-3xl object-cover shadow-lg border-2 border-white dark:border-slate-800 mb-3" 
                   referrerPolicy="no-referrer"
                 />
               ) : (
                 <div className="w-20 h-20 rounded-3xl bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center mb-3 text-indigo-600 dark:text-indigo-400 text-3xl font-bold ring-4 ring-indigo-500/5">
                   <Building2 size={36} />
                 </div>
               )}
               <h3 className="text-lg font-black text-slate-900 dark:text-white text-center max-w-[200px] md:max-w-none">
                 {activeContact.name}
               </h3>
               <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-bold">
                 {isRtl ? 'اتصال رسمي مباشر بنظام التشفير التلقائي' : 'Official automatic TLS channel'}
               </p>
            </div>
          )}

          {Object.entries(groupedMessages).map(([dateStr, dateMsgs]) => (
            <div key={dateStr} className="space-y-4">
              <div className="flex justify-center my-6">
                <span className="bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-400 text-[10px] font-black tracking-widest px-4 py-1.5 rounded-full uppercase shadow-sm">
                  {dateStr}
                </span>
              </div>
              {(dateMsgs as any[]).map((msg: any) => {
                const isMe = msg.senderRole === 'superadmin';
                
                return (
                  <motion.div 
                    key={msg.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} mb-2`}
                  >
                    <div className={`max-w-[80%] md:max-w-[65%] flex gap-3.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      {/* Avatar inside Bubble stack */}
                      {!isMe && activeContact?.extra?.logoUrl && (
                        <img 
                          src={activeContact.extra.logoUrl} 
                          alt="School" 
                          className="w-8 h-8 rounded-xl object-cover border border-slate-200 mt-1 hidden sm:block shadow-sm"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      {isMe && config.appLogo && (
                        <img 
                          src={config.appLogo} 
                          alt="Platform Logo" 
                          className="w-8 h-8 rounded-xl object-contain border border-slate-100 mt-1 p-0.5 hidden sm:block bg-white shadow-sm"
                        />
                      )}
                      
                      {/* Actual bubble container */}
                      <div className={`px-4.5 py-3 rounded-2.5xl relative ${
                        isMe 
                          ? 'bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white rounded-br-sm shadow-md shadow-indigo-500/10' 
                          : 'bg-white dark:bg-slate-850 border border-slate-250/50 dark:border-slate-800/80 text-slate-900 dark:text-slate-100 rounded-bl-sm shadow-sm'
                      }`}>
                        <p className="leading-relaxed whitespace-pre-wrap text-sm font-medium">{msg.content}</p>
                        {msg.fileUrl && (
                          <div className="mt-2 rounded-xl overflow-hidden border border-slate-200/20 max-w-[240px] sm:max-w-[320px]">
                            {msg.fileType === 'image' ? (
                              <img src={msg.fileUrl} alt={msg.fileName || 'Attachment'} className="w-full h-auto object-cover max-h-64" referrerPolicy="no-referrer" />
                            ) : msg.fileType === 'video' ? (
                              <video src={msg.fileUrl} controls className="w-full h-auto max-h-64" />
                            ) : (
                              <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-black/10 dark:bg-white/10 rounded-lg hover:underline text-sm truncate">
                                <Paperclip size={16} />
                                <span className="truncate">{msg.fileName || 'Download File'}</span>
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status/Time indicator beneath bubbles */}
                    <div className={`flex items-center gap-1.5 mt-1.5 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">
                        {formatMessageTime(msg.createdAt)}
                      </span>
                      {isMe && (
                        <span className="text-slate-400 dark:text-slate-600">
                          {msg.read ? <CheckCheck size={13} className="text-indigo-500" /> : <Check size={13} />}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Control Input Area */}
        <div className="p-4 md:p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/80 shrink-0 relative">
          {selectedFile && (
            <div className="absolute -top-16 left-4 md:left-6 right-4 md:right-6 max-w-5xl mx-auto flex items-center justify-between bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-md p-2 rounded-xl z-20">
               <div className="flex items-center gap-3 overflow-hidden">
                 <div className="w-10 h-10 shrink-0 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 rounded-lg flex items-center justify-center">
                   {selectedFile.type.startsWith('image/') ? <ImageIcon size={20} /> : <FileVideo size={20} />}
                 </div>
                 <div className="min-w-0">
                   <p className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{selectedFile.name}</p>
                   <p className="text-xs text-slate-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                 </div>
               </div>
               <button 
                 type="button" 
                 onClick={() => setSelectedFile(null)}
                 className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors shrink-0"
               >
                 <X size={18} />
               </button>
            </div>
          )}
          <form onSubmit={handleSendMessage} className="flex items-end gap-3 max-w-5xl mx-auto relative">
            <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-[1.75rem] flex items-center px-3 py-1.5 border border-slate-200/40 dark:border-slate-800 focus-within:bg-white dark:focus-within:bg-slate-850 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-100 dark:focus-within:ring-indigo-950/20 transition-all duration-300">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/jpeg,image/png,image/gif,video/mp4,video/webm"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-10 h-10 shrink-0 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 rounded-full transition-colors"
                title={isRtl ? 'إرفاق ملف (صورة/فيديو)' : 'Attach file (Image/Video)'}
              >
                <Paperclip size={18} />
              </button>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                disabled={!activeContact || isLoading}
                placeholder={isRtl ? 'اكتب رسالتك للمدرسة بشكل واضح...' : 'Write message to the school...'}
                className="flex-1 bg-transparent border-none outline-none resize-none max-h-32 py-2.5 px-2 my-0.5 text-sm md:text-base font-bold min-h-[44px] styled-scrollbar text-slate-900 dark:text-white"
                rows={1}
              />
            </div>
            <button
              disabled={isLoading || (!newMessage.trim() && !selectedFile) || !activeContact}
              type="submit"
              className="w-12 h-12 rounded-[1.25rem] bg-indigo-600 text-white flex items-center justify-center shrink-0 hover:bg-indigo-700 hover:scale-[1.04] active:scale-[0.96] disabled:opacity-40 disabled:hover:scale-100 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:shadow-none shadow-lg shadow-indigo-600/10 transition-all duration-200"
            >
              <SendHorizontal size={18} className={isRtl ? 'rotate-180 ml-0.5' : 'mr-0.5'} />
            </button>
          </form>
          <div className="text-center mt-2.5 hidden md:block">
             <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">
               {isRtl ? 'اضغط Enter للإرسال، SHIFT+Enter لسطر غير مبعوث' : 'Press Enter to send, Shift+Enter for new line'}
             </span>
          </div>
        </div>
      </div>
    </div>
  );
}
