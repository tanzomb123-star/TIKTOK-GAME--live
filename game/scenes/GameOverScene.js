import Phaser from 'phaser';
import { sanitizeName } from '../core/safety.js';

export class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOver'); }

  init(data) { this.result = data; }

  create() {
    const won = this.result.phase === 'won';
    const style = { fontFamily: 'sans-serif', color: '#fff', stroke: '#000', strokeThickness: 5, align: 'center' };
    this.add.text(480, 140, won ? 'ชนะแล้ว! รอดครบ 10 เวฟ' : 'บ้านพังแล้ว', { ...style, fontSize: '48px' }).setOrigin(0.5);
    const lines = ['ผู้ช่วยเด่น', ...this.result.top.map((r, i) => `${i + 1}. ${sanitizeName(r.nickname)} ${r.score}`)];
    this.add.text(480, 300, lines.join('\n'), { ...style, fontSize: '26px' }).setOrigin(0.5);
    this.add.text(480, 480, 'เริ่มรอบใหม่ใน 10 วินาที', { ...style, fontSize: '20px' }).setOrigin(0.5);
    this.time.delayedCall(10000, () => this.scene.start('Play'));
  }
}
