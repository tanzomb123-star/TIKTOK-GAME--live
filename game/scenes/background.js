import Phaser from 'phaser';

// Shared cosmic backdrop: gradient sky, nebulae, a planet and three parallax star layers.
export function createBackdrop(scene, { planet: planetPos = { x: 560, y: 120 } } = {}) {
  const sky = scene.add.graphics().setDepth(-100);
  sky.fillGradientStyle(0x05010f, 0x0b0626, 0x1a0b3d, 0x090320, 1);
  sky.fillRect(0, 0, 960, 540);

  const neb = (x, y, s, tint, a) =>
    scene.add.image(x, y, 'nebula').setScale(s).setTint(tint).setAlpha(a).setBlendMode(Phaser.BlendModes.ADD).setDepth(-90);
  const nebulae = [neb(700, 120, 2.6, 0xff3dbb, 0.35), neb(260, 420, 2.2, 0x3d7bff, 0.3), neb(520, 260, 1.8, 0x7a3dff, 0.25)];

  const planet = scene.add.image(planetPos.x, planetPos.y, 'planet').setScale(0.55).setDepth(-80).setAlpha(0.9);
  const layers = [
    scene.add.tileSprite(480, 270, 960, 540, 'stars-far').setDepth(-85),
    scene.add.tileSprite(480, 270, 960, 540, 'stars-mid').setDepth(-70),
    scene.add.tileSprite(480, 270, 960, 540, 'stars-near').setDepth(-60),
  ];
  const speeds = [4, 10, 22];

  return {
    update(timeMs, dtSec) {
      layers.forEach((l, i) => { l.tilePositionX += speeds[i] * dtSec; });
      nebulae.forEach((n, i) => n.setAlpha(0.25 + 0.08 * Math.sin(timeMs / 2400 + i * 2)));
      planet.rotation = Math.sin(timeMs / 9000) * 0.03;
    },
  };
}
