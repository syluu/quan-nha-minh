import { describe, expect, it } from 'vitest';
import { advanceTime } from '../src/sim/time';
import { createWorld } from '../src/sim/world';
import { putStaff } from './helpers';

function endDay(w: ReturnType<typeof createWorld>) {
  w.secOfDay = 359.99;
  return advanceTime(w, 0.05)!;
}

describe('day end v2', () => {
  it('pays 120K per staff member and subtracts wages from operating profit', () => {
    const w = createWorld('X', 1);
    putStaff(w, 'Lan', 'cashier');
    putStaff(w, 'Hùng');
    w.dayStats.revenue = 1_000_000;
    w.dayStats.ingredientCost = 200_000;
    const s = endDay(w);
    expect(w.money).toBe(5_000_000 - 240_000);
    expect(s.wages).toBe(240_000);
    expect(s.operatingProfit).toBe(1_000_000 - 200_000 - 240_000);
    expect(w.history).toEqual([s]);
  });

  it('keeps at most 30 days of history', () => {
    const w = createWorld('X', 1);
    for (let i = 0; i < 31; i++) endDay(w);
    expect(w.history).toHaveLength(30);
    expect(w.history[0].day).toBe(2);
    expect(w.history.at(-1)!.day).toBe(31);
  });

  it('never lets money go negative: unpaid staff quit (Review Focus 2)', () => {
    const w = createWorld('X', 1);
    w.money = 200_000;
    putStaff(w, 'Lan', 'cashier');
    putStaff(w, 'Hùng');
    const s = endDay(w);
    expect(w.money).toBe(80_000);
    expect(s.wages).toBe(120_000);
    expect(w.shops.banh_mi.staff.map((x) => x.name)).toEqual(['Lan']);
    expect(w.log.at(-1)?.text).toBe('Hùng nghỉ việc vì không được trả lương');
  });

  it('still pays for staff fired today', () => {
    const w = createWorld('X', 1);
    w.shops.banh_mi.firedToday = 1;
    const s = endDay(w);
    expect(s.wages).toBe(120_000);
    expect(w.shops.banh_mi.firedToday).toBe(0);
  });
});
