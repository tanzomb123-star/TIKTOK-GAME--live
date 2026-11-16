import { topByTeam } from './state.js';
import { sanitizeName } from '../core/safety.js';
import { FONT } from '../../overlay/hud.js';

export const TEAM_COLOR = { red: 0xff4d6d, blue: 0x4dc9ff };
export const TEAM_NAME = { red: 'ทีมแดง (A)', blue: 'ทีมฟ้า (B)' };
const STYLE = { fontFamily: FONT, color: '#eaf6ff', stroke: '#140a2e', strokeThickness: 4 };

// Copy must never ask or pressure viewers to send gifts (see docs/compliance.md).
export function createWarHud(scene, cfg) {
  const g = scene.add.graphics().setDepth(9);
  const t = (x, y, size, extra = {}) => scene.add.text(x, y, '', { ...STYLE, fontSize: `${size}px`, ...extra }).setDepth(10);

  const side = (team, x0, align) => ({
    name: t(align === 'left' ? x0 + 14 : x0 + 286, 18, 20, { color: team === 'red' ? '#ffb3c1' : '#b3ecff' }).setOrigin(align === 'left' ? 0 : 1, 0),
    hp: t(align === 'left' ? x0 + 14 : x0 + 286, 48, 14).setOrigin(align === 'left' ? 0 : 1, 0),
    top: t(align === 'left' ? x0 + 14 : x0 + 286, 104, 15, { align, lineSpacing: 2 }).setOrigin(align === 'left' ? 0 : 1, 0),
  });
  const L = side('red', 14, 'left');
  const R = side('blue', 646, 'right');
  const timer = t(480, 18, 30, { color: '#ffffff' }).setOrigin(0.5, 0);
  const sub = t(480, 56, 14, { color: '#ffd6f5' }).setOrigin(0.5, 0);
  const demo = t(480, 78, 16, { color: '#ff6b9a', fontStyle: 'bold' }).setOrigin(0.5, 0);
  const help = t(480, 512, 18, { color: '#fff1b3' }).setOrigin(0.5);
  help.setText('พิมพ์ A เข้าทีมแดง • B เข้าทีมฟ้า • พิมพ์ซ้ำเพื่อส่งยาน   |   ไลก์ชาร์จพลังทีม');
  sub.setText('ทำลายฐานฝั่งตรงข้าม');
  scene.tweens.add({ targets: help, alpha: 0.75, duration: 1200, yoyo: true, repeat: -1 });

  const bar = (x, y, w, ratio, color, rightAligned) => {
    g.fillStyle(0x000000, 0.5).fillRoundedRect(x, y, w, 10, 5);
    const f = Math.max(0, Math.min(1, ratio)) * w;
    if (f > 1) g.fillStyle(color).fillRoundedRect(rightAligned ? x + w - Math.max(f, 10) : x, y, Math.max(f, 10), 10, 5);
  };

  return {
    update(war, isDemo) {
      g.clear();
      for (const [team, x] of [['red', 14], ['blue', 646]]) {
        const c = TEAM_COLOR[team];
        g.fillStyle(0x0b0f2a, 0.62).fillRoundedRect(x, 12, 300, 172, 12);
        g.lineStyle(2, c, 0.9).strokeRoundedRect(x, 12, 300, 172, 12);
        const T = war.teams[team];
        bar(x + 14, 70, 272, T.hp / cfg.base.maxHp, c, team === 'blue');
        bar(x + 14, 86, 272, T.power / cfg.power.max, 0xffe066, team === 'blue');
      }
      g.fillStyle(0x0b0f2a, 0.62).fillRoundedRect(400, 12, 160, 64, 12);
      g.fillStyle(0x0b0f2a, 0.62).fillRoundedRect(150, 494, 660, 36, 12);
      g.lineStyle(2, 0x7a3dff, 0.85).strokeRoundedRect(150, 494, 660, 36, 12);

      for (const [team, S] of [['red', L], ['blue', R]]) {
        const T = war.teams[team];
        S.name.setText(`${TEAM_NAME[team]}  👥 ${T.size}`);
        S.hp.setText(`ฐาน ${Math.ceil(T.hp)}/${cfg.base.maxHp}   พลัง ${Math.floor(T.power)}%`);
        const top = topByTeam(war, team, 3);
        S.top.setText(top.length ? top.map((m, i) => `${i + 1}. ${sanitizeName(m.nickname)}  ${m.score}`).join('\n') : 'ยังไม่มีสมาชิก');
      }
      const s = Math.ceil(war.timeLeft);
      timer.setText(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
      demo.setText(isDemo ? 'DEMO' : '');
    },
  };
}
