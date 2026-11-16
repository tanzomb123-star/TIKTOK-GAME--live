import { describe, it, expect } from 'vitest';
import { config } from '../game/config.js';
import { createGame, applyAction, tick, topHelpers, waveSize } from '../game/core/state.js';

const A = { userId: 'u1', nickname: 'Nick' };
const summon = (unit = 'soldier', who = A) => ({ type: 'summon', unit, ...who });

describe('actions', () => {
  it('summon deducts energy and adds a unit', () => {
    const s = createGame(config);
    expect(applyAction(s, summon(), config)).toBe(true);
    expect(s.energy).toBe(config.energy.start - config.units.soldier.cost);
    expect(s.units).toHaveLength(1);
  });
  it('summon with insufficient energy does nothing and returns false', () => {
    const s = createGame(config);
    s.energy = 1;
    expect(applyAction(s, summon('knight'), config)).toBe(false);
    expect(s.energy).toBe(1);
    expect(s.units).toHaveLength(0);
  });
  it('energy action adds energy but never exceeds max', () => {
    const s = createGame(config);
    applyAction(s, { type: 'energy', amount: 1000 }, config);
    expect(s.energy).toBe(config.energy.max);
  });
  it('upgrade caps at maxLevel', () => {
    const s = createGame(config);
    for (let i = 0; i < config.tower.maxLevel + 2; i++) applyAction(s, { type: 'upgrade', ...A }, config);
    expect(s.towerLevel).toBe(config.tower.maxLevel);
  });
  it('clear removes all enemies', () => {
    const s = createGame(config);
    s.enemies.push({ id: 1, x: 300, hp: 50, maxHp: 50 }, { id: 2, x: 500, hp: 50, maxHp: 50 });
    expect(applyAction(s, { type: 'clear', ...A }, config)).toBe(true);
    expect(s.enemies).toHaveLength(0);
  });
  it('boss expires after durationSec', () => {
    const s = createGame(config);
    applyAction(s, { type: 'boss', ...A }, config);
    expect(s.boss).not.toBeNull();
    tick(s, config.boss.durationSec + 1, config);
    expect(s.boss).toBeNull();
  });
  it('actions add score: summon 1, upgrade 5, clear 10, boss 30', () => {
    const s = createGame(config);
    applyAction(s, summon(), config);
    applyAction(s, { type: 'upgrade', ...A }, config);
    applyAction(s, { type: 'clear', ...A }, config);
    applyAction(s, { type: 'boss', ...A }, config);
    expect(s.leaderboard.u1.score).toBe(46);
  });
  it('applyAction after game over returns false and leaves state unchanged', () => {
    const s = createGame(config);
    s.phase = 'lost';
    const before = JSON.stringify(s);
    expect(applyAction(s, summon(), config)).toBe(false);
    expect(applyAction(s, { type: 'boss', ...A }, config)).toBe(false);
    expect(JSON.stringify(s)).toBe(before);
  });
  it('unknown action returns false', () => {
    expect(applyAction(createGame(config), { type: 'nope' }, config)).toBe(false);
  });
});

describe('tick', () => {
  it('passive energy grows but never exceeds max', () => {
    const s = createGame(config);
    tick(s, 10, config);
    expect(s.energy).toBeCloseTo(config.energy.start + 10 * config.energy.passivePerSec, 5);
    s.energy = config.energy.max - 0.1;
    tick(s, 5, config);
    expect(s.energy).toBe(config.energy.max);
  });
  it('wave n spawns baseCount + countPerWave*(n-1) enemies', () => {
    const s = createGame(config);
    s.wave = 3;
    expect(waveSize(3, config)).toBe(config.waves.baseCount + config.waves.countPerWave * 2);
    tick(s, waveSize(3, config) * config.waves.spawnIntervalSec, config);
    expect(s.enemies).toHaveLength(waveSize(3, config));
  });
  it('enemy reaching house reduces houseHp', () => {
    const s = createGame(config);
    s.enemies.push({ id: 99, x: 1, hp: 1000, maxHp: 1000 });
    tick(s, 0.1, config);
    expect(s.houseHp).toBe(config.house.maxHp - config.waves.enemyDmg);
    expect(s.enemies.find((e) => e.id === 99)).toBeUndefined();
  });
  it('houseHp 0 -> phase lost, and tick stops changing state', () => {
    const s = createGame(config);
    s.houseHp = config.waves.enemyDmg;
    s.enemies.push({ id: 99, x: 1, hp: 1000, maxHp: 1000 });
    tick(s, 0.1, config);
    expect(s.phase).toBe('lost');
    const before = JSON.stringify(s);
    tick(s, 5, config);
    expect(JSON.stringify(s)).toBe(before);
  });
  it('soldier kills an adjacent weak enemy', () => {
    const s = createGame(config);
    applyAction(s, summon(), config);
    const u = s.units[0];
    s.enemies.push({ id: 50, x: u.x + 10, hp: 1, maxHp: 1 });
    tick(s, 0.2, config);
    expect(s.enemies.find((e) => e.id === 50)).toBeUndefined();
  });
  it('surviving wave 10 -> phase won', () => {
    const s = createGame(config);
    s.wave = config.waves.total;
    s.waveState.spawned = waveSize(config.waves.total, config);
    tick(s, 0.1, config);
    expect(s.phase).toBe('won');
  });
  it('clearing a wave below the last advances to the next wave after rest', () => {
    const s = createGame(config);
    s.waveState.spawned = waveSize(1, config);
    tick(s, config.waves.restSec + 1, config);
    expect(s.wave).toBe(2);
  });
});

describe('topHelpers', () => {
  it('sorts by score desc and limits to n', () => {
    const s = createGame(config);
    s.leaderboard = { a: { nickname: 'A', score: 1 }, b: { nickname: 'B', score: 9 }, c: { nickname: 'C', score: 5 } };
    expect(topHelpers(s, 2).map((x) => x.nickname)).toEqual(['B', 'C']);
  });
});
