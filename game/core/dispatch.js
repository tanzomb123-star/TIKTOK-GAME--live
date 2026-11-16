import { mapEvent } from './events.js';
import { applyAction } from './state.js';

// One path for every live/keyboard event. Only summon commands are rate-limited, so chatting never eats a viewer's allowance.
export function handleLiveEvent(state, event, config, allow, nowMs) {
  if (!event || state.phase !== 'playing') return false;
  const action = mapEvent(event, config);
  if (!action) return false;
  if (action.type === 'summon' && !allow(String(event.userId), nowMs)) return false;
  return applyAction(state, action, config);
}
