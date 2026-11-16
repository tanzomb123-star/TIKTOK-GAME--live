import { describe, it, expect, vi } from 'vitest';
import { config } from '../game/config.js';
import { createGame, applyAction, tick } from '../game/core/state.js';
import { mapEvent } from '../game/core/events.js';

const who = { userId: 'v', nickname: 'V' };

// Small audience: one like-burst of 3 per second, one viewer comment per second. No gifts, no tower upgrades.
function playWithoutGifts(game, maxSeconds = 1200) {
  const send = (e) => { const a = mapEvent(e, config); if (a) applyAction(game, a, config); };
  for (let t = 0; t < maxSeconds && game.phase === 'playing'; t++) {
    send({ type: 'like', count: 3, ...who });
    const pick = game.energy >= config.units.knight.cost ? '3' : game.energy >= config.units.archer.cost ? '2' : '1';
    send({ type: 'comment', text: pick, ...who });
    tick(game, 1, config);
  }
  return game;
}

describe('fairness', () => {
  it('game is winnable with comments and likes only (no gifts)', () => {
    const g = playWithoutGifts(createGame(config));
    expect(g.phase).toBe('won');
  });
  it('a full round lasts between 4 and 10 minutes with that audience', () => {
    const g = createGame(config);
    let seconds = 0;
    const send = (e) => { const a = mapEvent(e, config); if (a) applyAction(g, a, config); };
    while (g.phase === 'playing' && seconds < 1200) {
      send({ type: 'like', count: 3, ...who });
      const pick = g.energy >= 12 ? '3' : g.energy >= 8 ? '2' : '1';
      send({ type: 'comment', text: pick, ...who });
      tick(g, 1, config);
      seconds++;
    }
    expect(seconds).toBeGreaterThanOrEqual(240);
    expect(seconds).toBeLessThanOrEqual(600);
  });
  it('gift path uses no randomness', () => {
    const spy = vi.spyOn(Math, 'random');
    const g = createGame(config);
    for (const type of ['upgrade', 'clear', 'boss']) applyAction(g, { type, ...who }, config);
    tick(g, 5, config);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
