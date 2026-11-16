import { describe, it, expect } from 'vitest';
import { sanitizeName, hashUserId } from '../game/core/safety.js';

describe('sanitizeName', () => {
  it('sanitizeName truncates to 16 chars', () => {
    expect(sanitizeName('a'.repeat(40))).toHaveLength(16);
  });
  it('sanitizeName masks blocklisted words (case-insensitive)', () => {
    expect(sanitizeName('xxFUCKyy')).toBe('xx***yy');
    expect(sanitizeName('สวัสดีควยนะ')).toBe('สวัสดี***นะ');
  });
  it('sanitizeName strips control chars', () => {
    expect(sanitizeName('a\u0000b\nc')).toBe('abc');
  });
  it('non-string input becomes empty string', () => {
    expect(sanitizeName(undefined)).toBe('');
    expect(sanitizeName(42)).toBe('');
  });
});

describe('hashUserId', () => {
  it('is stable, short and does not contain the input', () => {
    const h = hashUserId('some_user_name');
    expect(h).toBe(hashUserId('some_user_name'));
    expect(h).toHaveLength(10);
    expect(h).not.toContain('some');
    expect(hashUserId('other')).not.toBe(h);
  });
});
