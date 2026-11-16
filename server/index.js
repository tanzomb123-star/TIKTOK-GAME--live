import { createHub } from './hub.js';
import { startMock } from './mock.js';
import { assertModeAllowed, pruneOldLogs } from './guard.js';
import { hashUserId } from '../game/core/safety.js';

try { assertModeAllowed(process.env, process.argv); } catch (e) { console.error(e.message); process.exit(1); }
pruneOldLogs('logs', 7, Date.now());
const useMock = process.argv.includes('--mock');
const hub = await createHub(Number(process.env.PORT) || 8080);
console.log(`WebSocket hub on ws://localhost:${hub.port}`);

if (useMock) {
  console.log('MOCK mode: fake audience (do not use during a real live)');
  startMock((e) => hub.broadcast(e));
} else {
  const { startTikTok } = await import('./tiktok.js');
  const user = process.env.TIKTOK_USERNAME;
  if (!user) {
    console.error('Set TIKTOK_USERNAME (e.g. TIKTOK_USERNAME=yourname npm run server) or use npm run mock');
    process.exit(1);
  }
  // Logs keep only a pseudonymous id and the event kind, never names or free-text comments.
  const toLog = (e) => ({ type: e.type, uid: hashUserId(e.userId), count: e.count, diamonds: e.diamonds, cmd: e.type === 'comment' && /^\s*[123]\s*$/.test(e.text) ? e.text.trim() : undefined });
  startTikTok(user, (e) => hub.broadcast(e), { toLog });
}
