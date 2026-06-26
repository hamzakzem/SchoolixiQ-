/** Diagnostics + safety when entering full-screen chat. UI only. */

export function logChatBodyClasses(): void {
  if (typeof document === 'undefined') return;
  console.info('[ChatFreeze] BODY_CLASSES', {
    html: document.documentElement.className,
    body: document.body.className,
    drawerOpen:
      document.documentElement.classList.contains('sx-drawer-open') ||
      document.body.classList.contains('sx-drawer-open'),
  });
}

export function clearStuckDrawerBodyLock(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.remove('sx-drawer-open');
  document.body.classList.remove('sx-drawer-open');
  const portal = document.getElementById('sx-app-drawer-portal');
  portal?.classList.remove('sx-app-drawer-portal--active');
}

export function enterChatMode(source: string): void {
  console.info('[ChatFreeze] ENTER_CHAT', { source });
  clearStuckDrawerBodyLock();
  logChatBodyClasses();
}

export function leaveChatMode(source: string): void {
  console.info('[ChatFreeze] LEAVE_CHAT', { source });
  logChatBodyClasses();
}

export function logChatInteractionOk(detail?: Record<string, unknown>): void {
  console.info('[ChatFreeze] INTERACTION_OK', detail ?? {});
}
