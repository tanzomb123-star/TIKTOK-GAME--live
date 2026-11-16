import { describe, it, expect } from 'vitest';
import { assertModeAllowed } from '../server/guard.js';

describe('assertModeAllowed', () => {
  it('mock together with TIKTOK_USERNAME throws', () => {
    expect(() => assertModeAllowed({ TIKTOK_USERNAME: 'me' }, ['--mock'])).toThrow(/mock/i);
  });
  it('mock alone ok', () => {
    expect(() => assertModeAllowed({}, ['--mock'])).not.toThrow();
  });
  it('tiktok alone ok', () => {
    expect(() => assertModeAllowed({ TIKTOK_USERNAME: 'me' }, [])).not.toThrow();
  });
  it('empty TIKTOK_USERNAME counts as unset', () => {
    expect(() => assertModeAllowed({ TIKTOK_USERNAME: '' }, ['--mock'])).not.toThrow();
  });
});

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pruneOldLogs } from '../server/guard.js';

describe('pruneOldLogs', () => {
  it('deletes files older than maxAgeDays and keeps newer ones', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-logs-'));
    const old = path.join(dir, 'old.jsonl');
    const fresh = path.join(dir, 'fresh.jsonl');
    fs.writeFileSync(old, 'x');
    fs.writeFileSync(fresh, 'x');
    const now = Date.now();
    fs.utimesSync(old, new Date(now - 8 * 86400e3), new Date(now - 8 * 86400e3));
    expect(pruneOldLogs(dir, 7, now)).toBe(1);
    expect(fs.existsSync(old)).toBe(false);
    expect(fs.existsSync(fresh)).toBe(true);
  });
  it('missing directory is not an error', () => {
    expect(pruneOldLogs('/nonexistent/dir/xyz', 7, Date.now())).toBe(0);
  });
});
