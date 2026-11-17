import { describe, expect, it } from 'vitest';
import { advanceTime, formatClock, gameClock } from '../src/sim/time';
import { createWorld } from '../src/sim/world';

describe('gameClock', () => {
  it('maps 360 real seconds onto 06:00–22:00', () => {
    expect(gameClock(0)).toEqual({ hour: 6, minute: 0 });
    expect(gameClock(180)).toEqual({ hour: 14, minute: 0 });
    expect(formatClock(22.5)).toBe('07:00');
  });
});

describe('advanceTime', () => {
  it('returns null while the day continues', () => {
    const w = createWorld('X', 1);
    expect(advanceTime(w, 10)).toBeNull();
    expect(w.secOfDay).toBe(10);
  });

  it('ends the day with a summary, then resets stats and customers', () => {
    const w = createWorld('X', 1);
    w.secOfDay = 359;
    w.dayStats = { revenue: 100_000, ingredientCost: 40_000, unlockSpend: 800_000, served: 9, lost: 1, wages: 0, wasted: 0, sold: { banh_mi: 9 }, marketing: 0, commission: 0, onlineOrders: 0, onlineCancelled: 0 };
    w.shops.banh_mi.customers.push({
      id: 1, x: 0, z: 0, dir: 0, state: 'toShelf', wants: ['banh_mi'], bill: 0, waited: 0, payTimer: 0, holding: [], scored: false,
    });
    const summary = advanceTime(w, 2);
    expect(summary).not.toBeNull();
    expect(summary!.day).toBe(1);
    expect(summary!.revenue).toBe(100_000);
    expect(summary!.operatingProfit).toBe(60_000);
    expect(summary!.stars).toBe(3);
    expect(w.day).toBe(2);
    expect(w.secOfDay).toBe(0);
    expect(w.dayStats).toEqual({ revenue: 0, ingredientCost: 0, unlockSpend: 0, served: 0, lost: 0, wages: 0, wasted: 0, sold: {}, marketing: 0, commission: 0, onlineOrders: 0, onlineCancelled: 0 });
    expect(w.shops.banh_mi.customers).toEqual([]);
  });
});
