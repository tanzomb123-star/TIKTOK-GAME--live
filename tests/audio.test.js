import { describe, it, expect } from 'vitest';
import { createThrottle } from '../game/audio.js';

describe('sound throttle', () => {
  it('allows at most maxPerWindow plays of one sound per window', () => {
    const ok = createThrottle({ laser: { windowMs: 100, max: 2 } });
    expect([0, 10, 20].map((t) => ok('laser', t))).toEqual([true, true, false]);
    expect(ok('laser', 120)).toBe(true);
  });
  it('sounds are throttled independently', () => {
    const ok = createThrottle({ laser: { windowMs: 100, max: 1 }, boom: { windowMs: 100, max: 1 } });
    expect(ok('laser', 0)).toBe(true);
    expect(ok('boom', 0)).toBe(true);
  });
  it('unknown sounds use a safe default limit', () => {
    const ok = createThrottle({});
    const r = Array.from({ length: 10 }, (_, i) => ok('x', i));
    expect(r.filter(Boolean).length).toBeLessThan(10);
  });
});
