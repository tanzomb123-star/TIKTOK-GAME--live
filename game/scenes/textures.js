// Procedural cosmic art. Everything is drawn in code: no external image files, no licensing questions.
// Randomness here is visual only (star placement); game logic stays deterministic.

function make(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  draw(g, w, h);
  g.generateTexture(key, w, h);
  g.destroy();
}

function softCircle(g, cx, cy, r, color, alpha = 1, steps = 14) {
  for (let i = steps; i > 0; i--) {
    g.fillStyle(color, (alpha * (1 - i / steps)) / 3 + 0.004);
    g.fillCircle(cx, cy, (r * i) / steps);
  }
}

function starLayer(scene, key, count, maxR, tint) {
  make(scene, key, 512, 540, (g) => {
    for (let i = 0; i < count; i++) {
      const x = Math.random() * 512, y = Math.random() * 540, r = Math.random() * maxR + 0.4;
      g.fillStyle(tint[i % tint.length], 0.4 + Math.random() * 0.6);
      g.fillCircle(x, y, r);
    }
  });
}

export function createCosmicTextures(scene) {
  starLayer(scene, 'stars-far', 220, 0.8, [0xffffff, 0xb8c6ff]);
  starLayer(scene, 'stars-mid', 90, 1.3, [0xffffff, 0x9fe7ff, 0xffd6f5]);
  starLayer(scene, 'stars-near', 35, 2, [0xffffff, 0xfff1b3]);

  make(scene, 'particle', 16, 16, (g) => softCircle(g, 8, 8, 8, 0xffffff, 1, 8));
  make(scene, 'glow', 128, 128, (g) => softCircle(g, 64, 64, 64, 0xffffff, 1, 24));
  make(scene, 'nebula', 256, 256, (g) => softCircle(g, 128, 128, 128, 0xffffff, 0.7, 30));

  make(scene, 'planet', 200, 200, (g) => {
    g.fillStyle(0x3b1d6e).fillCircle(100, 100, 90);
    const bands = [0x56309a, 0x6c3fb8, 0x4a2786, 0x7e52cc, 0x5a34a0];
    bands.forEach((c, i) => { g.fillStyle(c, 0.55).fillEllipse(100, 40 + i * 30, 175 - Math.abs(2 - i) * 22, 14); });
    g.fillStyle(0x000010, 0.45).fillCircle(130, 115, 88); // terminator shadow
    g.lineStyle(2, 0xb48cff, 0.35).strokeCircle(100, 100, 91);
  });

  make(scene, 'station', 140, 180, (g) => {
    g.fillStyle(0x1b2a4a).fillRoundedRect(40, 20, 60, 140, 14);
    g.fillStyle(0x24395f).fillRoundedRect(48, 28, 44, 124, 10);
    g.fillStyle(0x0e1630).fillRect(8, 80, 124, 20);           // solar arm
    for (let i = 0; i < 4; i++) {
      g.fillStyle(0x2a6fdb, 0.9).fillRect(10 + i * 8, 70, 6, 40);
      g.fillStyle(0x2a6fdb, 0.9).fillRect(98 + i * 8, 70, 6, 40);
    }
    g.lineStyle(3, 0x5ff2ff, 0.9).strokeCircle(70, 90, 26);   // docking ring
    g.fillStyle(0x5ff2ff, 0.25).fillCircle(70, 90, 24);
    g.fillStyle(0x9ff8ff).fillCircle(70, 40, 9);              // dome
    for (let i = 0; i < 5; i++) g.fillStyle(i % 2 ? 0xff6bd6 : 0x5ff2ff).fillCircle(56 + i * 7, 140, 2.2);
  });

  // allied ships face right
  make(scene, 'ship-soldier', 48, 32, (g) => {
    g.fillStyle(0x5ff2ff, 0.35).fillEllipse(8, 16, 14, 8);
    g.fillStyle(0x2b8cff).fillTriangle(6, 4, 6, 28, 46, 16);
    g.fillStyle(0x9fd8ff).fillTriangle(14, 10, 14, 22, 34, 16);
    g.fillStyle(0xffffff).fillCircle(30, 16, 3);
  });
  make(scene, 'ship-archer', 56, 28, (g) => {
    g.fillStyle(0x7dff9b, 0.35).fillEllipse(8, 14, 14, 8);
    g.fillStyle(0x1fbf63).fillRoundedRect(6, 8, 34, 12, 5);
    g.fillStyle(0x7dff9b).fillRect(36, 12, 18, 4);            // long barrel
    g.fillStyle(0x1fbf63).fillTriangle(10, 8, 22, 8, 12, 0);
    g.fillStyle(0x1fbf63).fillTriangle(10, 20, 22, 20, 12, 28);
    g.fillStyle(0xd9ffe4).fillCircle(26, 14, 3);
  });
  make(scene, 'ship-knight', 56, 44, (g) => {
    g.fillStyle(0xffd24d, 0.35).fillEllipse(8, 22, 16, 12);
    g.fillStyle(0xb8860b).fillRoundedRect(6, 8, 36, 28, 8);
    g.fillStyle(0xffd24d).fillRoundedRect(12, 12, 26, 20, 6);
    g.lineStyle(3, 0xfff1b3, 0.95).beginPath();
    g.arc(30, 22, 20, -Math.PI / 2.4, Math.PI / 2.4).strokePath(); // energy shield
    g.fillStyle(0xffffff).fillCircle(26, 22, 3);
  });

  // light, neutral versions meant to be tinted per team (Team War)
  make(scene, 'ship-white', 48, 32, (g) => {
    g.fillStyle(0xffffff, 0.35).fillEllipse(8, 16, 14, 8);
    g.fillStyle(0xd8d8e8).fillTriangle(6, 4, 6, 28, 46, 16);
    g.fillStyle(0xffffff).fillTriangle(14, 10, 14, 22, 34, 16);
    g.fillStyle(0x30304a).fillCircle(30, 16, 3);
  });
  make(scene, 'boss-white', 130, 80, (g) => {
    g.fillStyle(0xffffff, 0.25).fillEllipse(65, 44, 128, 40);
    g.fillStyle(0x9a9ab8).fillEllipse(65, 40, 120, 34);
    g.fillStyle(0xd8d8ea).fillEllipse(65, 36, 96, 22);
    g.fillStyle(0xffffff, 0.95).fillEllipse(65, 22, 40, 26);
    for (let i = 0; i < 7; i++) g.fillStyle(0xffffff).fillCircle(20 + i * 15, 44, 3);
  });

  // enemies face left
  make(scene, 'alien', 46, 34, (g) => {
    g.fillStyle(0xff3d7f, 0.3).fillEllipse(23, 26, 44, 10);
    g.fillStyle(0x8a1c4a).fillEllipse(23, 21, 44, 14);
    g.fillStyle(0xd12d6b).fillEllipse(23, 19, 36, 9);
    g.fillStyle(0x7dfcb4, 0.85).fillEllipse(23, 12, 18, 14);  // glass dome
    g.fillStyle(0x0b3d24).fillCircle(20, 12, 2.5).fillCircle(27, 12, 2.5);
    for (let i = 0; i < 4; i++) g.fillStyle(0xffe066).fillCircle(9 + i * 9.5, 22, 1.8);
  });
  make(scene, 'boss', 130, 80, (g) => {
    g.fillStyle(0xb06bff, 0.25).fillEllipse(65, 44, 128, 40);
    g.fillStyle(0x3d1f6e).fillEllipse(65, 40, 120, 34);
    g.fillStyle(0x6a35b8).fillEllipse(65, 36, 96, 22);
    g.fillStyle(0xe0c3ff, 0.9).fillEllipse(65, 22, 40, 26);
    g.fillStyle(0xffffff).fillCircle(65, 22, 6);
    for (let i = 0; i < 7; i++) g.fillStyle(i % 2 ? 0x5ff2ff : 0xff6bd6).fillCircle(20 + i * 15, 44, 3);
  });
}
