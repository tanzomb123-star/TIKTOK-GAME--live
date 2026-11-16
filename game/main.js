import Phaser from 'phaser';
import { PlayScene } from './scenes/PlayScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 960,
  height: 540,
  backgroundColor: '#111',
  scene: [PlayScene, GameOverScene],
});
