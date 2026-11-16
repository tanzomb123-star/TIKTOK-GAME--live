// Read-only adapter for the UNOFFICIAL tiktok-live-connector library.
// It never logs in, never sends chat, never uses your account cookies. See docs/compliance.md.
import fs from 'node:fs';
import path from 'node:path';

const asStr = (v) => (v === undefined || v === null ? '' : String(v));

function who(user) {
  if (!user || typeof user !== 'object') return null;
  const userId = asStr(user.uniqueId || user.userId || user.displayId || user.nickname);
  if (!userId) return null;
  return { userId, nickname: asStr(user.nickname || user.uniqueId || userId) };
}

// Accepts both the current (content/count/gift) and legacy (comment/likeCount/giftDetails) shapes.
export function normalize(raw, kind) {
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
      const streakable = (g.type ?? g.giftType) === 1;
      if (streakable && !raw.repeatEnd) return null; // streak still running; count it once at the end
      const each = Number(g.diamondCount);
      if (!(each > 0)) return null;
      return { type: 'gift', ...w, diamonds: each * Math.max(Number(raw.repeatCount) || 1, 1) };
    }
    case 'member':
      return { type: 'join', ...w };
    default:
      return null;
  }
}

function appendLog(file, event) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, JSON.stringify({ t: Date.now(), ...event }) + '\n');
  } catch { /* logging must never break the game */ }
}

// Returns a stop function. Retries every 10s when the connection drops.
export function startTikTok(username, emit, { logFile = 'logs/events.jsonl', retryMs = 10000, toLog = (e) => e } = {}) {
  let stopped = false;
  let conn;
  let timer;

  const handle = (kind) => (raw) => {
    const e = normalize(raw, kind);
    if (!e) return;
    appendLog(logFile, toLog(e));
    emit(e);
  };

  const connect = async () => {
    if (stopped) return;
    const { TikTokLiveConnection, WebcastEvent, ControlEvent } = await import('tiktok-live-connector');
    conn = new TikTokLiveConnection(username, { processInitialData: false });
    conn.on(WebcastEvent.CHAT, handle('chat'));
    conn.on(WebcastEvent.LIKE, handle('like'));
    conn.on(WebcastEvent.GIFT, handle('gift'));
    conn.on(WebcastEvent.MEMBER, handle('member'));
    conn.on(ControlEvent.DISCONNECTED, () => retry('disconnected'));
    conn.on(ControlEvent.ERROR, ({ info } = {}) => console.error('TikTok error:', info));
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
