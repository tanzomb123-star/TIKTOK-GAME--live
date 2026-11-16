// Fake audience for local testing ONLY. Every event carries mock:true so the game shows a DEMO badge.
const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

// commands: when given, each mock viewer always uses commands[id % length] (e.g. a fixed team in Team War).
export function startMock(emit, { minMs = 300, maxMs = 900, commands } = {}) {
  let timer;
  let n = 0;
  const next = () => {
    timer = setTimeout(() => {
      const r = Math.random();
      const id = rand(1, 30);
      const who = { userId: `mock-${id}`, nickname: `Demo${id}`, mock: true };
      const text = commands ? commands[id % commands.length] : String(rand(1, 3));
      if (r < 0.55) emit({ type: 'comment', text, ...who });
      else if (r < 0.95) emit({ type: 'like', count: rand(1, 10), ...who });
      else emit({ type: 'gift', diamonds: [1, 20, 150][rand(0, 2)], ...who });
      n += 1;
      next();
    }, rand(minMs, maxMs));
  };
  next();
  return () => clearTimeout(timer);
}
