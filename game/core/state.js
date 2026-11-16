// Pure game logic. No DOM, no Phaser, no randomness.
// World: 1-D lane. House at x=0, enemies spawn at x=SPAWN_X and walk toward 0.

export const SPAWN_X = 800;
const UNIT_START_X = 40;
const MELEE_RANGE = 20;
const STEP = 0.1;
// Every helpful action scores the same, so the board never ranks gifting above playing (docs/compliance.md).
const SCORE = { summon: 1, upgrade: 1, clear: 1, boss: 1 };

export function waveSize(wave, config) {
  return config.waves.baseCount + config.waves.countPerWave * (wave - 1);
}

export function createGame(config) {
  return {
    phase: 'playing',
    houseHp: config.house.maxHp,
    energy: config.energy.start,
    wave: 1,
    towerLevel: 0,
    towerCooldown: 0,
    units: [],
    enemies: [],
    boss: null,
    leaderboard: Object.create(null), // null prototype: viewer ids like '__proto__' must be plain keys
    log: [],
    nextId: 1,
    waveState: { spawned: 0, spawnTimer: 0, restLeft: null },
  };
}

function addScore(state, action, points) {
  if (!action.userId) return;
  const row = (state.leaderboard[action.userId] ||= { nickname: action.nickname || '', score: 0 });
  row.score += points;
}

export function applyAction(state, action, config) {
  if (state.phase !== 'playing' || !action) return false;
  switch (action.type) {
    case 'energy':
      state.energy = Math.min(config.energy.max, state.energy + action.amount);
      return true;
    case 'summon': {
      const def = config.units[action.unit];
      if (!def || state.energy < def.cost) return false;
      state.energy -= def.cost;
      state.units.push({ id: state.nextId++, kind: action.unit, x: UNIT_START_X, hp: def.hp, maxHp: def.hp });
      addScore(state, action, SCORE.summon);
      return true;
    }
    case 'upgrade':
      if (state.towerLevel >= config.tower.maxLevel) {
        // Tower already maxed: a small gift must still have a visible effect.
        state.energy = Math.min(config.energy.max, state.energy + config.tower.maxLevelGiftEnergy);
      } else {
        state.towerLevel += 1;
      }
      addScore(state, action, SCORE.upgrade);
      return true;
    case 'clear':
      state.enemies = [];
      addScore(state, action, SCORE.clear);
      return true;
    case 'boss':
      if (state.boss) state.boss.timeLeft += config.boss.durationSec; // extend, don't reset
      else state.boss = { x: UNIT_START_X, hp: config.boss.hp, maxHp: config.boss.hp, timeLeft: config.boss.durationSec };
      addScore(state, action, SCORE.boss);
      return true;
    default:
      return false;
  }
}

const nearest = (list, x, range) => {
  let best = null;
  for (const t of list) {
    const d = Math.abs(t.x - x);
    if (d <= range && (!best || d < Math.abs(best.x - x))) best = t;
  }
  return best;
};

function step(state, dt, config) {
  const w = config.waves;
  state.energy = Math.min(config.energy.max, state.energy + config.energy.passivePerSec * dt);

  // spawn
  const ws = state.waveState;
  if (ws.restLeft === null && ws.spawned < waveSize(state.wave, config)) {
    ws.spawnTimer -= dt;
    if (ws.spawnTimer <= 0) {
      const hp = w.baseHp + w.hpPerWave * (state.wave - 1);
      state.enemies.push({ id: state.nextId++, x: SPAWN_X, hp, maxHp: hp });
      ws.spawned += 1;
      ws.spawnTimer += w.spawnIntervalSec;
    }
  }

  // allies advance or fight (units and boss)
  const allies = state.boss ? [...state.units, state.boss] : state.units;
  for (const a of state.units) {
    const def = config.units[a.kind];
    const target = nearest(state.enemies, a.x, def.range);
    if (target) target.hp -= def.dmg * dt;
    else a.x = Math.min(SPAWN_X, a.x + def.speed * dt);
  }
  if (state.boss) {
    const b = state.boss;
    const target = nearest(state.enemies, b.x, MELEE_RANGE);
    if (target) target.hp -= config.boss.dmg * dt;
    else b.x = Math.min(SPAWN_X, b.x + config.boss.speed * dt);
    b.timeLeft -= dt;
  }

  // enemies advance, fight or reach the house
  for (const e of state.enemies) {
    if (e.hp <= 0) continue;
    const target = nearest(allies, e.x, MELEE_RANGE);
    if (target) target.hp -= w.enemyDmg * dt;
    else e.x -= w.enemySpeed * dt;
    if (e.x <= 0) {
      state.houseHp -= w.enemyDmg;
      e.hp = 0;
    }
  }

  // tower
  state.towerCooldown -= dt;
  if (state.towerCooldown <= 0) {
    const t = nearest(state.enemies.filter((e) => e.hp > 0), 0, config.tower.range);
    if (t) {
      t.hp -= config.tower.baseDmg + config.tower.dmgPerLevel * state.towerLevel;
      state.towerCooldown = config.tower.fireIntervalSec;
    }
  }

  // cleanup
  state.enemies = state.enemies.filter((e) => e.hp > 0);
  state.units = state.units.filter((u) => u.hp > 0);
  if (state.boss && (state.boss.hp <= 0 || state.boss.timeLeft <= 0)) state.boss = null;

  if (state.houseHp <= 0) {
    state.houseHp = 0;
    state.phase = 'lost';
    return;
  }

  // wave progression
  if (ws.restLeft === null && ws.spawned >= waveSize(state.wave, config) && state.enemies.length === 0) {
    if (state.wave >= w.total) state.phase = 'won';
    else ws.restLeft = w.restSec;
  } else if (ws.restLeft !== null) {
    ws.restLeft -= dt;
    if (ws.restLeft <= 0) {
      state.wave += 1;
      state.waveState = { spawned: 0, spawnTimer: 0, restLeft: null };
    }
  }
}

export function tick(state, dtSec, config) {
  let left = dtSec;
  while (left > 1e-9 && state.phase === 'playing') {
    const dt = Math.min(left, STEP);
    step(state, dt, config);
    left -= dt;
  }
}

export function topHelpers(state, n) {
  return Object.values(state.leaderboard)
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}
