import { describe, it, expect } from 'vitest';
import { createStats, addEvent, topBy, giftsByName, toCsv } from '../game/dashboard/stats.js';
import { normalize } from '../server/tiktok.js';

const ev = (type, userId, extra = {}) => ({ type, userId, nickname: `N-${userId}`, ...extra });

describe('dashboard stats', () => {
  it('counts every kind of event', () => {
    const s = createStats(0);
    addEvent(s, ev('comment', 'a', { text: 'hi' }), 1000);
    addEvent(s, ev('like', 'a', { count: 7 }), 1000);
    addEvent(s, ev('gift', 'b', { diamonds: 5, giftName: 'Rose' }), 2000);
    addEvent(s, ev('gift', 'b', { diamonds: 100, giftName: 'Rocket' }), 2000);
    addEvent(s, ev('join', 'c'), 3000);
    addEvent(s, ev('follow', 'c'), 3000);
    addEvent(s, ev('share', 'c'), 3000);
    expect(s.totals).toEqual({ diamonds: 105, gifts: 2, comments: 1, likes: 7, joins: 1, follows: 1, shares: 1 });
  });
  it('tracks current and peak viewers', () => {
    const s = createStats(0);
    addEvent(s, { type: 'viewers', count: 12 }, 0);
    addEvent(s, { type: 'viewers', count: 30 }, 0);
    addEvent(s, { type: 'viewers', count: 18 }, 0);
    expect(s.viewers).toEqual({ now: 18, peak: 30 });
  });
  it('ranks people by diamonds, comments or likes', () => {
    const s = createStats(0);
    addEvent(s, ev('gift', 'a', { diamonds: 5, giftName: 'Rose' }), 0);
    addEvent(s, ev('gift', 'b', { diamonds: 50, giftName: 'Star' }), 0);
    addEvent(s, ev('comment', 'a', { text: '1' }), 0);
    addEvent(s, ev('comment', 'a', { text: '2' }), 0);
    expect(topBy(s, 'diamonds', 5).map((u) => u.nickname)).toEqual(['N-b', 'N-a']);
    expect(topBy(s, 'comments', 5).map((u) => [u.nickname, u.comments])).toEqual([['N-a', 2]]);
  });
  it('groups gifts by name', () => {
    const s = createStats(0);
    for (let i = 0; i < 3; i++) addEvent(s, ev('gift', 'a', { diamonds: 1, giftName: 'Rose' }), 0);
    addEvent(s, ev('gift', 'b', { diamonds: 100, giftName: 'Rocket' }), 0);
    addEvent(s, ev('gift', 'c', { diamonds: 2 }), 0);
    expect(giftsByName(s)).toEqual([
      { name: 'Rocket', count: 1, diamonds: 100 },
      { name: 'Rose', count: 3, diamonds: 3 },
      { name: '(ไม่ทราบชื่อ)', count: 1, diamonds: 2 },
    ]);
  });
  it('keeps the live feed newest-first and capped', () => {
    const s = createStats(0, { feedSize: 3 });
    for (let i = 0; i < 5; i++) addEvent(s, ev('comment', `u${i}`, { text: `m${i}` }), i);
    expect(s.feed.map((e) => e.text)).toEqual(['m4', 'm3', 'm2']);
  });
  it('flags demo data', () => {
    const s = createStats(0);
    addEvent(s, { ...ev('comment', 'a', { text: 'x' }), mock: true }, 0);
    expect(s.demo).toBe(true);
  });
  it('ignores junk and is safe with ids like __proto__', () => {
    const s = createStats(0);
    for (const bad of [null, 5, {}, { type: 'weird' }]) addEvent(s, bad, 0);
    addEvent(s, ev('gift', '__proto__', { diamonds: 3, giftName: '__proto__' }), 0);
    expect({}.diamonds).toBeUndefined();
    expect(s.totals.diamonds).toBe(3);
    expect(topBy(s, 'diamonds', 1)[0].nickname).toBe('N-__proto__');
  });
  it('exports CSV with a header, quoting commas, quotes and formula-like cells', () => {
    const s = createStats(0);
    addEvent(s, ev('comment', 'a', { text: 'hello, "world"' }), Date.UTC(2026, 10, 16, 10, 0, 0));
    addEvent(s, ev('comment', 'b', { text: '=HYPERLINK("x")' }), Date.UTC(2026, 10, 16, 10, 0, 1));
    const lines = toCsv(s).trim().split('\n');
    expect(lines[0]).toBe('time,type,nickname,user_id,text,gift,diamonds,count');
    expect(lines[1]).toContain('"hello, ""world"""');
    expect(lines[2]).toContain(`"'=HYPERLINK(""x"")"`);
  });
});

describe('connector extras', () => {
  const user = { id: '9', nickname: 'Nine' };
  it('gift events carry the gift name', () => {
    expect(normalize({ user, repeatCount: 1, gift: { type: 2, diamondCount: 5, name: 'Rose' } }, 'gift').giftName).toBe('Rose');
  });
  it('roomUser becomes a viewers event (current and legacy shapes)', () => {
    expect(normalize({ total: '42' }, 'roomUser')).toEqual({ type: 'viewers', count: 42 });
    expect(normalize({ viewerCount: 7 }, 'roomUser')).toEqual({ type: 'viewers', count: 7 });
    expect(normalize({}, 'roomUser')).toBeNull();
  });
  it('follow and share events', () => {
    expect(normalize({ user }, 'follow')).toEqual({ type: 'follow', userId: '9', nickname: 'Nine' });
    expect(normalize({ user }, 'share').type).toBe('share');
  });
});

import { vi } from 'vitest';
import { startMock } from '../server/mock.js';

describe('mock feeds the dashboard', () => {
  it('sends named gifts, viewer counts, follows and shares', () => {
    vi.useFakeTimers();
    const events = [];
    const stop = startMock((e) => events.push(e), { minMs: 1, maxMs: 1 });
    vi.advanceTimersByTime(3000);
    stop();
    vi.useRealTimers();
    const types = new Set(events.map((e) => e.type));
    for (const t of ['viewers', 'follow', 'share', 'gift']) expect(types.has(t)).toBe(true);
    expect(events.filter((e) => e.type === 'gift').every((e) => typeof e.giftName === 'string')).toBe(true);
  });
});
