import { topHelpers } from '../game/core/state.js';
import { sanitizeName } from '../game/core/safety.js';

export const FONT = 'Kanit, "Noto Sans Thai", sans-serif';
const NEON = { fontFamily: FONT, color: '#eaf6ff', stroke: '#140a2e', strokeThickness: 4 };

// Glass panels with neon edges. Copy must never ask or pressure viewers to send gifts (see docs/compliance.md).
export function createHud(scene, config) {
  const g = scene.add.graphics().setDepth(9);
  const t = (x, y, size, extra = {}) =>
    scene.add.text(x, y, '', { ...NEON, fontSize: `${size}px`, ...extra }).setDepth(10);

  const panel = (x, y, w, h, edge) => {
    g.fillStyle(0x0b0f2a, 0.62).fillRoundedRect(x, y, w, h, 12);
    g.lineStyle(2, edge, 0.85).strokeRoundedRect(x, y, w, h, 12);
  };

  const wave = t(28, 20, 24, { color: '#ffffff' });
  const hpLabel = t(28, 56, 16, { color: '#9fd8ff' });
  const enLabel = t(28, 90, 16, { color: '#ffd6f5' });
  const boardTitle = t(932, 18, 18, { color: '#ffe066' }).setOrigin(1, 0);
  const board = t(932, 46, 17, { align: 'right', lineSpacing: 6 }).setOrigin(1, 0);
  const help = t(480, 512, 20, { color: '#fff1b3' }).setOrigin(0.5, 0.5);
  const demo = t(480, 22, 20, { color: '#ff6b9a', fontStyle: 'bold' }).setOrigin(0.5, 0);
  help.setText('พิมพ์  1 ยานรบ  •  2 ยานซุ่มยิง  •  3 ยานโล่    |    ไลก์ช่วยเติมพลังงาน');
  boardTitle.setText('★ ผู้ช่วยเด่น');
  scene.tweens.add({ targets: help, alpha: 0.75, duration: 1200, yoyo: true, repeat: -1 });
  scene.tweens.add({ targets: demo, alpha: 0.45, duration: 600, yoyo: true, repeat: -1 });

  const bar = (x, y, w, ratio, from, to) => {
    g.fillStyle(0x000000, 0.5).fillRoundedRect(x, y, w, 12, 6);
    const fill = Math.max(0, Math.min(1, ratio)) * w;
    if (fill > 1) {
      g.fillGradientStyle(from, to, from, to, 1);
      g.fillRoundedRect(x, y, Math.max(fill, 12), 12, 6);
    }
  };

  return {
    update(state, isDemo) {
      g.clear();
      panel(14, 12, 300, 108, 0x5ff2ff);
      panel(726, 12, 220, 176, 0xff6bd6);
      panel(160, 492, 640, 40, 0x7a3dff);

      wave.setText(`WAVE ${state.wave} / ${config.waves.total}`);
      hpLabel.setText(`สถานี  ${Math.ceil(state.houseHp)}/${config.house.maxHp}`);
      enLabel.setText(`พลังงาน  ${Math.floor(state.energy)}/${config.energy.max}`);
      bar(176, 60, 122, state.houseHp / config.house.maxHp, 0x2b8cff, 0x5ff2ff);
      bar(176, 94, 122, state.energy / config.energy.max, 0x7a3dff, 0xff6bd6);

      const top = topHelpers(state, 5);
      board.setText(top.length ? top.map((r, i) => `${i + 1}. ${sanitizeName(r.nickname)}  ${r.score}`).join('\n') : 'ยังไม่มี');
      demo.setText(isDemo ? 'DEMO' : '');
    },
  };
}
