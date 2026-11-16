// Read-only adapter for the UNOFFICIAL tiktok-live-connector library.
// It never logs in, never sends chat, never uses your account cookies. See docs/compliance.md.
import fs from 'node:fs';
import path from 'node:path';

const asStr = (v) => (v === undefined || v === null ? '' : String(v));

function who(user) {
  if (!user || typeof user !== 'object') return null;
  // Stable numeric id first (current proto), legacy README fields as fallbacks; nickname only as a last resort.
  const userId = asStr(user.id || user.userId || user.uniqueId || user.displayId || user.nickname);
  if (!userId) return null;
  return { userId, nickname: asStr(user.nickname || user.displayId || user.uniqueId || userId) };
}

// Accepts both the current (content/count/gift) and legacy (comment/likeCount/giftDetails) shapes.
export function normalize(raw, kind, streaks = new Map()) {
  if (!raw || typeof raw !== 'object') return null;
  const w = who(raw.user);
  if (!w) return null;
  switch (kind) {
    case 'chat': {
      const text = raw.content ?? raw.comment;
      return typeof text === 'string' ? { type: 'comment', ...w, text } : null;
    }
    case 'like': {
      const count = Number(raw.count ?? raw.likeCount);
      return count > 0 ? { type: 'like', ...w, count } : null;
    }
    case 'gift': {
      const g = raw.gift ?? raw.giftDetails ?? {};
      const each = Number(g.diamondCount);
      if (!(each > 0)) return null;
      const count = Math.max(Number(raw.repeatCount) || 1, 1);
      if ((g.type ?? g.giftType) !== 1) return { type: 'gift', ...w, diamonds: each * count };
      // Streak gift: apply each new step immediately (so the effect shows at once) and ignore the closing duplicate.
      const key = `${w.userId}:${asStr(raw.groupId)}`;
      const delta = count - (streaks.get(key) || 0);
      if (raw.repeatEnd) streaks.delete(key);
      else {
        if (streaks.size > 1000) streaks.clear(); // streak-end events can be lost; never grow without bound
        streaks.set(key, count);
      }
      return delta > 0 ? { type: 'gift', ...w, diamonds: each * delta } : null;
    }
    case 'member':
      return { type: 'join', ...w };
    default:
      return null;
  }
}

// One file per UTC day, so the 7-day age-based prune in guard.js really deletes old records.
export function dailyLogName(nowMs) {
  return `events-${new Date(nowMs).toISOString().slice(0, 10)}.jsonl`;
}

function appendLog(dir, event) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(path.join(dir, dailyLogName(Date.now())), JSON.stringify({ t: Date.now(), ...event }) + '\n');
  } catch { /* logging must never break the game */ }
}

// Returns a stop function. Retries every 10s when the connection drops.
export function startTikTok(username, emit, { logDir = 'logs', retryMs = 10000, toLog = (e) => e, loadLib = () => import('tiktok-live-connector') } = {}) {
  let stopped = false;
  let conn;
  let timer;
  const streaks = new Map();

  const handle = (kind) => (raw) => {
    const e = normalize(raw, kind, streaks);
    if (!e) return;
    appendLog(logDir, toLog(e));
    emit(e);
  };

  const connect = async () => {
    if (stopped) return;
    let lib;
    try {
      lib = await loadLib();
    } catch (err) {
      retry(`library load failed: ${err?.message || err}`);
      return;
    }
    const { TikTokLiveConnection, WebcastEvent, ControlEvent } = lib;
    conn = new TikTokLiveConnection(username, { processInitialData: false });
    conn.on(WebcastEvent.CHAT, handle('chat'));
    conn.on(WebcastEvent.LIKE, handle('like'));
    conn.on(WebcastEvent.GIFT, handle('gift'));
    conn.on(WebcastEvent.MEMBER, handle('member'));
    conn.on(ControlEvent.DISCONNECTED, () => retry('disconnected'));
    conn.on(ControlEvent.ERROR, (err) => console.error('TikTok error:', err?.info ?? err?.message ?? err));
    try {
      await conn.connect();
      console.log(`Connected to TikTok live of @${username}`);
    } catch (err) {
      retry(`connect failed: ${err?.message || err}`);
    }
  };

  const retry = (why) => {
    if (stopped) return;
    console.error(`TikTok ${why}; retrying in ${retryMs / 1000}s`);
    clearTimeout(timer);
    timer = setTimeout(connect, retryMs);
  };

  connect();
  return () => {
    stopped = true;
    clearTimeout(timer);
    try { conn?.disconnect(); } catch { /* ignore */ }
  };
}
