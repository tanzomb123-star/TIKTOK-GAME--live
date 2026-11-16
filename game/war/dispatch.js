import { mapWarEvent, applyWar } from './state.js';

// Only ship commands (join/fire) are rate-limited, so chatting never eats a viewer's allowance.
export function handleWarEvent(war, event, cfg, allow, nowMs) {
  if (!event || war.phase !== 'playing') return false;
  const action = mapWarEvent(event, war, cfg);
  if (!action) return false;
  if ((action.type === 'join' || action.type === 'fire') && !allow(String(event.userId), nowMs)) return false;
  return applyWar(war, action, cfg);
}
