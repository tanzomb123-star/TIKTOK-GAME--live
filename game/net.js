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
