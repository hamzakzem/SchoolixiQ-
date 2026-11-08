import { useEffect, useRef } from 'react';
import type { ChatShellContact } from '../components/chat/SchoolixChatShell';
import { peekChatFocus, subscribeChatFocus, takeChatFocus, type ChatFocusTarget } from '../lib/chatFocus';

/** Which contact a "open conversation" request (from a notification) points at. */
export function matchChatFocus(contacts: ChatShellContact[], focus: ChatFocusTarget): ChatShellContact | undefined {
  const extraOf = (c: ChatShellContact) => (c.extra || {}) as Record<string, unknown>;
  const byId = contacts.find(
    (c) =>
      (focus.senderId && c.id === focus.senderId) ||
      (focus.conversationId && extraOf(c).conversationId === focus.conversationId),
  );
  if (byId) return byId;
  // Platform administration writing to a school: the school's "support" contact.
  if (focus.conversationId?.startsWith('superadmin')) {
    const support = contacts.find((c) => c.id === 'super_admin');
    if (support) return support;
  }
  // Super admin list: schools are keyed by school id.
  if (focus.schoolId) {
    const school = contacts.find((c) => c.id === focus.schoolId || extraOf(c).schoolId === focus.schoolId);
    if (school && (school.type === 'school' || !school.type)) return school;
  }
  // Teacher/parent receiving from the school administration.
  return contacts.find((c) => c.type === 'admin');
}

/**
 * Open the thread a message notification pointed at, as soon as the contact list has it.
 * `contacts` should be the full (unfiltered) list shown in the chat sidebar.
 */
export function useChatFocusSelection(
  contacts: ChatShellContact[],
  select: (contact: ChatShellContact) => void,
): void {
  const selectRef = useRef(select);
  selectRef.current = select;
  const contactsRef = useRef(contacts);
  contactsRef.current = contacts;

  useEffect(() => {
    const apply = () => {
      const focus = peekChatFocus();
      if (!focus || contactsRef.current.length === 0) return;
      const target = matchChatFocus(contactsRef.current, focus);
      if (!target) return;
      takeChatFocus();
      selectRef.current(target);
    };
    apply();
    return subscribeChatFocus(apply);
  }, [contacts.length]);
}
