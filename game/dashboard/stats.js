// Streamer-only live statistics. Pure functions, in-memory only (nothing is saved unless you export CSV).

const UNKNOWN_GIFT = '(ไม่ทราบชื่อ)';

export function createStats(nowMs, { feedSize = 200, keep = 20000 } = {}) {
  return {
    startedAt: nowMs,
    demo: false,
    totals: { diamonds: 0, gifts: 0, comments: 0, likes: 0, joins: 0, follows: 0, shares: 0 },
    viewers: { now: 0, peak: 0 },
    users: Object.create(null),   // null prototype: viewer ids like '__proto__' are plain keys
    gifts: Object.create(null),
    feed: [],
    all: [],
    feedSize,
    keep,
  };
}

function user(s, e) {
  const id = String(e.userId);
  return (s.users[id] ||= { userId: id, nickname: e.nickname || id, diamonds: 0, gifts: 0, comments: 0, likes: 0 });
}

const n = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 0);

export function addEvent(s, e, nowMs) {
  if (!e || typeof e !== 'object') return false;
  const t = s.totals;
  switch (e.type) {
    case 'comment': t.comments += 1; user(s, e).comments += 1; break;
    case 'like': { const c = n(e.count); t.likes += c; user(s, e).likes += c; break; }
    case 'gift': {
      const d = n(e.diamonds);
      t.diamonds += d; t.gifts += 1;
      const u = user(s, e); u.diamonds += d; u.gifts += 1;
      const name = e.giftName || UNKNOWN_GIFT;
      const g = (s.gifts[name] ||= { name, count: 0, diamonds: 0 });
      g.count += 1; g.diamonds += d;
      break;
    }
    case 'join': t.joins += 1; break;
    case 'follow': t.follows += 1; break;
    case 'share': t.shares += 1; break;
    case 'viewers': {
      s.viewers.now = n(e.count);
      s.viewers.peak = Math.max(s.viewers.peak, s.viewers.now);
      return true; // not part of the feed
    }
    default: return false;
  }
  if (e.mock) s.demo = true;
  const row = { t: nowMs, ...e };
  s.feed.unshift(row);
  if (s.feed.length > s.feedSize) s.feed.length = s.feedSize;
  s.all.push(row);
  if (s.all.length > s.keep) s.all.shift();
  return true;
}

export function topBy(s, key, limit) {
  return Object.values(s.users).filter((u) => u[key] > 0).sort((a, b) => b[key] - a[key]).slice(0, limit);
}

export function giftsByName(s) {
  return Object.values(s.gifts).sort((a, b) => b.diamonds - a.diamonds || b.count - a.count);
}

// Quotes every text cell and defuses spreadsheet formulas (=, +, -, @).
const cell = (v) => {
  if (v === undefined || v === null) return '';
  let str = String(v);
  if (/^[=+\-@]/.test(str)) str = `'${str}`;
  return /[",\n\r']/.test(str) || typeof v === 'string' ? `"${str.replace(/"/g, '""')}"` : str;
};

export function toCsv(s) {
  const head = 'time,type,nickname,user_id,text,gift,diamonds,count';
  const rows = s.all.map((r) =>
    [new Date(r.t).toISOString(), r.type, r.nickname, r.userId, r.text, r.giftName, r.diamonds, r.count].map(cell).join(','),
  );
  return [head, ...rows].join('\n') + '\n';
}
