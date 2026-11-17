import { afterEach, describe, expect, it } from 'vitest';
import type { SimEvent } from '@qnm/shared';
import { cuesFor } from '../src/audio/cues';
import { loadSettings, saveSettings } from '../src/settings';

const trash = (playerId: string): SimEvent => ({ type: 'trash', shopId: 'banh_mi', playerId, item: 'banh_mi', value: 2000, x: 0, z: 0 });

describe('cuesFor', () => {
  it('pick when my stack grows, drop when it shrinks', () => {
    expect(cuesFor(1, 2, [], 'me')).toEqual(['pick']);
    expect(cuesFor(2, 1, [], 'me')).toEqual(['drop']);
    expect(cuesFor(2, 2, [], 'me')).toEqual([]);
  });
  it('my own trash replaces the drop sound; others\' trash is silent', () => {
    expect(cuesFor(2, 1, [trash('me')], 'me')).toEqual(['trash']);
    expect(cuesFor(2, 2, [trash('other')], 'me')).toEqual([]);
  });
  it('maps world events to sounds', () => {
    const ev: SimEvent[] = [
      { type: 'sale', shopId: 'banh_mi', amount: 5000, x: 0, z: 0 },
      { type: 'unlock', shopId: 'banh_mi', instanceId: 'chao_op_la', byPlayerId: 'x' },
      { type: 'customerLost', shopId: 'banh_mi', x: 0, z: 0 },
    ];
    expect(cuesFor(0, 0, ev, 'me')).toEqual(['cash', 'unlock', 'lost']);
  });
  it('rings for the month-end settlement', () => {
    const st = { month: 1, revenue: 0, ingredientCost: 0, marketing: 0, wages: 0, rent: 0, loanDue: 0, totalDue: 0 };
    expect(cuesFor(0, 0, [{ type: 'monthEnd', settlement: st }], 'me')).toEqual(['monthEnd']);
  });
});

describe('settings', () => {
  const g = globalThis as { localStorage?: unknown };
  afterEach(() => {
    delete g.localStorage;
  });
  it('falls back to defaults when storage is unavailable', () => {
    g.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
    expect(loadSettings()).toEqual({ music: 0.3, sfx: 0.7, muted: false, showHint: true });
    expect(() => saveSettings({ music: 1, sfx: 1, muted: true, showHint: false })).not.toThrow();
  });
  it('round-trips through localStorage and ignores junk values', () => {
    const store = new Map<string, string>();
    g.localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) };
    saveSettings({ music: 0.5, sfx: 0.2, muted: true, showHint: false });
    expect(loadSettings()).toEqual({ music: 0.5, sfx: 0.2, muted: true, showHint: false });
    store.set('qnm.settings', '{"music": 7, "sfx": "x"}');
    expect(loadSettings()).toEqual({ music: 1, sfx: 0.7, muted: false, showHint: true });
  });
});
