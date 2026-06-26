import type { RefObject } from 'react';

export function scheduleChatScrollToBottom(
  containerRef: RefObject<HTMLElement | null>,
  endRef: RefObject<HTMLElement | null>,
  options: { smooth?: boolean; rafRef: { current: number | null } },
): void {
  if (options.rafRef.current != null) {
    cancelAnimationFrame(options.rafRef.current);
  }
  options.rafRef.current = requestAnimationFrame(() => {
    options.rafRef.current = null;
    console.info('[ChatFreeze] SCROLL_TO_BOTTOM');
    const container = containerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: options.smooth ? 'smooth' : 'auto',
      });
      return;
    }
    endRef.current?.scrollIntoView({
      behavior: options.smooth ? 'smooth' : 'auto',
      block: 'end',
    });
  });
}

export function cancelChatScroll(rafRef: { current: number | null }): void {
  if (rafRef.current != null) {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }
}
