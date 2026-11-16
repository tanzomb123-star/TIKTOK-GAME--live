import { BLOCKLIST } from './blocklist.js';

const MAX_NAME = 16;
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const BLOCK_RE = new RegExp(BLOCKLIST.map(escapeRe).join('|'), 'giu');

// Names and comments come from strangers; clean them before they appear on a live stream.
export function sanitizeName(name) {
  if (typeof name !== 'string') return '';
  // NFKC folds look-alikes (full-width letters); Cc/Cf removal drops control, zero-width and bidi-override characters.
  const clean = name.normalize('NFKC').replace(/[\p{Cc}\p{Cf}]/gu, '').replace(BLOCK_RE, '***');
  return Array.from(clean).slice(0, MAX_NAME).join('');
}

// Browser-safe, dependency-free 10-char pseudonym (FNV-1a x2 -> hex). Not for security, only to avoid storing raw ids.
export function hashUserId(userId) {
  const s = String(userId);
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < s.length; i++) {
    h1 = Math.imul(h1 ^ s.charCodeAt(i), 0x01000193) >>> 0;
    h2 = Math.imul(h2 + s.charCodeAt(i), 0x85ebca6b) >>> 0;
  }
  return (h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')).slice(0, 10);
}
