// All balance values live here. Edit this file only to tune the game.
export const config = {
  house: { maxHp: 100 },
  energy: { start: 10, max: 50, passivePerSec: 0.5, perLike: 1, maxLikesPerEvent: 20 },
  rateLimit: { commandsPerSec: 3 },
  units: {
    soldier: { cost: 5, hp: 30, dmg: 6, speed: 40 },
    archer: { cost: 8, hp: 18, dmg: 10, speed: 30 },
    knight: { cost: 12, hp: 80, dmg: 8, speed: 35 },
  },
  commands: { '1': 'soldier', '2': 'archer', '3': 'knight' },
  gifts: { smallMaxDiamonds: 9, mediumMaxDiamonds: 99 },
  waves: {
    total: 10, baseCount: 5, countPerWave: 3, baseHp: 20, hpPerWave: 5,
    enemyDmg: 5, enemySpeed: 25, spawnIntervalSec: 1.2, restSec: 4,
  },
  tower: { baseDmg: 4, dmgPerLevel: 2, maxLevel: 5, range: 220, fireIntervalSec: 1 },
  boss: { hp: 300, dmg: 20, durationSec: 20 },
  clearAllDamage: 9999,
};
