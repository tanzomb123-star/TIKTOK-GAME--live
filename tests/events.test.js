import { describe, it, expect } from 'vitest';
import { config } from '../game/config.js';
import { mapEvent, createRateLimiter } from '../game/core/events.js';

const u = { userId: 'u1', nickname: 'Nick' };

describe('mapEvent', () => {
  it("comment '1' maps to summon soldier", () => {
    expect(mapEvent({ type: 'comment', text: '1', ...u }, config))
      .toEqual({ type: 'summon', unit: 'soldier', userId: 'u1', nickname: 'Nick' });
  });
  it("comment ' 2 ' (spaces) maps to summon archer", () => {
    expect(mapEvent({ type: 'comment', text: ' 2 ', ...u }, config).unit).toBe('archer');
  });
  it('unknown, empty, emoji comments return null', () => {
    for (const text of ['', 'hello', '😀', '1'.repeat(500), undefined]) {
      expect(mapEvent({ type: 'comment', text, ...u }, config)).toBeNull();
    }
  });
  it('like count 5 gives energy 5', () => {
    expect(mapEvent({ type: 'like', count: 5, ...u }, config)).toEqual({ type: 'energy', amount: 5 });
  });
  it('like count 100 is capped at maxLikesPerEvent', () => {
    expect(mapEvent({ type: 'like', count: 100, ...u }, config).amount).toBe(config.energy.maxLikesPerEvent * config.energy.perLike);
  });
  it('gift 5 diamonds -> upgrade, 50 -> clear, 100 -> boss', () => {
    expect(mapEvent({ type: 'gift', diamonds: 5, ...u }, config).type).toBe('upgrade');
    expect(mapEvent({ type: 'gift', diamonds: 50, ...u }, config).type).toBe('clear');
    expect(mapEvent({ type: 'gift', diamonds: 100, ...u }, config).type).toBe('boss');
  });
  it('gift 0 diamonds returns null', () => {
    expect(mapEvent({ type: 'gift', diamonds: 0, ...u }, config)).toBeNull();
  });
  it('join and unknown types return null', () => {
    expect(mapEvent({ type: 'join', ...u }, config)).toBeNull();
    expect(mapEvent({ type: 'weird', ...u }, config)).toBeNull();
  });
});

describe('createRateLimiter', () => {
  it('allows 3 per second per user, resets after 1s, users independent', () => {
    const allow = createRateLimiter(3);
    expect([0, 100, 200, 300].map((t) => allow('a', t))).toEqual([true, true, true, false]);
    expect(allow('b', 300)).toBe(true);
    expect(allow('a', 1100)).toBe(true);
  });
});
