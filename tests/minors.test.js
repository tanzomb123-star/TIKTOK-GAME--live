import { describe, it, expect, vi, afterEach } from 'vitest';
import { WebSocket } from 'ws';
import { config } from '../game/config.js';
import { createGame, applyAction, tick } from '../game/core/state.js';
import { createRateLimiter } from '../game/core/events.js';
import { handleLiveEvent } from '../game/core/dispatch.js';
import { hashUserId } from '../game/core/safety.js';
import { hubUrl } from '../game/net.js';
import { createHub } from '../server/hub.js';
import { normalize, startTikTok } from '../server/tiktok.js';

const A = { userId: 'u1', nickname: 'N' };
afterEach(() => vi.useRealTimers());

describe('rate limit applies to commands only', () => {
  it('ordinary chat does not use up the command allowance', () => {
    const s = createGame(config);
    s.energy = 50;
    const allow = createRateLimiter(3);
    for (const text of ['555', 'gg', 'lol']) handleLiveEvent(s, { type: 'comment', text, ...A }, config, allow, 0);
    expect(handleLiveEvent(s, { type: 'comment', text: '1', ...A }, config, allow, 10)).toBe(true);
    expect(s.units).toHaveLength(1);
  });
  it('a 4th command in the same second is still dropped', () => {
    const s = createGame(config);
    s.energy = 50;
    const allow = createRateLimiter(3);
    const r = [0, 1, 2, 3].map((t) => handleLiveEvent(s, { type: 'comment', text: '1', ...A }, config, allow, t));
    expect(r).toEqual([true, true, true, false]);
  });
  it('likes and gifts are not rate limited', () => {
    const s = createGame(config);
    const allow = createRateLimiter(1);
    expect(handleLiveEvent(s, { type: 'like', count: 1, ...A }, config, allow, 0)).toBe(true);
    expect(handleLiveEvent(s, { type: 'like', count: 1, ...A }, config, allow, 1)).toBe(true);
  });
  it('null events and events after game over are ignored', () => {
    const s = createGame(config);
    const allow = createRateLimiter(3);
    expect(handleLiveEvent(s, null, config, allow, 0)).toBe(false);
    s.phase = 'won';
    expect(handleLiveEvent(s, { type: 'gift', diamonds: 100, ...A }, config, allow, 0)).toBe(false);
  });
});

describe('rate limiter memory', () => {
  it('forgets viewers who have been quiet for over a second', () => {
    const allow = createRateLimiter(3);
    for (let i = 0; i < 2000; i++) allow(`u${i}`, 0);
    allow('late', 5000);
    expect(allow.size()).toBe(1);
  });
});

describe('viewer identity', () => {
  it('prefers the stable user.id over displayId and nickname', () => {
    expect(normalize({ user: { id: '777', displayId: 'disp', nickname: 'N' }, content: '1' }, 'chat').userId).toBe('777');
  });
  it('falls back to id when displayId is empty', () => {
    expect(normalize({ user: { id: '5', displayId: '', nickname: 'Same' }, content: '1' }, 'chat').userId).toBe('5');
  });
  it('shows nickname, not the numeric id', () => {
    expect(normalize({ user: { id: '5', nickname: 'Same' }, content: '1' }, 'chat').nickname).toBe('Same');
  });
});

describe('connector resilience', () => {
  it('a failed library load is retried instead of crashing', async () => {
    vi.useFakeTimers();
    const loadLib = vi.fn().mockRejectedValue(new Error('boom'));
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const stop = startTikTok('me', () => {}, { loadLib, retryMs: 1000 });
    await vi.advanceTimersByTimeAsync(1100);
    expect(loadLib).toHaveBeenCalledTimes(2);
    stop();
    err.mockRestore();
  });
});

describe('hub binds to this computer only', () => {
  it('listens on 127.0.0.1', async () => {
    const hub = await createHub(0);
    expect(hub.address).toBe('127.0.0.1');
    const ws = new WebSocket(`ws://127.0.0.1:${hub.port}`);
    await new Promise((r) => ws.on('open', r));
    ws.close();
    await hub.close();
  });
});

describe('hubUrl', () => {
  it('defaults to port 8080', () => {
    expect(hubUrl({ hostname: 'localhost', search: '' })).toBe('ws://localhost:8080');
  });
  it('reads ?port= from the page address', () => {
    expect(hubUrl({ hostname: 'localhost', search: '?port=9001' })).toBe('ws://localhost:9001');
  });
  it('ignores an invalid port', () => {
    expect(hubUrl({ hostname: '', search: '?port=abc' })).toBe('ws://localhost:8080');
  });
});

describe('boss', () => {
  it('a second boss gift extends the active boss instead of resetting it', () => {
    const s = createGame(config);
    applyAction(s, { type: 'boss', ...A }, config);
    tick(s, 2, config);
    const { x, hp, timeLeft } = s.boss;
    applyAction(s, { type: 'boss', ...A }, config);
    expect(s.boss.x).toBe(x);
    expect(s.boss.hp).toBe(hp);
    expect(s.boss.timeLeft).toBeCloseTo(timeLeft + config.boss.durationSec, 5);
  });
  it('boss walks at config.boss.speed', () => {
    const s = createGame(config);
    s.waveState.spawned = 999; // no enemies
    applyAction(s, { type: 'boss', ...A }, config);
    const x0 = s.boss.x;
    tick(s, 1, config);
    expect(s.boss.x - x0).toBeCloseTo(config.boss.speed, 5);
  });
  it('config has no unused balance keys', () => {
    expect(config.clearAllDamage).toBeUndefined();
  });
});

describe('salted pseudonyms', () => {
  it('different salts give different pseudonyms for the same viewer', () => {
    expect(hashUserId('viewer', 's1')).not.toBe(hashUserId('viewer', 's2'));
    expect(hashUserId('viewer', 's1')).toBe(hashUserId('viewer', 's1'));
  });
});

describe('leaderboard does not reward gifting more than playing', () => {
  it('every helpful action scores 1 point', () => {
    const s = createGame(config);
    applyAction(s, { type: 'summon', unit: 'soldier', ...A }, config);
    applyAction(s, { type: 'upgrade', ...A }, config);
    applyAction(s, { type: 'clear', ...A }, config);
    applyAction(s, { type: 'boss', ...A }, config);
    expect(s.leaderboard.u1.score).toBe(4);
  });
});
