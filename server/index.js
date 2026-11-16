import { createHub } from './hub.js';
import { startMock } from './mock.js';

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
  startTikTok(user, (e) => hub.broadcast(e));
}
