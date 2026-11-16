import fs from 'node:fs';
import path from 'node:path';

// Fake audience during a real live = faking engagement. Refuse the combination.
export function assertModeAllowed(env, argv) {
  if (argv.includes('--mock') && env.TIKTOK_USERNAME) {
    throw new Error('Refusing to run --mock together with TIKTOK_USERNAME: a fake audience must never run during a real live.');
  }
}

// Returns how many files were deleted. Missing directory is fine.
export function pruneOldLogs(dir, maxAgeDays, nowMs) {
  let removed = 0;
  let names;
  try { names = fs.readdirSync(dir); } catch { return 0; }
  for (const n of names) {
    const f = path.join(dir, n);
    try {
      if (nowMs - fs.statSync(f).mtimeMs > maxAgeDays * 86400e3) { fs.unlinkSync(f); removed++; }
    } catch { /* ignore */ }
  }
  return removed;
}
