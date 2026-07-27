import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, SendHorizontal } from 'lucide-react';
import {
  DEFAULT_SMART_ASSISTANT_CONTACT,
  LANDING_SEED_RULES,
  matchSmartAssistantRules,
  smartAssistantFallback,
  smartAssistantIntro,
  type SmartAssistantRule,
  type SmartAssistantScope,
} from '../../lib/smartAssistantEngine';

const QUICK_PROMPTS = [
  'ما هي المنصة؟',
  'ما هي الباقات؟',
  'كيف يعمل التسريح الآمن؟',
  'كيف أسجل مدرسة؟',
  'كيف أصبح موزعاً؟',
  'هل يوجد تطبيق؟',
  'كيف أتواصل معكم؟',
];

type ChatMsg = { id: string; from: 'user' | 'helper'; text: string };

export function SmartAssistantWidget({
  isRtl = true,
  rules = LANDING_SEED_RULES,
  scope = 'landing',
}: {
  isRtl?: boolean;
  rules?: SmartAssistantRule[];
  scope?: SmartAssistantScope;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: 'intro', from: 'helper', text: smartAssistantIntro(isRtl) },
  ]);

  const contact = useMemo(() => DEFAULT_SMART_ASSISTANT_CONTACT, []);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userMsg: ChatMsg = { id: `u-${Date.now()}`, from: 'user', text: trimmed };
    const match = matchSmartAssistantRules(trimmed, rules, scope);
    const reply = match?.rule.response || smartAssistantFallback(isRtl);
    const helperMsg: ChatMsg = { id: `h-${Date.now()}`, from: 'helper', text: reply };
    setMessages((prev) => [...prev, userMsg, helperMsg]);
    setInput('');

    if (match?.rule.actions?.length) {
      for (const action of match.rule.actions) {
        if (action.type === 'open_whatsapp') window.open(action.value, '_blank', 'noopener,noreferrer');
        if (action.type === 'open_email') window.location.href = `mailto:${action.value}`;
        if (action.type === 'open_section' && action.value.startsWith('#')) {
          const el = document.querySelector(action.value);
          el?.scrollIntoView({ behavior: 'smooth' });
        }
        if (action.type === 'open_section' && action.value.startsWith('/')) {
          window.location.href = action.value;
        }
      }
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed z-40 bottom-24 end-4 w-14 h-14 rounded-full bg-[#0B2345] text-[#D4AF37] shadow-xl flex items-center justify-center hover:scale-105 transition-transform"
        aria-label={isRtl ? 'Schoolix Helper' : 'Schoolix Helper'}
      >
        <MessageCircle size={24} />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            className="fixed z-50 bottom-40 end-4 w-[min(92vw,22rem)] rounded-2xl border border-[#0B2345]/15 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[70vh]"
          >
            <div className="flex items-center justify-between px-3 py-2.5 bg-[#0B2345] text-white">
              <div>
                <p className="text-sm font-black">Schoolix Helper</p>
                <p className="text-[10px] opacity-75">{isRtl ? 'مساعد قواعد — بدون ذكاء اصطناعي' : 'Rule-based helper'}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="p-1" aria-label="close">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 text-sm">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-xl px-3 py-2 ${
                    m.from === 'user'
                      ? 'bg-[#D4AF37]/20 text-[#0B2345] ms-8'
                      : 'bg-[#0B2345]/5 text-[#0B2345] me-8'
                  }`}
                >
                  {m.text}
                </div>
              ))}
            </div>

            <div className="px-2 pb-2 flex flex-wrap gap-1">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => send(p)}
                  className="text-[10px] font-bold rounded-full border border-[#0B2345]/15 px-2 py-1"
                >
                  {p}
                </button>
              ))}
            </div>

            <form
              className="flex items-center gap-1 border-t border-[#0B2345]/10 p-2"
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isRtl ? 'اكتب سؤالك...' : 'Ask a question...'}
                className="flex-1 text-sm px-2 py-2 outline-none bg-transparent"
              />
              <button type="submit" className="p-2 text-[#0B2345]" aria-label="send">
                <SendHorizontal size={16} />
              </button>
            </form>

            <div className="px-3 pb-3 flex gap-2 text-[10px] font-bold">
              <a href={contact.whatsapp} target="_blank" rel="noopener noreferrer" className="text-emerald-700">
                WhatsApp
              </a>
              <a href={`mailto:${contact.email}`} className="text-[#0B2345]">
                {contact.email}
              </a>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
