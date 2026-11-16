import { describe, it, expect, vi } from 'vitest';
import { warConfig as C } from '../game/war/config.js';
import { createWar, mapWarEvent, applyWar, tickWar, topByTeam } from '../game/war/state.js';

const ev = (type, userId, extra = {}) => ({ type, userId, nickname: `N-${userId}`, ...extra });
const say = (w, userId, text) => { const a = mapWarEvent(ev('comment', userId, { text }), w, C); return a ? applyWar(w, a, C) : false; };

describe('joining teams', () => {
  it("'A' joins red and launches a first ship", () => {
    const w = createWar(C);
    expect(say(w, 'u1', 'A')).toBe(true);
    expect(w.members.u1.team).toBe('red');
    expect(w.teams.red.size).toBe(1);
    expect(w.teams.red.ships).toHaveLength(1);
  });
  it('accepts lowercase, spaces and Thai/English words', () => {
    const w = createWar(C);
    say(w, 'a', ' a '); say(w, 'b', 'แดง'); say(w, 'c', 'B'); say(w, 'd', 'ฟ้า'); say(w, 'e', 'blue');
    expect(['a', 'b', 'c', 'd', 'e'].map((u) => w.members[u].team)).toEqual(['red', 'red', 'blue', 'blue', 'blue']);
  });
  it('other chat is ignored', () => {
    const w = createWar(C);
    for (const t of ['', 'hello', '1', '😀', 'A'.repeat(300)]) expect(mapWarEvent(ev('comment', 'x', { text: t }), w, C)).toBeNull();
  });
  it('members cannot switch team during a round', () => {
    const w = createWar(C);
    say(w, 'u1', 'A');
    expect(mapWarEvent(ev('comment', 'u1', { text: 'B' }), w, C)).toBeNull();
    expect(w.members.u1.team).toBe('red');
  });
  it('viewer ids like __proto__ are safe', () => {
    const w = createWar(C);
    say(w, '__proto__', 'A'); say(w, 'constructor', 'B');
    expect({}.team).toBeUndefined();
    expect(w.members.constructor.team).toBe('blue');
  });
});

describe('fighting', () => {
  it('typing your team letter again launches another ship', () => {
    const w = createWar(C);
    say(w, 'u1', 'A');
    expect(say(w, 'u1', 'a')).toBe(true);
    expect(w.teams.red.ships).toHaveLength(2);
  });
  it('ships per team are capped', () => {
    const w = createWar(C);
    for (let i = 0; i < C.maxShipsPerTeam + 10; i++) say(w, `u${i}`, 'A');
    expect(w.teams.red.ships).toHaveLength(C.maxShipsPerTeam);
  });
  it('a ship reaching the enemy base damages it', () => {
    const w = createWar(C);
    w.teams.red.ships.push({ id: 99, x: C.lane - 1, hp: 100, maxHp: 100 });
    tickWar(w, 0.1, C);
    expect(w.teams.blue.hp).toBe(C.base.maxHp - C.ship.baseDmg);
    expect(w.teams.red.ships.find((s) => s.id === 99)).toBeUndefined();
  });
  it('ships of opposite teams fight when they meet', () => {
    const w = createWar(C);
    w.teams.red.ships.push({ id: 1, x: 400, hp: 1, maxHp: 1 });
    w.teams.blue.ships.push({ id: 2, x: 405, hp: 1000, maxHp: 1000 });
    tickWar(w, 0.3, C);
    expect(w.teams.red.ships).toHaveLength(0);
  });
});

describe('likes and gifts', () => {
  it('likes charge only the liker team, and only for members', () => {
    const w = createWar(C);
    expect(mapWarEvent(ev('like', 'stranger', { count: 5 }), w, C)).toBeNull();
    say(w, 'u1', 'B');
    applyWar(w, mapWarEvent(ev('like', 'u1', { count: 5 }), w, C), C);
    expect(w.teams.blue.power).toBe(5 * C.power.perLike);
    expect(w.teams.red.power).toBe(0);
  });
  it('a full power bar fires a volley that hits every enemy ship, then resets', () => {
    const w = createWar(C);
    say(w, 'u1', 'A');
    w.teams.blue.ships.push({ id: 7, x: 600, hp: C.power.volleyDmg, maxHp: 20 }, { id: 8, x: 700, hp: 1000, maxHp: 1000 });
    w.teams.red.power = C.power.max - 1;
    applyWar(w, { type: 'power', team: 'red', amount: 5 }, C);
    expect(w.teams.red.power).toBe(0);
    expect(w.teams.blue.ships.map((s) => s.id)).toEqual([8]);
    expect(w.volleys).toEqual([{ team: 'red' }]);
  });
  it('gift tiers: small shield (capped), medium volley, large mothership', () => {
    const w = createWar(C);
    say(w, 'u1', 'A');
    const gift = (d) => applyWar(w, mapWarEvent(ev('gift', 'u1', { diamonds: d }), w, C), C);
    w.teams.red.hp = C.base.maxHp - 5;
    gift(5);
    expect(w.teams.red.hp).toBe(C.base.maxHp);
    w.teams.blue.ships.push({ id: 9, x: 500, hp: 1, maxHp: 1 });
    gift(50);
    expect(w.teams.blue.ships).toHaveLength(0);
    gift(100);
    expect(w.teams.red.mother).not.toBeNull();
  });
  it('a second mothership gift extends instead of resetting', () => {
    const w = createWar(C);
    say(w, 'u1', 'A');
    applyWar(w, { type: 'mother', team: 'red', userId: 'u1' }, C);
    tickWar(w, 2, C);
    const { x, timeLeft } = w.teams.red.mother;
    applyWar(w, { type: 'mother', team: 'red', userId: 'u1' }, C);
    expect(w.teams.red.mother.x).toBe(x);
    expect(w.teams.red.mother.timeLeft).toBeCloseTo(timeLeft + C.mothership.durationSec, 5);
  });
  it('a gift from a non-member joins the smaller team (red on a tie) and still takes effect', () => {
    const w = createWar(C);
    say(w, 'r1', 'A');
    const a = mapWarEvent(ev('gift', 'g1', { diamonds: 50 }), w, C);
    expect(a.team).toBe('blue');
    expect(applyWar(w, a, C)).toBe(true);
    expect(w.members.g1.team).toBe('blue');
    const w2 = createWar(C);
    expect(mapWarEvent(ev('gift', 'g2', { diamonds: 5 }), w2, C).team).toBe('red');
  });
  it('gifts use no randomness', () => {
    const spy = vi.spyOn(Math, 'random');
    const w = createWar(C);
    say(w, 'u1', 'A');
    for (const type of ['shield', 'volley', 'mother']) applyWar(w, { type, team: 'red', userId: 'u1' }, C);
    tickWar(w, 3, C);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('round end', () => {
  it('base at 0 hp ends the round, other team wins, actions then do nothing', () => {
    const w = createWar(C);
    w.teams.blue.hp = C.ship.baseDmg;
    w.teams.red.ships.push({ id: 1, x: C.lane - 1, hp: 100, maxHp: 100 });
    tickWar(w, 0.1, C);
    expect(w.phase).toBe('ended');
    expect(w.winner).toBe('red');
    expect(say(w, 'u9', 'A')).toBe(false);
  });
  it('time up: higher base hp wins, equal is a draw', () => {
    const w = createWar(C);
    w.teams.red.hp = 300;
    w.timeLeft = 0.05;
    tickWar(w, 0.1, C);
    expect(w.winner).toBe('blue');
    const d = createWar(C);
    d.timeLeft = 0.05;
    tickWar(d, 0.1, C);
    expect(d.winner).toBe('draw');
  });
  it('topByTeam lists a team best helpers', () => {
    const w = createWar(C);
    say(w, 'a', 'A'); say(w, 'a', 'A'); say(w, 'b', 'A'); say(w, 'c', 'B');
    expect(topByTeam(w, 'red', 5).map((r) => r.nickname)).toEqual(['N-a', 'N-b']);
    expect(topByTeam(w, 'blue', 5).map((r) => r.score)).toEqual([1]);
  });
});

describe('balance', () => {
  const play = (redRate, blueRate) => {
    const w = createWar(C);
    let t = 0;
    while (w.phase === 'playing' && t < 1000) {
      for (let i = 0; i < redRate; i++) say(w, `r${i}`, 'A');
      for (let i = 0; i < blueRate; i++) say(w, `b${i}`, 'B');
      tickWar(w, 1, C);
      t++;
    }
    return { w, t };
  };
  it('a round never lasts longer than roundSec', () => {
    const { t } = play(2, 2);
    expect(t).toBeLessThanOrEqual(C.roundSec);
  });
  it('the more active team wins', () => {
    expect(play(3, 1).w.winner).toBe('red');
    expect(play(1, 3).w.winner).toBe('blue');
  });
});

describe('crowded lane', () => {
  it('when the ship cap is reached, extra commands fire artillery at the enemy base instead', () => {
    const w = createWar(C);
    for (let i = 0; i < C.maxShipsPerTeam; i++) say(w, `u${i}`, 'A');
    expect(say(w, 'u0', 'A')).toBe(true);
    expect(w.teams.blue.hp).toBeCloseTo(C.base.maxHp - C.ship.overflowBaseDmg, 9);
    expect(w.teams.red.ships).toHaveLength(C.maxShipsPerTeam);
    expect(w.artillery).toEqual([{ team: 'red' }]);
  });
  it('with big crowds the more active team still wins', () => {
    const w = createWar(C);
    let t = 0;
    while (w.phase === 'playing' && t < 1000) {
      for (let i = 0; i < 10; i++) say(w, `r${i}`, 'A');
      for (let i = 0; i < 8; i++) say(w, `b${i}`, 'B');
      tickWar(w, 1, C); t++;
    }
    expect(w.winner).toBe('red');
  });
});
