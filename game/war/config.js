// All Team War balance values. Edit only this file to tune the game.
export const warConfig = {
  lane: 800,
  roundSec: 300,
  maxShipsPerTeam: 40,
  rateLimit: { commandsPerSec: 3 },
  base: { maxHp: 1500, turretRange: 150, turretDmg: 10, turretIntervalSec: 1 },
  ship: { hp: 20, dmg: 8, speed: 60, range: 20, baseDmg: 10, overflowBaseDmg: 0.6 },
  power: { max: 100, perLike: 1, maxLikesPerEvent: 20, passivePerSec: 0.5, volleyDmg: 20 },
  gifts: { smallMaxDiamonds: 9, mediumMaxDiamonds: 99, shieldHp: 25 },
  mothership: { hp: 200, dmg: 25, speed: 40, range: 30, durationSec: 15, baseDps: 8 },
  joinWords: { red: ['a', 'แดง', 'red'], blue: ['b', 'ฟ้า', 'blue'] },
};
