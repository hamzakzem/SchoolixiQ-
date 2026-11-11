// The push listener must keep ONE retry chain, however long Firebase credentials are missing, and recover when they appear.
// Pure simulation on a virtual clock (no network, no Firebase): runs the REAL setupNotificationPushListener and, for the
// "before" numbers, a verbatim copy of the previous implementation.      npx tsx scripts/e2e/push-listener-retry.test.ts
import { setupNotificationPushListener, pushListenerStatus } from '../../notificationPushDispatch.ts';

let pass = 0, fail = 0;
const out = (s: string) => process.stdout.write(s + '\n');
const T = (n: string, c: boolean, i = '') => { out(`${c ? 'PASS' : 'FAIL'} ${n} ${i}`); c ? pass++ : fail++; };

// ── virtual clock ────────────────────────────────────────────────────────────────────────────────────────
type Timer = { id: number; at: number; fn: () => void; every?: number; app: boolean; unref: () => Timer; ref: () => Timer };
class Clock {
  now = 1_700_000_000_000; seq = 0; timers = new Map<number, Timer>();
  // app=true: timers created by the code under test through the global setTimeout/setInterval; app=false: the fake SDK's own delivery timers
  set(fn: () => void, ms: number, every?: number, app = false) {
    const t: Timer = { id: ++this.seq, at: this.now + Math.max(0, ms), fn, every, app, unref() { return t; }, ref() { return t; } };
    this.timers.set(t.id, t); return t;
  }
  clear(t: Timer | undefined) { if (t) this.timers.delete(t.id); }
  /** retry/backoff timers owned by the code under test (setTimeout only) */
  pendingTimeouts() { return [...this.timers.values()].filter((t) => !t.every && t.app).length; }
  advance(ms: number, onTick?: () => void) {
    const end = this.now + ms;
    for (;;) {
      const next = [...this.timers.values()].sort((a, b) => a.at - b.at || a.id - b.id)[0];
      if (!next || next.at > end) break;
      this.now = next.at;
      if (next.every) next.at += next.every; else this.timers.delete(next.id);
      next.fn();
      onTick?.();
    }
    this.now = end;
  }
}
const real = { setTimeout: globalThis.setTimeout, setInterval: globalThis.setInterval, clearTimeout: globalThis.clearTimeout, clearInterval: globalThis.clearInterval, now: Date.now, log: console.log, warn: console.warn, error: console.error, info: console.info };
function installClock(c: Clock) {
  (globalThis as any).setTimeout = (fn: () => void, ms = 0) => c.set(fn, ms, undefined, true);
  (globalThis as any).setInterval = (fn: () => void, ms = 0) => c.set(fn, ms, ms, true);
  (globalThis as any).clearTimeout = (t: Timer) => c.clear(t);
  (globalThis as any).clearInterval = (t: Timer) => c.clear(t);
  Date.now = () => c.now;
  console.log = console.warn = console.error = console.info = () => {};
}
function restoreClock() {
  Object.assign(globalThis, { setTimeout: real.setTimeout, setInterval: real.setInterval, clearTimeout: real.clearTimeout, clearInterval: real.clearInterval });
  Date.now = real.now; console.log = real.log; console.warn = real.warn; console.error = real.error; console.info = real.info;
}

// ── fake Firestore + Admin ───────────────────────────────────────────────────────────────────────────
type Mode = 'nocreds' | 'ok' | 'syncfail';
function makeEnv(clock: Clock) {
  const state = { mode: 'nocreds' as Mode, attaches: 0, live: 0, maxLive: 0, listeners: [] as Array<{ err: (e: Error) => void; dead: boolean }> };
  const noCreds = () => Object.assign(new Error('Unable to detect a Project Id in the current environment.'), { code: undefined });
  const db: any = {};
  // the sweep uses where().orderBy().limit().get()
  db.collection = () => ({
    where: () => ({
      onSnapshot: (db as any)._onSnapshot,
      orderBy: () => ({ limit: () => ({ get: async () => { if (state.mode === 'ok') return { docs: [] }; throw noCreds(); } }) }),
    }),
  });
  const onSnapshot = (next: (s: any) => void, err: (e: Error) => void) => {
    state.attaches += 1;
    const l = { err, dead: false };
    if (state.mode === 'syncfail') { err(noCreds()); return () => {}; }
    state.live += 1; state.maxLive = Math.max(state.maxLive, state.live); state.listeners.push(l);
    if (state.mode === 'nocreds') clock.set(() => { if (!l.dead) { l.dead = true; state.live -= 1; err(noCreds()); } }, 5000);
    else clock.set(() => { if (!l.dead) next({ docChanges: () => [] }); }, 1000);
    return () => { if (!l.dead) { l.dead = true; state.live -= 1; } };
  };
  (db as any)._onSnapshot = onSnapshot;
  const adminSdk: any = { firestore: { Timestamp: { fromMillis: (n: number) => ({ toMillis: () => n }) } } };
  return { db, adminSdk, state };
}
const resetStatus = () => Object.assign(pushListenerStatus, { startedAt: null, listenerAttached: false, restarts: 0, lastErrorAt: null, lastError: null, lastSweepAt: null, lastSweepOk: null, pendingRetryTimers: 0, attachAttempts: 0 });

// ── the PREVIOUS implementation, verbatim logic (commit 1f350cb), for the "before" numbers ─────────────────────
function legacySetup(db: any, adminSdk: any, status: { restarts: number }) {
  let unsub: (() => void) | null = null; let stopped = false; let backoff = 1000; let recycleTimer: any = null;
  const start = () => {
    if (stopped) return;
    try { unsub?.(); } catch { /* ignore */ }
    const cutoff = adminSdk.firestore.Timestamp.fromMillis(Date.now() - 10 * 60 * 1000);
    unsub = db.collection('notifications').where('createdAt', '>=', cutoff).onSnapshot(
      () => { backoff = 1000; },
      () => { status.restarts += 1; setTimeout(start, backoff); backoff = Math.min(backoff * 2, 60_000); },
    );
  };
  start();
  recycleTimer = setInterval(start, 30 * 60 * 1000);
  return () => { stopped = true; clearInterval(recycleTimer); try { unsub?.(); } catch { /* ignore */ } };
}

const HOUR = 3_600_000, MIN = 60_000;
function simulate(kind: 'legacy' | 'new', hours: number) {
  const clock = new Clock(); installClock(clock); resetStatus();
  const env = makeEnv(clock); const legacyStatus = { restarts: 0 };
  const stop = kind === 'legacy' ? legacySetup(env.db, env.adminSdk, legacyStatus) : setupNotificationPushListener(env.db, env.adminSdk);
  const perHour: number[] = []; let maxPending = 0; let maxStatusPending = 0; let last = 0;
  for (let h = 0; h < hours; h++) {
    clock.advance(HOUR, () => { maxPending = Math.max(maxPending, clock.pendingTimeouts()); maxStatusPending = Math.max(maxStatusPending, pushListenerStatus.pendingRetryTimers); });
    perHour.push(env.state.attaches - last); last = env.state.attaches;
  }
  const result = { attaches: env.state.attaches, perHour, maxPending, maxStatusPending, restarts: kind === 'legacy' ? legacyStatus.restarts : pushListenerStatus.restarts };
  stop(); restoreClock();
  return result;
}

try {
  // ── 1. before / after: 13 hours without credentials (what production has been doing) ───────────────────
  const before = simulate('legacy', 13);
  const after = simulate('new', 13);
  out(`   BEFORE (legacy): attach attempts=${before.attaches}, max concurrent retry timers=${before.maxPending}, attempts per hour=[${before.perHour.join(', ')}]`);
  out(`   AFTER  (fixed) : attach attempts=${after.attaches}, max concurrent retry timers=${after.maxPending}, attempts per hour=[${after.perHour.join(', ')}]`);
  T('legacy: several retry chains run at once (concurrent retry timers ≥ 2) and the attempt rate settles ≥ 2× the single-chain rate', before.maxPending >= 2 && before.perHour[12] >= after.perHour[12] * 2, `legacy timers=${before.maxPending}, ${before.perHour[12]}/h vs ${after.perHour[12]}/h`);
  T('fixed: never more than ONE retry timer (virtual clock count and status counter agree)', after.maxPending <= 1 && after.maxStatusPending <= 1, `pending=${after.maxPending}/${after.maxStatusPending}`);
  T('fixed: attempt rate is constant over 13 h (last hour within ±15% of the first)', Math.abs(after.perHour[12] - after.perHour[0]) <= after.perHour[0] * 0.15 + 1, `${after.perHour[0]} vs ${after.perHour[12]}`);
  T('fixed: total attempts bounded (≈ one per ~65 s: ≤ 13 h × 60 / 1)', after.attaches <= 13 * 60 && after.attaches >= 13 * 40, String(after.attaches));
  T('fixed: far fewer attempts than legacy over the same period (≤ half)', after.attaches * 2 <= before.attaches, `${after.attaches} vs ${before.attaches}`);

  // ── 2. credentials missing for hours, then they appear: automatic recovery, no leftovers ───────────────
  {
    const clock = new Clock(); installClock(clock); resetStatus();
    const env = makeEnv(clock);
    const stop = setupNotificationPushListener(env.db, env.adminSdk);
    let maxPending = 0; const watch = () => { maxPending = Math.max(maxPending, clock.pendingTimeouts()); };
    clock.advance(2 * HOUR, watch);
    const attemptsBefore = env.state.attaches;
    const failing = pushListenerStatus.listenerAttached === false && pushListenerStatus.restarts > 50;
    env.state.mode = 'ok'; // credentials appear
    clock.advance(2 * MIN, watch);
    const recovered = pushListenerStatus.listenerAttached === true && env.state.live === 1 && pushListenerStatus.pendingRetryTimers === 0 && clock.pendingTimeouts() === 0;
    const attachesAtRecovery = env.state.attaches;
    clock.advance(3 * HOUR + 5 * MIN, watch);
    const recycles = env.state.attaches - attachesAtRecovery;
    const s = { failing, recovered, maxPending, live: env.state.live, maxLive: env.state.maxLive, recycles, pendingNow: clock.pendingTimeouts(), attempts2h: attemptsBefore };
    stop(); restoreClock();
    T('2h without credentials: failing as expected, one retry chain', s.failing && s.maxPending <= 1, JSON.stringify({ failing: s.failing, maxPending: s.maxPending }));
    T('credentials appear → listener attaches by itself within 2 minutes, retry timer gone, exactly one live listener', s.recovered, JSON.stringify(s));
    T('healthy for 3 h: only the periodic window refresh (≈ every 30 min), never more than one live listener, no retry timers', s.recycles >= 5 && s.recycles <= 7 && s.maxLive === 1 && s.pendingNow === 0, `recycles=${s.recycles} maxLive=${s.maxLive}`);
  }

  // ── 3. healthy → error → credentials missing again → back ───────────────────────────────────────────
  {
    const clock = new Clock(); installClock(clock); resetStatus();
    const env = makeEnv(clock); env.state.mode = 'ok';
    const stop = setupNotificationPushListener(env.db, env.adminSdk);
    clock.advance(10 * MIN);
    const healthy = pushListenerStatus.listenerAttached && env.state.live === 1;
    env.state.mode = 'nocreds';
    const active = env.state.listeners.find((l) => !l.dead)!; active.dead = true; env.state.live -= 1; active.err(new Error('stream died')); // the live stream fails
    let maxPending = 0;
    clock.advance(3 * HOUR, () => { maxPending = Math.max(maxPending, clock.pendingTimeouts()); });
    const during = { maxPending, attached: pushListenerStatus.listenerAttached };
    env.state.mode = 'ok';
    clock.advance(2 * MIN);
    const back = pushListenerStatus.listenerAttached && env.state.live === 1 && clock.pendingTimeouts() === 0;
    stop(); restoreClock();
    T('a healthy listener that fails, then credentials vanish for 3 h: still ONE retry chain', healthy && during.maxPending <= 1 && !during.attached, JSON.stringify(during));
    T('…and it comes back by itself when credentials return', back);
  }

  // ── 4. a replaced listener's late error cannot start a second chain ──────────────────────────────────
  {
    const clock = new Clock(); installClock(clock); resetStatus();
    const env = makeEnv(clock); env.state.mode = 'ok';
    const stop = setupNotificationPushListener(env.db, env.adminSdk);
    clock.advance(5 * MIN);
    const old = env.state.listeners[0];
    clock.advance(31 * MIN); // the periodic refresh replaced it
    const attachesBefore = env.state.attaches;
    old.err(new Error('late error from a replaced listener'));
    clock.advance(10 * MIN);
    const ok = env.state.attaches === attachesBefore && pushListenerStatus.pendingRetryTimers === 0 && clock.pendingTimeouts() === 0 && env.state.live === 1;
    stop(); restoreClock();
    T('late error from a replaced (old-generation) listener is ignored: no retry timer, no extra attach, one live listener', ok);
  }

  // ── 5. onSnapshot failing synchronously does not wedge the lifecycle ───────────────────────────────────
  {
    const clock = new Clock(); installClock(clock); resetStatus();
    const env = makeEnv(clock); env.state.mode = 'syncfail';
    const stop = setupNotificationPushListener(env.db, env.adminSdk);
    let maxPending = 0;
    clock.advance(30 * MIN, () => { maxPending = Math.max(maxPending, clock.pendingTimeouts()); });
    const stuck = pushListenerStatus.pendingRetryTimers === 1 || clock.pendingTimeouts() === 1;
    env.state.mode = 'ok';
    clock.advance(2 * MIN);
    const recovered = pushListenerStatus.listenerAttached && env.state.live === 1;
    stop(); restoreClock();
    T('synchronous listener failures: one retry timer at a time, and recovery works afterwards', maxPending <= 1 && stuck && recovered, `maxPending=${maxPending}`);
  }

  // ── 6. stopping cleans everything ─────────────────────────────────────────────────────────────────
  {
    const clock = new Clock(); installClock(clock); resetStatus();
    const env = makeEnv(clock);
    const stop = setupNotificationPushListener(env.db, env.adminSdk);
    clock.advance(20 * MIN);
    stop();
    const attachesAtStop = env.state.attaches;
    clock.advance(5 * HOUR);
    const clean = env.state.attaches === attachesAtStop && pushListenerStatus.pendingRetryTimers === 0 && env.state.live === 0;
    restoreClock();
    T('after stop(): no retry, no refresh, no listener, no timers', clean);
  }
} finally {
  restoreClock();
}
out(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
