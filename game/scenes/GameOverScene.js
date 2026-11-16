import Phaser from 'phaser';
import { sanitizeName } from '../core/safety.js';
import { createCosmicTextures } from './textures.js';
import { createBackdrop } from './background.js';
import { FONT } from '../../overlay/hud.js';

export class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOver'); }

  init(data) { this.result = data; }

  create() {
    createCosmicTextures(this);
    this.backdrop = createBackdrop(this);
    const won = this.result.phase === 'won';
    const color = won ? 0x5ff2ff : 0xff3d7f;
    const style = { fontFamily: FONT, color: '#ffffff', stroke: '#140a2e', strokeThickness: 6, align: 'center' };

    this.add.image(480, 150, 'glow').setScale(5, 2).setTint(color).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD);
    const title = this.add.text(480, 150, won ? 'ปกป้องสถานีสำเร็จ!' : 'สถานีถูกยึดแล้ว', { ...style, fontSize: '52px' }).setOrigin(0.5).setScale(0.6);
    this.tweens.add({ targets: title, scale: 1, duration: 500, ease: 'Back.Out' });
    this.add.text(480, 205, won ? 'รอดครบ 10 เวฟ' : 'ลองใหม่อีกครั้ง', { ...style, fontSize: '22px', color: '#ffd6f5' }).setOrigin(0.5);

    const g = this.add.graphics();
    g.fillStyle(0x0b0f2a, 0.65).fillRoundedRect(320, 238, 320, 214, 14);
    g.lineStyle(2, 0xff6bd6, 0.85).strokeRoundedRect(320, 238, 320, 214, 14);
    const lines = ['★ ผู้ช่วยเด่น', ...this.result.top.map((r, i) => `${i + 1}. ${sanitizeName(r.nickname)}  ${r.score}`)];
    this.add.text(480, 345, lines.join('\n'), { ...style, fontSize: '19px', lineSpacing: 2, strokeThickness: 4 }).setOrigin(0.5);

    const count = this.add.text(480, 480, '', { ...style, fontSize: '18px', color: '#fff1b3', strokeThickness: 4 }).setOrigin(0.5);
    let left = 10;
    count.setText(`รอบใหม่ใน ${left} วินาที`);
    this.time.addEvent({ delay: 1000, repeat: 9, callback: () => { left -= 1; count.setText(`รอบใหม่ใน ${left} วินาที`); } });
    this.time.delayedCall(10000, () => this.scene.start('Play'));
  }

  update(time, delta) { this.backdrop.update(time, delta / 1000); }
}
