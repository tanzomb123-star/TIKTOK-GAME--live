import Phaser from 'phaser';
import { config } from '../config.js';
import { createGame, tick, topHelpers } from '../core/state.js';
import { createRateLimiter } from '../core/events.js';
import { handleLiveEvent } from '../core/dispatch.js';
import { connect, hubUrl } from '../net.js';
import { createHud } from '../../overlay/hud.js';

const GROUND_Y = 400;
const sx = (x) => 100 + x * 0.95;
const COLORS = { soldier: 0x4da3ff, archer: 0x5be37d, knight: 0xffd24d };

export class PlayScene extends Phaser.Scene {
  constructor() { super('Play'); }

  create() {
    this.state = createGame(config);
    this.allow = createRateLimiter(config.rateLimit.commandsPerSec);
    this.demo = false;
    this.g = this.add.graphics();
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
    handleLiveEvent(this.state, event, config, this.allow, performance.now());
  }

  update(_, deltaMs) {
    const s = this.state;
    tick(s, Math.min(deltaMs, 250) / 1000, config);
    this.draw();
    this.hud.update(s, this.demo);
    if (s.phase !== 'playing') this.scene.start('GameOver', { phase: s.phase, top: topHelpers(s, 5) });
  }

  draw() {
    const g = this.g, s = this.state;
    g.clear();
    g.fillStyle(0x87ceeb).fillRect(0, 0, 960, GROUND_Y);
    g.fillStyle(0x5a8f3c).fillRect(0, GROUND_Y, 960, 140);
    // house + tower
    g.fillStyle(0xc9a26b).fillRect(40, GROUND_Y - 70, 70, 70);
    g.fillStyle(0xb03a2e).fillTriangle(30, GROUND_Y - 70, 120, GROUND_Y - 70, 75, GROUND_Y - 110);
    g.fillStyle(0x7f8c8d).fillRect(120, GROUND_Y - 40 - s.towerLevel * 12, 22, 40 + s.towerLevel * 12);
    for (const u of s.units) {
      g.fillStyle(COLORS[u.kind]).fillCircle(sx(u.x), GROUND_Y - 12, 12);
      this.bar(sx(u.x), GROUND_Y - 32, u.hp / u.maxHp);
    }
    for (const e of s.enemies) {
      g.fillStyle(0xd9363e).fillCircle(sx(e.x), GROUND_Y - 12, 12);
      this.bar(sx(e.x), GROUND_Y - 32, e.hp / e.maxHp);
    }
    if (s.boss) {
      g.fillStyle(0x8e44ad).fillCircle(sx(s.boss.x), GROUND_Y - 24, 24);
      this.bar(sx(s.boss.x), GROUND_Y - 56, s.boss.hp / s.boss.maxHp);
    }
  }

  bar(x, y, ratio) {
    this.g.fillStyle(0x000000).fillRect(x - 14, y, 28, 4);
    this.g.fillStyle(0x2ecc71).fillRect(x - 14, y, 28 * Math.max(0, ratio), 4);
  }
}
