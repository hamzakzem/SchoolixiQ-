/** Lets dashboard headers delegate back to the active chat tab (UI only). */

export type ChatBackHandler = () => boolean;

let activeChatBackHandler: ChatBackHandler | null = null;

export function registerChatBackHandler(handler: ChatBackHandler | null): void {
  activeChatBackHandler = handler;
}

export function invokeChatBack(): boolean {
  return activeChatBackHandler?.() ?? false;
}
