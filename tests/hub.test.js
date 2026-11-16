import { describe, it, expect, vi, afterEach } from 'vitest';
import { WebSocket } from 'ws';
import { createHub } from '../server/hub.js';
import { startMock } from '../server/mock.js';

afterEach(() => vi.useRealTimers());

describe('hub', () => {
  it('hub broadcasts events to connected clients', async () => {
    const hub = await createHub(0);
    const ws = new WebSocket(`ws://localhost:${hub.port}`);
    const got = new Promise((resolve) => ws.on('message', (m) => resolve(JSON.parse(m.toString()))));
    await new Promise((r) => ws.on('open', r));
    hub.broadcast({ type: 'comment', userId: 'u', nickname: 'n', text: '1' });
    expect(await got).toEqual({ type: 'comment', userId: 'u', nickname: 'n', text: '1' });
    ws.close();
    await hub.close();
  });
});

describe('mock', () => {
  it('mock emits valid events within 2s', () => {
    vi.useFakeTimers();
    const events = [];
    const stop = startMock((e) => events.push(e));
    vi.advanceTimersByTime(2000);
    stop();
    expect(events.length).toBeGreaterThanOrEqual(2);
    for (const e of events) {
      expect(['comment', 'like', 'gift']).toContain(e.type);
      expect(typeof e.userId).toBe('string');
      expect(e.mock).toBe(true);
    }
  });
  it('stop() halts emission', () => {
    vi.useFakeTimers();
    const events = [];
    const stop = startMock((e) => events.push(e));
    stop();
    vi.advanceTimersByTime(5000);
    expect(events).toHaveLength(0);
  });
});

describe('mock identities', () => {
  it('each mock viewer has one consistent nickname', () => {
    vi.useFakeTimers();
    const events = [];
    const stop = startMock((e) => events.push(e), { minMs: 1, maxMs: 1 });
    vi.advanceTimersByTime(500);
    stop();
    for (const e of events.filter((x) => x.userId)) expect(e.nickname).toBe(`Demo${e.userId.replace('mock-', '')}`);
  });
});
