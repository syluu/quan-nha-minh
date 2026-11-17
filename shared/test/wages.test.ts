import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../src/sim/events';
import { joinPlayer } from '../src/sim/players';
import { fireStaff } from '../src/sim/staff';
import { tick } from '../src/sim/tick';
import { createWorld } from '../src/sim/world';
import type { WorldState } from '../src/sim/world';
import { putStaff } from './helpers';

function world(money = 5_000_000): WorldState {
  const w = createWorld('X', 1);
  w.money = money;
  w.shops.banh_mi.nextCustomerIn = 1e9; // không có khách: tiền chỉ đổi vì lương
  w.shops.banh_mi.stations.lo_banh_mi.unlocked = false; // không tốn nguyên liệu
  joinPlayer(w, 'a', 'Mẹ');
  return w;
}

/** Chạy tới hết ngày hiện tại bằng tick (có người online). */
function endDay(w: WorldState): SimEvent[] {
  w.secOfDay = 359.99;
  return tick(w, 0.05);
}

describe('wages accrue daily and are paid at month end', () => {
  it('adds each day\'s wage to what is owed without taking money', () => {
    const w = world();
    putStaff(w, 'Lan', 'cashier');
    putStaff(w, 'Hùng');
    endDay(w);
    expect(w.shops.banh_mi.staff.map((s) => s.wageOwed)).toEqual([120_000, 120_000]);
    expect(w.money).toBe(5_000_000);
    expect(w.history[0].wages).toBe(240_000);
    expect(w.history[0].operatingProfit).toBe(-240_000);
  });

  it('settles at the end of day 7: pays everything when there is enough money', () => {
    const w = world();
    putStaff(w, 'Lan', 'cashier');
    putStaff(w, 'Hùng');
    const events: SimEvent[] = [];
    for (let d = 0; d < 7; d++) events.push(...endDay(w));
    expect(events.some((e) => e.type === 'monthEnd')).toBe(true);
    expect(events).toContainEqual({ type: 'monthClosed', month: 1 });
    expect(w.settlement).toBeNull();
    expect(w.month).toBe(2);
    expect(w.money).toBe(5_000_000 - 1_680_000);
    expect(w.shops.banh_mi.staff.every((s) => s.wageOwed === 0)).toBe(true);
    expect(w.months[0]).toMatchObject({ month: 1, wages: 1_680_000, totalDue: 1_680_000 });
  });

  it('pauses the whole game while the month cannot be paid', () => {
    const w = world(1_000_000);
    putStaff(w, 'Lan', 'cashier');
    putStaff(w, 'Hùng');
    for (let d = 0; d < 7; d++) endDay(w);
    expect(w.settlement).toMatchObject({ month: 1, wages: 1_680_000, totalDue: 1_680_000 });
    expect(w.money).toBe(1_000_000);
    const before = w.secOfDay;
    expect(tick(w, 1)).toEqual([]);
    expect(w.secOfDay).toBe(before);
  });
});

describe('firing pays the owed wage right away (Review Focus 3)', () => {
  it('refuses when there is not enough money, pays the days worked otherwise', () => {
    const w = world(400_000);
    const lan = putStaff(w, 'Lan', 'cashier');
    lan.wageOwed = 360_000;
    expect(fireStaff(w, 'banh_mi', lan.id, 'a')).toEqual({ ok: false, error: 'NO_MONEY' });
    expect(w.shops.banh_mi.staff).toHaveLength(1);
    expect(w.money).toBe(400_000);
    w.money = 1_000_000;
    expect(fireStaff(w, 'banh_mi', lan.id, 'a')).toEqual({ ok: true });
    // 360K đã nợ + 120K của hôm nay (đã làm trong ngày)
    expect(w.money).toBe(520_000);
    expect(w.log.at(-1)?.text).toBe('Mẹ đã cho Lan nghỉ, trả 480K lương');
  });
});

describe('hire in the morning, fire in the evening is not free (I3)', () => {
  it('charges today\'s wage when firing on the day of hiring', () => {
    const w = world();
    const lan = putStaff(w, 'Lan', 'cashier');
    w.secOfDay = 355;
    expect(fireStaff(w, 'banh_mi', lan.id, 'a')).toEqual({ ok: true });
    expect(w.money).toBe(5_000_000 - 120_000);
  });
});
