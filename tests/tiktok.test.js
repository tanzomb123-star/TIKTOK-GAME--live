import { describe, it, expect } from 'vitest';
import { normalize, dailyLogName } from '../server/tiktok.js';

const user = { uniqueId: 'abc', nickname: 'Abc N', userId: '123' };

describe('normalize', () => {
  it('normalize maps chat to comment', () => {
    expect(normalize({ user, content: '1' }, 'chat')).toEqual({ type: 'comment', userId: 'abc', nickname: 'Abc N', text: '1' });
  });
  it('accepts the legacy chat shape (comment field)', () => {
    expect(normalize({ user, comment: '2' }, 'chat').text).toBe('2');
  });
  it('normalize maps like using count (and legacy likeCount)', () => {
    expect(normalize({ user, count: 3 }, 'like').count).toBe(3);
    expect(normalize({ user, likeCount: 4 }, 'like').count).toBe(4);
  });
  it('normalize maps gift using diamondCount*repeatCount', () => {
    const e = normalize({ user, repeatCount: 3, repeatEnd: 1, gift: { type: 1, diamondCount: 10 } }, 'gift');
    expect(e).toEqual({ type: 'gift', userId: 'abc', nickname: 'Abc N', diamonds: 30 });
  });
  it('ignores an in-progress streak step that adds nothing new', () => {
    const streaks = new Map();
    const step = { user, groupId: 'g', repeatCount: 2, repeatEnd: 0, gift: { type: 1, diamondCount: 10 } };
    expect(normalize(step, 'gift', streaks).diamonds).toBe(20);
    expect(normalize(step, 'gift', streaks)).toBeNull();
  });
  it('counts non-streak gifts immediately', () => {
    expect(normalize({ user, repeatCount: 1, repeatEnd: 0, gift: { type: 2, diamondCount: 5 } }, 'gift').diamonds).toBe(5);
  });
  it('normalize maps member to join', () => {
    expect(normalize({ user }, 'member').type).toBe('join');
  });
  it('normalize returns null for malformed input', () => {
    for (const raw of [null, undefined, {}, 5, 'x', { content: '1' }, { user: {}, content: '1' }]) {
      expect(normalize(raw, 'chat')).toBeNull();
    }
    expect(normalize({ user }, 'unknown-kind')).toBeNull();
  });
});

describe('streak gifts', () => {
  const rose = (n, end = 0, u = user, groupId = 'g1') => ({ user: u, repeatCount: n, repeatEnd: end, groupId, gift: { type: 1, diamondCount: 1 } });
  it('emits each new step of a streak immediately and ignores the final repeatEnd duplicate', () => {
    const streaks = new Map();
    const out = [1, 2, 3].map((n) => normalize(rose(n), 'gift', streaks));
    expect(out.map((e) => e.diamonds)).toEqual([1, 1, 1]);
    expect(normalize(rose(3, 1), 'gift', streaks)).toBeNull();
    expect(streaks.size).toBe(0);
  });
  it('a jump in repeatCount counts the whole difference', () => {
    const streaks = new Map();
    normalize(rose(1), 'gift', streaks);
    expect(normalize(rose(4), 'gift', streaks).diamonds).toBe(3);
  });
  it('streaks of different viewers are tracked separately', () => {
    const streaks = new Map();
    normalize(rose(2), 'gift', streaks);
    const other = { uniqueId: 'zzz', nickname: 'Z' };
    expect(normalize(rose(1, 0, other, 'g9'), 'gift', streaks).diamonds).toBe(1);
  });
  it('a single streakable gift sent once is counted once', () => {
    const streaks = new Map();
    expect(normalize(rose(1), 'gift', streaks).diamonds).toBe(1);
    expect(normalize(rose(1, 1), 'gift', streaks)).toBeNull();
  });
});

describe('dailyLogName', () => {
  it('uses one file per UTC day so the 7-day prune works', () => {
    expect(dailyLogName(Date.UTC(2026, 10, 16, 23, 59))).toBe('events-2026-11-16.jsonl');
  });
});
