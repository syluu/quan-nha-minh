import { describe, expect, it } from 'vitest';
import { joinPlayer } from '../src/sim/players';
import { buildReport } from '../src/sim/report';
import { toSnapshot } from '../src/sim/snapshot';
import { hireStaff } from '../src/sim/staff';
import { advanceTime } from '../src/sim/time';
import { createWorld } from '../src/sim/world';

describe('buildReport', () => {
  it('returns past days plus a live "today" with the wages that will be due', () => {
    const w = createWorld('X', 1);
    joinPlayer(w, 'a', 'Mẹ');
    for (let i = 0; i < 2; i++) {
      w.secOfDay = 359.99;
      advanceTime(w, 0.05);
    }
    hireStaff(w, 'banh_mi', 'cashier', null, 'a');
    w.dayStats.revenue = 50_000;
    w.dayStats.ingredientCost = 20_000;
    const r = buildReport(w);
    expect(r.history).toHaveLength(2);
    expect(r.today.day).toBe(3);
    expect(r.today.wages).toBe(120_000);
    expect(r.today.operatingProfit).toBe(50_000 - 20_000 - 120_000);
  });
});

describe('toSnapshot v2', () => {
  it('includes staff, prices and each player carry cap and pick progress', () => {
    const w = createWorld('X', 1);
    const p = joinPlayer(w, 'a', 'Mẹ');
    hireStaff(w, 'banh_mi', 'cook', 'banh_mi', 'a');
    w.shops.banh_mi.prices.banh_mi = 6000;
    p.pickTimer = 0.225;
    p.pickAt = 'lo_banh_mi';
    const s = toSnapshot(w, 'banh_mi');
    expect(s.staff).toHaveLength(1);
    expect(s.staff[0]).toMatchObject({ name: 'Lan', role: 'cook', item: 'banh_mi', carry: [] });
    expect(s.prices).toEqual({ banh_mi: 6000 });
    expect(s.players[0].cap).toBe(4);
    expect(s.players[0].pick).toBeCloseTo(0.5);
    expect(s.players[0].pickAt).toBe('lo_banh_mi');
  });
});
