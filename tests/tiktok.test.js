import { describe, it, expect } from 'vitest';
import { normalize } from '../server/tiktok.js';

const user = { uniqueId: 'abc', nickname: 'Abc N', userId: '123' };

describe('normalize', () => {
  it('normalize maps chat to comment', () => {
    expect(normalize({ user, content: '1' }, 'chat')).toEqual({ type: 'comment', userId: 'abc', nickname: 'Abc N', text: '1' });
  });
  it('accepts the legacy chat shape (comment field)', () => {
    expect(normalize({ user, comment: '2' }, 'chat').text).toBe('2');
  });
  it('normalize maps like using count (and legacy likeCount)', () => {
    expect(normalize({ user, count: 3 }, 'like').count).toBe(3);
    expect(normalize({ user, likeCount: 4 }, 'like').count).toBe(4);
  });
  it('normalize maps gift using diamondCount*repeatCount', () => {
    const e = normalize({ user, repeatCount: 3, repeatEnd: 1, gift: { type: 1, diamondCount: 10 } }, 'gift');
    expect(e).toEqual({ type: 'gift', userId: 'abc', nickname: 'Abc N', diamonds: 30 });
  });
  it('ignores streak gifts still in progress (type 1, repeatEnd 0)', () => {
    expect(normalize({ user, repeatCount: 2, repeatEnd: 0, gift: { type: 1, diamondCount: 10 } }, 'gift')).toBeNull();
  });
  it('counts non-streak gifts immediately', () => {
    expect(normalize({ user, repeatCount: 1, repeatEnd: 0, gift: { type: 2, diamondCount: 5 } }, 'gift').diamonds).toBe(5);
  });
  it('normalize maps member to join', () => {
    expect(normalize({ user }, 'member').type).toBe('join');
  });
  it('normalize returns null for malformed input', () => {
    for (const raw of [null, undefined, {}, 5, 'x', { content: '1' }, { user: {}, content: '1' }]) {
      expect(normalize(raw, 'chat')).toBeNull();
    }
    expect(normalize({ user }, 'unknown-kind')).toBeNull();
  });
});
