import Phaser from 'phaser';
import { WarScene } from './WarScene.js';
import { WarOverScene } from './WarOverScene.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 960,
  height: 540,
  backgroundColor: '#05010f',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [WarScene, WarOverScene],
});

// dev-only handle for automated screenshots
if (import.meta.env.DEV) window.__teamWar = game;
