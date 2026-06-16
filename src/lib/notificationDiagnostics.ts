/** Developer-only notification logs — never log raw tokens or secrets. */

type Meta = Record<string, unknown>;

function safeMeta(meta?: Meta): Meta {
  if (!meta) return {};
  const out: Meta = {};
  for (const [k, v] of Object.entries(meta)) {
    if (/token|secret|key|password|vapid/i.test(k)) continue;
    if (k === 'tokenPrefix' && typeof v === 'string') {
      out[k] = v;
      continue;
    }
    out[k] = v;
  }
  return out;
}

export const notificationDiag = {
  tokenRegistered(meta?: Meta) {
    console.info('[Notifications] TOKEN_REGISTERED', safeMeta(meta));
  },
  tokenMissing(meta?: Meta) {
    console.info('[Notifications] TOKEN_MISSING', safeMeta(meta));
  },
  pushSendStart(meta?: Meta) {
    console.info('[Notifications] PUSH_SEND_START', safeMeta(meta));
  },
  pushSendSuccess(meta?: Meta) {
    console.info('[Notifications] PUSH_SEND_SUCCESS', safeMeta(meta));
  },
  pushSendSkipped(meta?: Meta) {
    console.info('[Notifications] PUSH_SEND_SKIPPED', safeMeta(meta));
  },
  pushSendError(meta?: Meta) {
    console.error('[Notifications] PUSH_SEND_ERROR', safeMeta(meta));
  },
  centerRender(meta?: Meta) {
    console.info('[Notifications] CENTER_RENDER', safeMeta(meta));
  },
  clickRoute(meta?: Meta) {
    console.info('[Notifications] CLICK_ROUTE', safeMeta(meta));
  },
};
