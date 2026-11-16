// Hub address: ws://<host>:8080, or ?port=NNNN in the page URL to match a server started with PORT=NNNN.
export function hubUrl(loc) {
  const p = Number(new URLSearchParams(loc.search || '').get('port'));
  const port = Number.isInteger(p) && p > 0 && p < 65536 ? p : 8080;
  return `ws://${loc.hostname || 'localhost'}:${port}`;
}

// WebSocket client that reconnects every 2s when the hub is unavailable.
export function connect(url, onEvent) {
  let ws;
  let closed = false;
  let timer;
  const open = () => {
    if (closed) return;
    try {
      ws = new WebSocket(url);
    } catch {
      timer = setTimeout(open, 2000);
      return;
    }
    ws.onmessage = (m) => {
      try { onEvent(JSON.parse(m.data)); } catch { /* ignore malformed */ }
    };
    ws.onclose = () => { if (!closed) timer = setTimeout(open, 2000); };
    ws.onerror = () => ws.close();
  };
  open();
  return { close() { closed = true; clearTimeout(timer); ws && ws.close(); } };
}
