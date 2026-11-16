// Pure mapping from normalized live events to game actions.

export function mapEvent(event, config) {
  if (!event || typeof event !== 'object') return null;
  const { userId, nickname } = event;
  switch (event.type) {
    case 'comment': {
      const text = typeof event.text === 'string' ? event.text.trim() : '';
      const unit = Object.hasOwn(config.commands, text) ? config.commands[text] : undefined;
      return unit ? { type: 'summon', unit, userId, nickname } : null;
    }
    case 'like': {
      const n = Math.min(Math.max(Number(event.count) || 0, 0), config.energy.maxLikesPerEvent);
      return n > 0 ? { type: 'energy', amount: n * config.energy.perLike } : null;
    }
    case 'gift': {
      const d = Number(event.diamonds) || 0;
      if (d <= 0) return null;
      if (d <= config.gifts.smallMaxDiamonds) return { type: 'upgrade', userId, nickname };
      if (d <= config.gifts.mediumMaxDiamonds) return { type: 'clear', userId, nickname };
      return { type: 'boss', userId, nickname };
    }
    default:
      return null;
  }
}

export function createRateLimiter(commandsPerSec) {
  const hits = new Map();
  return (userId, nowMs) => {
    const recent = (hits.get(userId) || []).filter((t) => nowMs - t < 1000);
    if (recent.length >= commandsPerSec) {
      hits.set(userId, recent);
      return false;
    }
    recent.push(nowMs);
    hits.set(userId, recent);
    return true;
  };
}
