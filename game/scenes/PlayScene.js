import Phaser from 'phaser';
import { config } from '../config.js';
import { createGame, tick, topHelpers } from '../core/state.js';
import { createRateLimiter } from '../core/events.js';
import { handleLiveEvent } from '../core/dispatch.js';
import { connect, hubUrl } from '../net.js';
import { createHud } from '../../overlay/hud.js';
import { createCosmicTextures } from './textures.js';
import { createBackdrop } from './background.js';

const LANE_Y = 330;
const STATION_X = 78;
const TURRET = { x: 128, y: LANE_Y - 58 };
const sx = (x) => 150 + x * 0.95;
const KIND_COLOR = { soldier: 0x5ff2ff, archer: 0x7dff9b, knight: 0xffd24d, boss: 0xd9a6ff };

export class PlayScene extends Phaser.Scene {
  constructor() { super('Play'); }

  create() {
    createCosmicTextures(this);
    this.backdrop = createBackdrop(this);

    this.state = createGame(config);
    this.allow = createRateLimiter(config.rateLimit.commandsPerSec);
    this.demo = false;

    // orbital lane
    const lane = this.add.graphics().setDepth(-50);
    lane.fillStyle(0x5ff2ff, 0.05).fillRect(0, LANE_Y - 34, 960, 68);
    lane.lineStyle(1, 0x5ff2ff, 0.25).lineBetween(0, LANE_Y + 34, 960, LANE_Y + 34);
    lane.lineStyle(1, 0xff6bd6, 0.18).lineBetween(0, LANE_Y - 34, 960, LANE_Y - 34);

    this.add.image(STATION_X, LANE_Y, 'glow').setScale(2.2).setTint(0x2a6fdb).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD);
    this.station = this.add.image(STATION_X, LANE_Y, 'station').setScale(0.9);
    this.shield = this.add.image(STATION_X + 10, LANE_Y, 'glow').setScale(1.7, 2.6).setTint(0x5ff2ff).setAlpha(0.18).setBlendMode(Phaser.BlendModes.ADD);

    this.fx = this.add.graphics().setDepth(5);       // beams
    this.bars = this.add.graphics().setDepth(6);     // hp bars + turret
    this.sprites = new Map();                        // entity id -> image
    this.prev = new Map();                           // entity id -> {x, kind, enemy}
    this.beams = [];
    this.prevCooldown = 0;
    this.unitShotTimer = 0;

    this.sparks = this.add.particles(0, 0, 'particle', {
      speed: { min: 40, max: 220 }, lifespan: { min: 300, max: 700 }, scale: { start: 0.9, end: 0 },
      alpha: { start: 1, end: 0 }, blendMode: 'ADD', emitting: false,
    }).setDepth(7);
    this.thrust = this.add.particles(0, 0, 'particle', {
      speedX: { min: -80, max: -30 }, speedY: { min: -8, max: 8 }, lifespan: 260, scale: { start: 0.35, end: 0 },
      alpha: { start: 0.8, end: 0 }, blendMode: 'ADD', tint: 0x5ff2ff, emitting: false,
    }).setDepth(1);

    this.hud = createHud(this, config);
    this.net = connect(hubUrl(location), (e) => this.handle(e));
    this.events.once('shutdown', () => this.net.close());

    const key = (k, ev) => this.input.keyboard.on(`keydown-${k}`, () => this.handle({ userId: 'keyboard', nickname: 'Keyboard', mock: true, ...ev }));
    key('ONE', { type: 'comment', text: '1' });
    key('TWO', { type: 'comment', text: '2' });
    key('THREE', { type: 'comment', text: '3' });
    key('L', { type: 'like', count: 5 });
    key('G', { type: 'gift', diamonds: 5 });
    key('H', { type: 'gift', diamonds: 50 });
    key('B', { type: 'gift', diamonds: 100 });
  }

  handle(event) {
    if (event?.mock) this.demo = true;
    const before = this.state.enemies.length;
    const ok = handleLiveEvent(this.state, event, config, this.allow, performance.now());
    if (ok && this.state.enemies.length === 0 && before > 0) this.nova();
  }

  update(time, deltaMs) {
    const s = this.state;
    const dt = Math.min(deltaMs, 250) / 1000;
    tick(s, dt, config);
    this.backdrop.update(time, dt);
    this.syncSprites(time);
    this.drawEffects(dt);
    this.hud.update(s, this.demo);
    if (s.phase !== 'playing') this.scene.start('GameOver', { phase: s.phase, top: topHelpers(s, 5) });
  }

  spriteFor(id, key, x) {
    let sp = this.sprites.get(id);
    if (!sp) {
      sp = this.add.image(x, LANE_Y, key).setDepth(2);
      sp.setScale(0.2);
      this.tweens.add({ targets: sp, scale: key === 'boss' ? 1 : key === 'alien' ? 1.1 : 0.95, duration: 260, ease: 'Back.Out' });
      this.sprites.set(id, sp);
    }
    return sp;
  }

  syncSprites(time) {
    const s = this.state;
    const seen = new Set();
    const place = (id, key, x, yOff, kind, enemy) => {
      const sp = this.spriteFor(id, key, sx(x));
      sp.x = sx(x);
      sp.y = LANE_Y + yOff + Math.sin(time / 300 + (typeof id === 'number' ? id : 0)) * 3;
      seen.add(id);
      this.prev.set(id, { x, kind, enemy, y: sp.y });
      return sp;
    };
    s.units.forEach((u) => {
      const sp = place(u.id, `ship-${u.kind}`, u.x, ((u.id % 3) - 1) * 18, u.kind, false);
      if (Math.random() < 0.3) this.thrust.emitParticleAt(sp.x - 20, sp.y);
    });
    s.enemies.forEach((e) => place(e.id, 'alien', e.x, ((e.id % 3) - 1) * 16, 'alien', true));
    if (s.boss) {
      const sp = place('boss', 'boss', s.boss.x, -6, 'boss', false);
      sp.setAlpha(s.boss.timeLeft < 3 ? 0.5 + 0.5 * Math.sin(time / 60) : 1);
    }

    for (const [id, sp] of this.sprites) {
      if (seen.has(id)) continue;
      const p = this.prev.get(id);
      if (p) this.onGone(p);
      sp.destroy();
      this.sprites.delete(id);
      this.prev.delete(id);
    }
  }

  onGone(p) {
    const x = sx(p.x);
    if (p.enemy && p.x <= 2) {
      // reached the station
      this.cameras.main.shake(160, 0.006);
      this.sparks.explode(18, STATION_X + 30, p.y, { tint: 0xff3d3d });
      this.tweens.add({ targets: this.shield, alpha: 0.6, duration: 80, yoyo: true });
      return;
    }
    const tint = p.enemy ? [0xff3d7f, 0xffe066, 0xffffff] : [KIND_COLOR[p.kind] || 0xffffff, 0xffffff];
    this.sparks.setParticleTint?.(tint[0]);
    this.sparks.explode(p.enemy ? 22 : 14, x, p.y);
  }

  nova() {
    const ring = this.add.image(480, LANE_Y, 'glow').setTint(0xff6bd6).setBlendMode(Phaser.BlendModes.ADD).setScale(0.5).setAlpha(0.9).setDepth(8);
    this.tweens.add({ targets: ring, scale: 14, alpha: 0, duration: 650, onComplete: () => ring.destroy() });
    this.cameras.main.flash(180, 255, 140, 230);
  }

  beam(x1, y1, x2, y2, color, width, life) {
    this.beams.push({ x1, y1, x2, y2, color, width, life, max: life });
  }

  drawEffects(dt) {
    const s = this.state;
    // tower fired when its cooldown jumped back up
    if (s.towerCooldown > this.prevCooldown + 0.05) {
      let target = null;
      for (const p of this.prev.values()) if (p.enemy && p.x <= config.tower.range && (!target || p.x < target.x)) target = p;
      if (target) this.beam(TURRET.x, TURRET.y, sx(target.x), target.y, 0xff6bd6, 3 + s.towerLevel, 0.18);
    }
    this.prevCooldown = s.towerCooldown;

    // allied ships fire short bolts at enemies in range
    this.unitShotTimer -= dt;
    if (this.unitShotTimer <= 0) {
      this.unitShotTimer = 0.22;
      const shooters = s.units.map((u) => ({ x: u.x, range: config.units[u.kind].range, color: KIND_COLOR[u.kind], id: u.id }));
      if (s.boss) shooters.push({ x: s.boss.x, range: 20, color: KIND_COLOR.boss, id: 'boss' });
      for (const sh of shooters) {
        const t = s.enemies.find((e) => Math.abs(e.x - sh.x) <= sh.range + 4);
        const from = this.prev.get(sh.id);
        const to = t && this.prev.get(t.id);
        if (from && to) this.beam(sx(sh.x) + 18, from.y, sx(t.x) - 10, to.y, sh.color, 2, 0.1);
      }
    }

    const g = this.fx;
    g.clear();
    this.beams = this.beams.filter((b) => (b.life -= dt) > 0);
    for (const b of this.beams) {
      const a = b.life / b.max;
      g.lineStyle(b.width * 3, b.color, 0.18 * a).lineBetween(b.x1, b.y1, b.x2, b.y2);
      g.lineStyle(b.width, 0xffffff, 0.9 * a).lineBetween(b.x1, b.y1, b.x2, b.y2);
    }

    // turret + hp bars
    const h = this.bars;
    h.clear();
    const lvl = s.towerLevel;
    h.fillStyle(0x1b2a4a).fillRoundedRect(TURRET.x - 12, TURRET.y - 4, 24, 26, 5);
    h.fillStyle(0xff6bd6, 0.9).fillRect(TURRET.x, TURRET.y - 2, 14 + lvl * 3, 4);
    for (let i = 0; i < config.tower.maxLevel; i++) h.fillStyle(i < lvl ? 0xff6bd6 : 0x3a3f66).fillCircle(TURRET.x - 8 + i * 5, TURRET.y + 16, 1.8);

    const bar = (x, y, w, ratio, color) => {
      h.fillStyle(0x000000, 0.55).fillRoundedRect(x - w / 2, y, w, 4, 2);
      h.fillStyle(color).fillRoundedRect(x - w / 2, y, Math.max(0, w * ratio), 4, 2);
    };
    for (const u of s.units) { const p = this.prev.get(u.id); if (p) bar(sx(u.x), p.y - 26, 30, u.hp / u.maxHp, KIND_COLOR[u.kind]); }
    for (const e of s.enemies) { const p = this.prev.get(e.id); if (p) bar(sx(e.x), p.y - 24, 30, e.hp / e.maxHp, 0xff3d7f); }
    if (s.boss) { const p = this.prev.get('boss'); if (p) bar(sx(s.boss.x), p.y - 46, 80, s.boss.hp / s.boss.maxHp, KIND_COLOR.boss); }
  }
}
