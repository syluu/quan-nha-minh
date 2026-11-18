import { describe, expect, it } from 'vitest';
import { SHOPS } from '../src/content';
import { createWorld, nextRandom } from '../src/sim/world';
import { pushRating, stars } from '../src/sim/rating';

describe('createWorld', () => {
  it('starts with 5.000K on day 1 at opening time with no players', () => {
    const w = createWorld('ABC-DEF', 1);
    expect(w.money).toBe(5_000_000);
    expect(w.day).toBe(1);
    expect(w.secOfDay).toBe(0);
    expect(w.code).toBe('ABC-DEF');
    expect(w.schemaVersion).toBe(10);
    expect(w.history).toEqual([]);
    expect(Object.keys(w.players)).toEqual([]);
  });

  it('unlocks only stations with unlockCost 0', () => {
    const w = createWorld('ABC-DEF', 1);
    for (const p of SHOPS.banh_mi.stations) {
      expect(w.shops.banh_mi.stations[p.instanceId].unlocked, p.instanceId).toBe(p.unlockCost === 0);
    }
  });
});

describe('nextRandom', () => {
  it('is deterministic per seed', () => {
    const a = createWorld('X', 7);
    const b = createWorld('X', 7);
    const c = createWorld('X', 8);
    const seqA = Array.from({ length: 5 }, () => nextRandom(a));
    const seqB = Array.from({ length: 5 }, () => nextRandom(b));
    const seqC = Array.from({ length: 5 }, () => nextRandom(c));
    expect(seqA).toEqual(seqB);
    expect(seqA).not.toEqual(seqC);
    for (const v of seqA) expect(v >= 0 && v < 1).toBe(true);
  });
});

describe('rating', () => {
  it('averages to one decimal and defaults to 3 stars', () => {
    expect(stars([5, 5, 1])).toBe(3.7);
    expect(stars([])).toBe(3);
  });

  it('keeps at most RATING_WINDOW ratings', () => {
    const w = createWorld('X', 1);
    const shop = w.shops.banh_mi;
    for (let i = 0; i < 51; i++) pushRating(shop, i === 0 ? 1 : 5);
    expect(shop.ratings.length).toBe(50);
    expect(stars(shop.ratings)).toBe(5);
  });
});

describe('createWorld (plan 5)', () => {
  it('has all three shops, only the bánh mì cart is owned; tables start with free seats', () => {
    const w = createWorld('ABC-DEF', 1);
    expect(Object.keys(w.shops).sort()).toEqual(['banh_mi', 'com_tam', 'farm', 'pho_cafe']);
    expect(w.shops.farm.owned).toBe(false);
    expect(w.warehouse).toEqual({});
    expect(w.shops.banh_mi.owned).toBe(true);
    expect(w.shops.com_tam.owned).toBe(false);
    expect(w.shops.pho_cafe.owned).toBe(false);
    expect(w.shops.com_tam.stations.ban_an_1.seats).toEqual(['free', 'free']);
    expect(w.shops.banh_mi.stations.lo_banh_mi.enabled).toBe(true);
    expect(w.extraWagesOwed).toBe(0);
  });
});
