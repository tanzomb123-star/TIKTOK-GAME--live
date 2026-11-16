import Phaser from 'phaser';
import { warConfig as C } from './config.js';
import { createWar, tickWar, topByTeam, TEAMS } from './state.js';
import { handleWarEvent } from './dispatch.js';
import { createRateLimiter } from '../core/events.js';
import { connect, hubUrl } from '../net.js';
import { createCosmicTextures } from '../scenes/textures.js';
import { createBackdrop } from '../scenes/background.js';
import { sfx } from '../audio.js';
import { FONT } from '../../overlay/hud.js';
import { createWarHud, TEAM_COLOR } from './hud.js';

const LANE_Y = 330;
const BASE_X = { red: 70, blue: 890 };
const sx = (x) => 150 + x * (660 / C.lane);

export class WarScene extends Phaser.Scene {
  constructor() { super('War'); }

  create() {
    createCosmicTextures(this);
    this.backdrop = createBackdrop(this, { planet: { x: 480, y: 450 } });
    this.war = createWar(C);
    this.allow = createRateLimiter(C.rateLimit.commandsPerSec);
    this.demo = false;
    this.sfx = sfx();

    const lane = this.add.graphics().setDepth(-50);
    lane.fillStyle(0xffffff, 0.04).fillRect(0, LANE_Y - 40, 960, 80);
    lane.lineStyle(1, TEAM_COLOR.red, 0.3).lineBetween(0, LANE_Y - 40, 480, LANE_Y - 40).lineBetween(0, LANE_Y + 40, 480, LANE_Y + 40);
    lane.lineStyle(1, TEAM_COLOR.blue, 0.3).lineBetween(480, LANE_Y - 40, 960, LANE_Y - 40).lineBetween(480, LANE_Y + 40, 960, LANE_Y + 40);

    this.bases = {};
    for (const team of TEAMS) {
      this.add.image(BASE_X[team], LANE_Y, 'glow').setScale(2).setTint(TEAM_COLOR[team]).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD);
      this.bases[team] = this.add.image(BASE_X[team], LANE_Y, 'station').setScale(0.8).setTint(team === 'red' ? 0xffc2cc : 0xc2f0ff).setFlipX(team === 'blue');
    }

    this.fx = this.add.graphics().setDepth(5);
    this.bars = this.add.graphics().setDepth(6);
    this.sprites = new Map();
    this.prev = new Map();
    this.prevHp = { red: C.base.maxHp, blue: C.base.maxHp };
    this.sparks = this.add.particles(0, 0, 'particle', {
      speed: { min: 40, max: 200 }, lifespan: { min: 300, max: 650 }, scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 }, blendMode: 'ADD', emitting: false,
    }).setDepth(7);

    this.hud = createWarHud(this, C);
    this.muteText = this.add.text(480, 96, '', { fontFamily: FONT, fontSize: '13px', color: '#9fd8ff', stroke: '#140a2e', strokeThickness: 3 }).setOrigin(0.5, 0).setDepth(10);
    const showMute = () => this.muteText.setText(this.sfx.muted ? 'เสียงปิดอยู่ (กด M)' : '');
    showMute();
    this.input.keyboard.on('keydown', () => this.sfx.unlock());
    this.input.on('pointerdown', () => this.sfx.unlock());
    this.input.keyboard.on('keydown-M', () => { this.sfx.toggleMute(); showMute(); });

    this.net = connect(hubUrl(location), (e) => this.handle(e));
    this.events.once('shutdown', () => this.net.close());

    // keyboard simulator (marks the round as DEMO)
    let n = 0;
    const kb = (team) => `kb-${team}-${n++ % 3}`;
    const key = (k, make) => this.input.keyboard.on(`keydown-${k}`, () => this.handle({ mock: true, ...make() }));
    key('A', () => { const u = kb('red'); return { type: 'comment', text: 'A', userId: u, nickname: u }; });
    key('B', () => { const u = kb('blue'); return { type: 'comment', text: 'B', userId: u, nickname: u }; });
    key('L', () => ({ type: 'like', count: 10, userId: 'kb-red-0', nickname: 'kb-red-0' }));
    key('K', () => ({ type: 'like', count: 10, userId: 'kb-blue-0', nickname: 'kb-blue-0' }));
    key('G', () => ({ type: 'gift', diamonds: 5, userId: 'kb-red-0', nickname: 'kb-red-0' }));
    key('H', () => ({ type: 'gift', diamonds: 50, userId: 'kb-red-0', nickname: 'kb-red-0' }));
    key('J', () => ({ type: 'gift', diamonds: 100, userId: 'kb-red-0', nickname: 'kb-red-0' }));
    key('Z', () => ({ type: 'gift', diamonds: 5, userId: 'kb-blue-0', nickname: 'kb-blue-0' }));
    key('X', () => ({ type: 'gift', diamonds: 50, userId: 'kb-blue-0', nickname: 'kb-blue-0' }));
    key('C', () => ({ type: 'gift', diamonds: 100, userId: 'kb-blue-0', nickname: 'kb-blue-0' }));
  }

  handle(event) {
    if (event?.mock) this.demo = true;
    handleWarEvent(this.war, event, C, this.allow, performance.now());
  }

  update(time, deltaMs) {
    const w = this.war;
    const dt = Math.min(deltaMs, 250) / 1000;
    tickWar(w, dt, C);
    this.backdrop.update(time, dt);
    this.sync(time);
    this.effects();
    this.hud.update(w, this.demo);
    if (w.phase !== 'playing') {
      this.scene.start('WarOver', { winner: w.winner, red: topByTeam(w, 'red', 3), blue: topByTeam(w, 'blue', 3) });
    }
  }

  sync(time) {
    const seen = new Set();
    const place = (id, key, team, x, yOff, scale) => {
      let sp = this.sprites.get(id);
      if (!sp) {
        sp = this.add.image(sx(x), LANE_Y, key).setDepth(2).setTint(TEAM_COLOR[team]).setFlipX(team === 'blue').setScale(0.2);
        this.tweens.add({ targets: sp, scale, duration: 240, ease: 'Back.Out' });
        this.sprites.set(id, sp);
        this.sfx.play(key === 'boss-white' ? 'boss' : 'summon', team === 'red' ? 'soldier' : 'archer');
      }
      sp.x = sx(x);
      sp.y = LANE_Y + yOff + Math.sin(time / 280 + (typeof id === 'number' ? id : 0)) * 3;
      seen.add(id);
      this.prev.set(id, { x: sp.x, y: sp.y, team });
      return sp;
    };
    for (const team of TEAMS) {
      const T = this.war.teams[team];
      for (const s of T.ships) place(s.id, 'ship-white', team, s.x, ((s.id % 5) - 2) * 13, 0.75);
      if (T.mother) place(`mother-${team}`, 'boss-white', team, T.mother.x, team === 'red' ? -22 : 22, 0.8);
    }
    for (const [id, sp] of this.sprites) {
      if (seen.has(id)) continue;
      const p = this.prev.get(id);
      if (p) { this.sparks.explode(12, p.x, p.y); this.sfx.play('boom'); }
      sp.destroy();
      this.sprites.delete(id);
      this.prev.delete(id);
    }
  }

  effects() {
    const w = this.war;
    for (const v of w.volleys.splice(0)) {
      const enemyHalf = v.team === 'red' ? 720 : 240;
      const ring = this.add.image(enemyHalf, LANE_Y, 'glow').setTint(TEAM_COLOR[v.team]).setBlendMode(Phaser.BlendModes.ADD).setScale(0.5).setAlpha(0.9).setDepth(8);
      this.tweens.add({ targets: ring, scale: 9, alpha: 0, duration: 600, onComplete: () => ring.destroy() });
      this.sfx.play('nova');
    }
    for (const a of w.artillery.splice(0)) {
      const target = a.team === 'red' ? 'blue' : 'red';
      this.sparks.explode(4, BASE_X[target] + (target === 'red' ? 25 : -25), LANE_Y + ((Math.random() * 60) | 0) - 30);
    }
    for (const team of TEAMS) {
      const hp = w.teams[team].hp;
      if (hp < this.prevHp[team] - 0.5) {
        this.cameras.main.shake(100, 0.003);
        this.tweens.add({ targets: this.bases[team], alpha: 0.5, duration: 70, yoyo: true });
        this.sfx.play('hit');
      }
      this.prevHp[team] = hp;
    }

    const h = this.bars;
    h.clear();
    const bar = (x, y, wd, r, c) => {
      h.fillStyle(0x000000, 0.55).fillRoundedRect(x - wd / 2, y, wd, 4, 2);
      h.fillStyle(c).fillRoundedRect(x - wd / 2, y, Math.max(0, wd * r), 4, 2);
    };
    for (const team of TEAMS) {
      const T = w.teams[team];
      for (const s of T.ships) { const p = this.prev.get(s.id); if (p && s.hp < s.maxHp) bar(p.x, p.y - 18, 24, s.hp / s.maxHp, TEAM_COLOR[team]); }
      if (T.mother) { const p = this.prev.get(`mother-${team}`); if (p) bar(p.x, p.y - 38, 70, T.mother.hp / T.mother.maxHp, TEAM_COLOR[team]); }
    }
  }
}
