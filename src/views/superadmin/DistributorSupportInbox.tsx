import { useEffect, useMemo, useState } from "react";
import { Loader2, MessageSquare, SendHorizontal } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "../../lib/AuthContext";
import {
  distributorConversationId,
  ensureDistributorSupportConversation,
  markDistributorMessagesRead,
  sendDistributorSupportMessage,
  subscribeDistributorSupportConversations,
  subscribeDistributorSupportMessages,
  type DistributorSupportConversation,
  type DistributorSupportMessage,
} from "../../lib/distributorSupportChat";
import type { DistributorRecord } from "../../types/distributor";
import { db } from "../../lib/firebase";
import { collection, getDocs, limit, query, where } from "firebase/firestore";

export function DistributorSupportInbox({
  distributors,
}: {
  distributors: DistributorRecord[];
}) {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<DistributorSupportConversation[]>([]);
  const [selectedDistributorId, setSelectedDistributorId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DistributorSupportMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    const unsub = subscribeDistributorSupportConversations(
      (rows) => {
        setConversations(rows);
        setLoadingList(false);
      },
      () => setLoadingList(false),
    );
    return () => unsub();
  }, []);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.distributorId === selectedDistributorId) || null,
    [conversations, selectedDistributorId],
  );

  useEffect(() => {
    if (!selectedDistributorId) {
      setMessages([]);
      return;
    }
    const conversationId = distributorConversationId(selectedDistributorId);
    const unsub = subscribeDistributorSupportMessages(
      conversationId,
      (rows) => {
        setMessages(rows);
        if (profile?.uid) {
          void markDistributorMessagesRead({
            conversationId,
            readerId: profile.uid,
            readerRole: "superadmin",
          });
        }
      },
    );
    return () => unsub();
  }, [selectedDistributorId, profile?.uid]);

  const openChatForDistributor = async (distributor: DistributorRecord) => {
    let userId = distributor.userId;
    if (!userId) {
      const q = query(
        collection(db, "users"),
        where("distributorId", "==", distributor.id),
        limit(1),
      );
      const snap = await getDocs(q);
      userId = snap.docs[0]?.id;
    }
    if (!userId) {
      toast.error("لا يوجد حساب مستخدم مربوط بهذا الموزع (أضف users.distributorId)");
      return;
    }
    try {
      await ensureDistributorSupportConversation({
        distributorId: distributor.id,
        distributorUserId: userId,
        distributorName: distributor.name,
      });
      setSelectedDistributorId(distributor.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل فتح المحادثة");
    }
  };

  const handleSend = async () => {
    if (!profile?.uid || !selectedDistributorId || !input.trim()) return;
    setSending(true);
    try {
      const conversationId = distributorConversationId(selectedDistributorId);
      await sendDistributorSupportMessage({
        conversationId,
        distributorId: selectedDistributorId,
        senderId: profile.uid,
        senderRole: "superadmin",
        senderName: profile.name || "الإدارة",
        text: input,
      });
      setInput("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل إرسال الرسالة");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="sx-dist-inbox">
      <div className="sx-dist-inbox__head">
        <h3 className="text-lg font-black text-[#0B2345] dark:text-white flex items-center gap-2">
          <MessageSquare size={18} />
          رسائل الموزعين
        </h3>
        <p className="text-xs text-slate-500 font-bold mt-1">
          محادثات الدعم المباشر مع الموزعين — منفصلة عن محادثات المدارس
        </p>
      </div>

      <div className="sx-dist-inbox__layout">
        <aside className="sx-dist-inbox__list">
          {loadingList ? (
            <div className="p-4 flex justify-center"><Loader2 className="animate-spin" size={20} /></div>
          ) : conversations.length === 0 ? (
            <p className="p-4 text-sm text-slate-500 font-bold">لا توجد محادثات بعد</p>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`sx-dist-inbox__item ${selectedDistributorId === c.distributorId ? "is-active" : ""}`}
                onClick={() => setSelectedDistributorId(c.distributorId)}
              >
                <strong>{c.distributorName || c.distributorId}</strong>
                <span className="truncate">{c.lastMessage || "—"}</span>
                {(c.unreadForSuperAdmin || 0) > 0 ? (
                  <em className="sx-dist-inbox__unread">{c.unreadForSuperAdmin}</em>
                ) : null}
              </button>
            ))
          )}

          <div className="sx-dist-inbox__quick">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-3 py-2">فتح محادثة</p>
            {distributors.map((d) => (
              <button
                key={`open-${d.id}`}
                type="button"
                className="sx-dist-inbox__open-btn"
                onClick={() => void openChatForDistributor(d)}
              >
                {d.name}
              </button>
            ))}
          </div>
        </aside>

        <div className="sx-dist-inbox__chat">
          {!selectedDistributorId ? (
            <p className="sx-dist-empty p-6">اختر موزعاً لعرض المحادثة</p>
          ) : (
            <>
              <div className="sx-dist-inbox__chat-head">
                <strong>
                  {selectedConversation?.distributorName ||
                    distributors.find((d) => d.id === selectedDistributorId)?.name ||
                    selectedDistributorId}
                </strong>
              </div>
              <div className="sx-dist-chat__messages sx-dist-inbox__messages">
                {messages.map((m) => {
                  const mine = m.senderRole === "superadmin";
                  return (
                    <div key={m.id} className={`sx-dist-chat__bubble ${mine ? "is-mine" : "is-theirs"}`}>
                      <p className="sx-dist-chat__sender">{mine ? "الإدارة" : "الموزع"}</p>
                      <p>{m.text}</p>
                    </div>
                  );
                })}
              </div>
              <div className="sx-dist-chat__composer">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="اكتب ردك للموزع..."
                  rows={2}
                />
                <button type="button" onClick={() => void handleSend()} disabled={sending || !input.trim()}>
                  {sending ? <Loader2 className="animate-spin" size={16} /> : <SendHorizontal size={16} />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
