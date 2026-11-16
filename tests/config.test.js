import { describe, it, expect } from 'vitest';
import { config } from '../game/config.js';

describe('config', () => {
  it('config has required keys', () => {
    expect(config.waves.total).toBe(10);
    expect(config.commands['1']).toBe('soldier');
    for (const u of Object.values(config.units)) {
      for (const k of ['cost', 'hp', 'dmg', 'speed']) {
        expect(u[k]).toBeGreaterThan(0);
      }
    }
  });
});
