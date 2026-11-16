import { topHelpers } from '../game/core/state.js';

const STYLE = { fontFamily: 'sans-serif', color: '#fff', stroke: '#000', strokeThickness: 3 };

// Text overlay. Copy must never ask or pressure viewers to send gifts (see docs/compliance.md).
export function createHud(scene, config) {
  const t = (x, y, size, extra = {}) => scene.add.text(x, y, '', { ...STYLE, fontSize: `${size}px`, ...extra }).setDepth(10);
  const title = t(16, 12, 26);
  const hp = t(16, 46, 22);
  const energy = t(16, 76, 22);
  const help = t(16, 508, 20, { color: '#ffe27a' });
  const board = t(944, 12, 20, { align: 'right' }).setOrigin(1, 0);
  const demo = t(480, 8, 24, { color: '#ff6b6b' }).setOrigin(0.5, 0);
  help.setText('พิมพ์ 1/2/3 เรียกทหาร • ไลก์ช่วยเติมพลังงาน');
  return {
    update(state, isDemo) {
      title.setText(`เวฟ ${state.wave}/${config.waves.total}`);
      hp.setText(`บ้าน HP ${Math.ceil(state.houseHp)}/${config.house.maxHp}`);
      energy.setText(`พลังงาน ${Math.floor(state.energy)}/${config.energy.max}`);
      const top = topHelpers(state, 5);
      board.setText(['ผู้ช่วยเด่น', ...top.map((r, i) => `${i + 1}. ${r.nickname} ${r.score}`)].join('\n'));
      demo.setText(isDemo ? 'DEMO' : '');
    },
  };
}
