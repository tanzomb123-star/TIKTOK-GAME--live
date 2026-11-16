import { WebSocketServer } from 'ws';

// Resolves once the server is listening. Pass port 0 for a random free port.
export function createHub(port) {
  return new Promise((resolve, reject) => {
    const wss = new WebSocketServer({ port });
    wss.once('error', reject);
    wss.once('listening', () => {
      resolve({
        port: wss.address().port,
        broadcast(event) {
          const data = JSON.stringify(event);
          for (const c of wss.clients) if (c.readyState === 1) c.send(data);
        },
        close: () =>
          new Promise((r) => {
            for (const c of wss.clients) c.terminate();
            wss.close(() => r());
          }),
      });
    });
  });
}
