// Team War: pure, deterministic game logic. No DOM, no Phaser, no randomness.
// Lane from x=0 (red base) to x=lane (blue base). Red ships fly right, blue ships fly left.

const STEP = 0.1;
export const TEAMS = ['red', 'blue'];
const other = (t) => (t === 'red' ? 'blue' : 'red');
const dir = (t) => (t === 'red' ? 1 : -1);

const newTeam = (cfg) => ({ hp: cfg.base.maxHp, power: 0, ships: [], mother: null, size: 0, turretCd: 0 });

export function createWar(cfg) {
  return {
    phase: 'playing',
    winner: null,
    timeLeft: cfg.roundSec,
    teams: { red: newTeam(cfg), blue: newTeam(cfg) },
    members: Object.create(null), // null prototype: viewer ids like '__proto__' are plain keys
    volleys: [],                  // visual hints for the scene; scene drains them
    artillery: [],
    nextId: 1,
  };
}

function teamOfWord(text, cfg) {
  if (typeof text !== 'string') return null;
  const w = text.trim().toLowerCase();
  for (const t of TEAMS) if (cfg.joinWords[t].includes(w)) return t;
  return null;
}

const smallerTeam = (war) => (war.teams.blue.size < war.teams.red.size ? 'blue' : 'red');

export function mapWarEvent(event, war, cfg) {
  if (!event || typeof event !== 'object') return null;
  const { userId, nickname } = event;
  const member = Object.hasOwn(war.members, userId) ? war.members[userId] : null;
  switch (event.type) {
    case 'comment': {
      const t = teamOfWord(event.text, cfg);
      if (!t) return null;
      if (!member) return { type: 'join', team: t, userId, nickname };
      return member.team === t ? { type: 'fire', team: t, userId, nickname } : null;
    }
    case 'like': {
      if (!member) return null;
      const n = Math.min(Math.max(Number(event.count) || 0, 0), cfg.power.maxLikesPerEvent);
      return n > 0 ? { type: 'power', team: member.team, amount: n * cfg.power.perLike, userId } : null;
    }
    case 'gift': {
      const d = Number(event.diamonds) || 0;
      if (d <= 0) return null;
      const type = d <= cfg.gifts.smallMaxDiamonds ? 'shield' : d <= cfg.gifts.mediumMaxDiamonds ? 'volley' : 'mother';
      const team = member ? member.team : smallerTeam(war);
      return { type, team, userId, nickname, join: !member };
    }
    default:
      return null;
  }
}

function credit(war, a) {
  if (!a.userId) return;
  const m = war.members[a.userId];
  if (m) m.score += 1;
}

function spawnShip(war, team, cfg) {
  const T = war.teams[team];
  if (T.ships.length >= cfg.maxShipsPerTeam) {
    // lane is full: the command still counts as artillery on the enemy base
    war.teams[other(team)].hp -= cfg.ship.overflowBaseDmg;
    if (war.artillery.length < 50) war.artillery.push({ team });
    return false;
  }
  T.ships.push({ id: war.nextId++, x: team === 'red' ? 0 : cfg.lane, hp: cfg.ship.hp, maxHp: cfg.ship.hp });
  return true;
}

function volley(war, team, cfg) {
  const E = war.teams[other(team)];
  for (const s of E.ships) s.hp -= cfg.power.volleyDmg;
  E.ships = E.ships.filter((s) => s.hp > 0);
  war.volleys.push({ team });
}

export function applyWar(war, a, cfg) {
  if (war.phase !== 'playing' || !a || !TEAMS.includes(a.team)) return false;
  const T = war.teams[a.team];
  if (a.join || a.type === 'join') {
    if (!Object.hasOwn(war.members, a.userId)) {
      war.members[a.userId] = { team: a.team, nickname: a.nickname || '', score: 0 };
      T.size += 1;
    }
  }
  switch (a.type) {
    case 'join':
    case 'fire':
      spawnShip(war, a.team, cfg);
      break;
    case 'power':
      T.power += a.amount;
      if (T.power >= cfg.power.max) { T.power = 0; volley(war, a.team, cfg); }
      return true; // likes are not scored
    case 'shield':
      T.hp = Math.min(cfg.base.maxHp, T.hp + cfg.gifts.shieldHp);
      break;
    case 'volley':
      volley(war, a.team, cfg);
      break;
    case 'mother': {
      const M = cfg.mothership;
      if (T.mother) T.mother.timeLeft += M.durationSec;
      else T.mother = { x: a.team === 'red' ? 0 : cfg.lane, hp: M.hp, maxHp: M.hp, timeLeft: M.durationSec };
      break;
    }
    default:
      return false;
  }
  credit(war, a);
  return true;
}

function nearest(list, x, range) {
  let best = null;
  for (const s of list) {
    const d = Math.abs(s.x - x);
    if (s.hp > 0 && d <= range && (!best || d < Math.abs(best.x - x))) best = s;
  }
  return best;
}

function step(war, dt, cfg) {
  war.timeLeft -= dt;
  for (const t of TEAMS) {
    const T = war.teams[t];
    T.power += cfg.power.passivePerSec * dt;
    if (T.power >= cfg.power.max) { T.power = 0; volley(war, t, cfg); }
  }

  for (const t of TEAMS) {
    const T = war.teams[t], E = war.teams[other(t)];
    const foes = E.mother ? [...E.ships, E.mother] : E.ships;
    const enemyBaseX = t === 'red' ? cfg.lane : 0;

    for (const s of T.ships) {
      const target = nearest(foes, s.x, cfg.ship.range);
      if (target) target.hp -= cfg.ship.dmg * dt;
      else s.x += dir(t) * cfg.ship.speed * dt;
      if ((t === 'red' && s.x >= cfg.lane) || (t === 'blue' && s.x <= 0)) {
        E.hp -= cfg.ship.baseDmg;
        s.hp = 0;
      }
    }

    if (T.mother) {
      const m = T.mother, M = cfg.mothership;
      const target = nearest(foes, m.x, M.range);
      const atBase = Math.abs(enemyBaseX - m.x) <= M.range;
      if (target) target.hp -= M.dmg * dt;
      else if (atBase) E.hp -= M.baseDps * dt;
      else m.x += dir(t) * M.speed * dt;
      m.timeLeft -= dt;
    }

    // base turret defends against enemy ships near this base
    T.turretCd -= dt;
    if (T.turretCd <= 0) {
      const baseX = t === 'red' ? 0 : cfg.lane;
      const target = nearest(E.ships, baseX, cfg.base.turretRange);
      if (target) { target.hp -= cfg.base.turretDmg; T.turretCd = cfg.base.turretIntervalSec; }
    }
  }

  for (const t of TEAMS) {
    const T = war.teams[t];
    T.ships = T.ships.filter((s) => s.hp > 0);
    if (T.mother && (T.mother.hp <= 0 || T.mother.timeLeft <= 0)) T.mother = null;
  }

  const r = war.teams.red, b = war.teams.blue;
  if (r.hp <= 0 || b.hp <= 0) {
    r.hp = Math.max(0, r.hp); b.hp = Math.max(0, b.hp);
    war.phase = 'ended';
    war.winner = r.hp === b.hp ? 'draw' : r.hp > b.hp ? 'red' : 'blue';
  } else if (war.timeLeft <= 1e-6) { // tolerance: float drift from many 0.1s steps
    war.timeLeft = 0;
    war.phase = 'ended';
    war.winner = Math.abs(r.hp - b.hp) < 1e-9 ? 'draw' : r.hp > b.hp ? 'red' : 'blue';
  }
}

export function tickWar(war, dtSec, cfg) {
  let left = dtSec;
  while (left > 1e-9 && war.phase === 'playing') {
    const dt = Math.min(left, STEP);
    step(war, dt, cfg);
    left -= dt;
  }
}

export function topByTeam(war, team, n) {
  return Object.values(war.members)
    .filter((m) => m.team === team)
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}
