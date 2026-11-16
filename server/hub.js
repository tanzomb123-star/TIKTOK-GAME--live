import { WebSocketServer } from 'ws';

// Resolves once the server is listening. Pass port 0 for a random free port.
// Binds to this computer only (127.0.0.1) so other devices on the network cannot read viewer names.
export function createHub(port, host = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    const wss = new WebSocketServer({ port, host });
    wss.once('error', reject);
    wss.once('listening', () => {
      resolve({
        port: wss.address().port,
        address: wss.address().address,
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
