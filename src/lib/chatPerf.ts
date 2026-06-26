/** Chat open / first-paint performance markers (console + window snapshot). */

export type ChatPerfMark =
  | 'tab_mount'
  | 'contacts_loaded'
  | 'messages_first_snapshot'
  | 'first_paint';

type PerfEntry = {
  mark: ChatPerfMark;
  tab: string;
  atMs: number;
  sinceTabMountMs: number;
  detail?: Record<string, unknown>;
};

type RenderEntry = {
  id: string;
  phase: string;
  actualDuration: number;
  atMs: number;
};

export type ChatPerfSnapshot = {
  tab: string | null;
  tabMountAtMs: number | null;
  marks: PerfEntry[];
  renderCount: number;
  renders: RenderEntry[];
  listenerCount: number;
};

declare global {
  interface Window {
    __SCHOOLIX_CHAT_PERF__?: ChatPerfSnapshot;
  }
}

let activeTab: string | null = null;
let tabMountAtMs: number | null = null;
const marks: PerfEntry[] = [];
let renderCount = 0;
const renders: RenderEntry[] = [];
let listenerCount = 0;

function syncWindow(): void {
  if (typeof window === 'undefined') return;
  window.__SCHOOLIX_CHAT_PERF__ = {
    tab: activeTab,
    tabMountAtMs,
    marks: [...marks],
    renderCount,
    renders: [...renders],
    listenerCount,
  };
}

export function resetChatPerf(tab: string): void {
  activeTab = tab;
  tabMountAtMs = performance.now();
  marks.length = 0;
  renderCount = 0;
  renders.length = 0;
  markChatPerf('tab_mount', tab);
  syncWindow();
}

export function markChatPerf(
  mark: ChatPerfMark,
  tab: string,
  detail?: Record<string, unknown>,
): void {
  const atMs = performance.now();
  const sinceTabMountMs =
    tabMountAtMs != null ? Math.round(atMs - tabMountAtMs) : 0;
  const entry: PerfEntry = { mark, tab, atMs, sinceTabMountMs, detail };
  marks.push(entry);
  console.info('[ChatPerf]', mark, { tab, sinceTabMountMs, ...detail });
  syncWindow();

  if (mark === 'messages_first_snapshot') {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        markChatPerf('first_paint', tab, detail);
      });
    });
  }
}

export function recordChatRender(
  id: string,
  phase: string,
  actualDuration: number,
): void {
  renderCount += 1;
  renders.push({
    id,
    phase,
    actualDuration: Math.round(actualDuration * 100) / 100,
    atMs: performance.now(),
  });
  if (renderCount <= 20 || renderCount % 10 === 0) {
    console.info('[ChatPerf] render', { id, phase, actualDuration, renderCount });
  }
  syncWindow();
}

export function openChatSnapshotListener(label: string): () => void {
  listenerCount += 1;
  console.info('[ChatPerf] listener_open', { label, listenerCount });
  syncWindow();
  let closed = false;
  return () => {
    if (closed) return;
    closed = true;
    listenerCount = Math.max(0, listenerCount - 1);
    console.info('[ChatPerf] listener_close', { label, listenerCount });
    syncWindow();
  };
}

export function getChatPerfSnapshot(): ChatPerfSnapshot {
  return {
    tab: activeTab,
    tabMountAtMs,
    marks: [...marks],
    renderCount,
    renders: [...renders],
    listenerCount,
  };
}
