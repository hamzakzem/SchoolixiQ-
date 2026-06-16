/** UI-only chat helpers — no Firestore / schema coupling */

import type { ReactNode } from 'react';

export type FlatMessage = {
  id: string;
  content: string;
  createdAt?: unknown;
  raw: Record<string, unknown>;
  dateKey: string;
};

export function flattenGroupedMessages(
  grouped: Record<string, unknown[]>,
): FlatMessage[] {
  const out: FlatMessage[] = [];
  for (const [dateKey, msgs] of Object.entries(grouped)) {
    for (const msg of msgs as Record<string, unknown>[]) {
      out.push({
        id: String(msg.id ?? Math.random()),
        content: String(msg.content ?? ''),
        createdAt: msg.createdAt,
        raw: msg,
        dateKey,
      });
    }
  }
  return out;
}

export function highlightText(text: string, query: string): ReactNode {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="sx-chat-highlight">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

export function truncatePreview(text: string, max = 80): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export const QUICK_EMOJIS = ['😀', '👍', '❤️', '✅', '🙏', '🎉'] as const;
