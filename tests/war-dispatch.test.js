import { describe, it, expect, vi, afterEach } from 'vitest';
import { warConfig as C } from '../game/war/config.js';
import { createWar } from '../game/war/state.js';
import { handleWarEvent } from '../game/war/dispatch.js';
import { createRateLimiter } from '../game/core/events.js';
import { startMock } from '../server/mock.js';

const ev = (type, userId, extra = {}) => ({ type, userId, nickname: userId, ...extra });
afterEach(() => vi.useRealTimers());

describe('handleWarEvent', () => {
  it('rate-limits ship commands per viewer (3/s)', () => {
    const w = createWar(C);
    const allow = createRateLimiter(3);
    const r = [0, 1, 2, 3].map((t) => handleWarEvent(w, ev('comment', 'u', { text: 'A' }), C, allow, t));
    expect(r).toEqual([true, true, true, false]);
  });
  it('ordinary chat does not use the allowance', () => {
    const w = createWar(C);
    const allow = createRateLimiter(1);
    handleWarEvent(w, ev('comment', 'u', { text: 'hello' }), C, allow, 0);
    expect(handleWarEvent(w, ev('comment', 'u', { text: 'A' }), C, allow, 1)).toBe(true);
  });
  it('likes and gifts are not rate limited; null and ended are ignored', () => {
    const w = createWar(C);
    const allow = createRateLimiter(1);
    handleWarEvent(w, ev('comment', 'u', { text: 'A' }), C, allow, 0);
    expect(handleWarEvent(w, ev('like', 'u', { count: 1 }), C, allow, 1)).toBe(true);
    expect(handleWarEvent(w, ev('gift', 'u', { diamonds: 5 }), C, allow, 2)).toBe(true);
    expect(handleWarEvent(w, null, C, allow, 3)).toBe(false);
    w.phase = 'ended';
    expect(handleWarEvent(w, ev('gift', 'u', { diamonds: 5 }), C, allow, 4)).toBe(false);
  });
});

describe('mock for team war', () => {
  it('emits only the given commands, and each mock viewer sticks to one team', () => {
    vi.useFakeTimers();
    const events = [];
    const stop = startMock((e) => events.push(e), { minMs: 1, maxMs: 1, commands: ['A', 'B'] });
    vi.advanceTimersByTime(800);
    stop();
    const comments = events.filter((e) => e.type === 'comment');
    expect(comments.length).toBeGreaterThan(5);
    const teamOf = new Map();
    for (const e of comments) {
      expect(['A', 'B']).toContain(e.text);
      if (teamOf.has(e.userId)) expect(e.text).toBe(teamOf.get(e.userId));
      teamOf.set(e.userId, e.text);
    }
  });
});
