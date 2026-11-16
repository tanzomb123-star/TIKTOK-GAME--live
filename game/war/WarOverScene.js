import Phaser from 'phaser';
import { sanitizeName } from '../core/safety.js';
import { createCosmicTextures } from '../scenes/textures.js';
import { createBackdrop } from '../scenes/background.js';
import { FONT } from '../../overlay/hud.js';
import { sfx } from '../audio.js';
import { TEAM_COLOR } from './hud.js';

export class WarOverScene extends Phaser.Scene {
  constructor() { super('WarOver'); }

  init(data) { this.result = data; }

  create() {
    createCosmicTextures(this);
    this.backdrop = createBackdrop(this, { planet: { x: 480, y: 450 } });
    const { winner } = this.result;
    sfx().play('win');
    const color = winner === 'draw' ? 0xffe066 : TEAM_COLOR[winner];
    const style = { fontFamily: FONT, color: '#ffffff', stroke: '#140a2e', strokeThickness: 6, align: 'center' };
    this.add.image(480, 140, 'glow').setScale(5, 2).setTint(color).setAlpha(0.4).setBlendMode(Phaser.BlendModes.ADD);
    const title = winner === 'draw' ? 'เสมอ!' : winner === 'red' ? 'ทีมแดงชนะ!' : 'ทีมฟ้าชนะ!';
    const tt = this.add.text(480, 140, title, { ...style, fontSize: '56px' }).setOrigin(0.5).setScale(0.6);
    this.tweens.add({ targets: tt, scale: 1, duration: 500, ease: 'Back.Out' });

    const g = this.add.graphics();
    for (const [team, x] of [['red', 170], ['blue', 500]]) {
      g.fillStyle(0x0b0f2a, 0.65).fillRoundedRect(x, 230, 290, 170, 14);
      g.lineStyle(2, TEAM_COLOR[team], 0.9).strokeRoundedRect(x, 230, 290, 170, 14);
      const list = this.result[team];
      const lines = [team === 'red' ? 'ผู้ช่วยเด่น ทีมแดง' : 'ผู้ช่วยเด่น ทีมฟ้า', ...(list.length ? list.map((m, i) => `${i + 1}. ${sanitizeName(m.nickname)}  ${m.score}`) : ['-'])];
      this.add.text(x + 145, 315, lines.join('\n'), { ...style, fontSize: '19px', lineSpacing: 4, strokeThickness: 4 }).setOrigin(0.5);
    }
    const count = this.add.text(480, 460, '', { ...style, fontSize: '18px', color: '#fff1b3', strokeThickness: 4 }).setOrigin(0.5);
    let left = 10;
    count.setText(`รอบใหม่ใน ${left} วินาที`);
    this.time.addEvent({ delay: 1000, repeat: 9, callback: () => { left -= 1; count.setText(`รอบใหม่ใน ${left} วินาที`); } });
    this.time.delayedCall(10000, () => this.scene.start('War'));
  }

  update(time, delta) { this.backdrop.update(time, delta / 1000); }
}
