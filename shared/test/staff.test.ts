import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/content';
import { fireStaff, hireStaff, staffSlots } from '../src/sim/staff';
import { createWorld } from '../src/sim/world';
import { putPlayer } from './helpers';

function world() {
  const w = createWorld('X', 1);
  putPlayer(w, 'a', 0, 3).name = 'Mẹ';
  return w;
}

describe('hireStaff (Review Focus 3)', () => {
  it('hires one cashier; a second hire in the same tick is refused', () => {
    const w = world();
    expect(hireStaff(w, 'banh_mi', 'cashier', null, 'a')).toEqual({ ok: true });
    expect(hireStaff(w, 'banh_mi', 'cashier', null, 'a')).toEqual({ ok: false, error: 'NO_SLOT' });
    const s = w.shops.banh_mi.staff;
    expect(s).toHaveLength(1);
    expect(s[0]).toMatchObject({ name: 'Lan', role: 'cashier', item: null, x: BALANCE.STAFF_DOOR.x, z: BALANCE.STAFF_DOOR.z, hiredDay: 1 });
    expect(w.log.at(-1)?.text).toBe('Mẹ đã thuê Lan (thu ngân)');
  });

  it('one cook per product line', () => {
    const w = world();
    expect(hireStaff(w, 'banh_mi', 'cook', 'banh_mi', 'a')).toEqual({ ok: true });
    expect(w.log.at(-1)?.text).toBe('Mẹ đã thuê Lan (phụ bếp Bánh mì)');
    expect(hireStaff(w, 'banh_mi', 'cook', 'banh_mi', 'a')).toEqual({ ok: false, error: 'LINE_TAKEN' });
  });

  it('refuses lines without an open shelf and unknown roles', () => {
    const w = world();
    expect(hireStaff(w, 'banh_mi', 'cook', 'banh_mi_thit', 'a')).toEqual({ ok: false, error: 'BAD_ITEM' });
    expect(hireStaff(w, 'banh_mi', 'cook', null, 'a')).toEqual({ ok: false, error: 'BAD_ITEM' });
    expect(hireStaff(w, 'banh_mi', 'boss' as never, null, 'a')).toEqual({ ok: false, error: 'BAD_ROLE' });
  });

  it('gives each new hire a different name', () => {
    const w = world();
    w.shops.banh_mi.stations.binh_tra.unlocked = true;
    w.shops.banh_mi.stations.ke_tra_da.unlocked = true;
    hireStaff(w, 'banh_mi', 'cashier', null, 'a');
    hireStaff(w, 'banh_mi', 'cook', 'banh_mi', 'a');
    hireStaff(w, 'banh_mi', 'cook', 'tra_da', 'a');
    expect(w.shops.banh_mi.staff.map((s) => s.name)).toEqual(['Lan', 'Hùng', 'Mai']);
  });
});

describe('staffSlots', () => {
  it('lists the cashier slot and one cook line per open shelf', () => {
    const w = world();
    hireStaff(w, 'banh_mi', 'cook', 'banh_mi', 'a');
    const slots = staffSlots(w, 'banh_mi');
    expect(slots.cashier).toEqual({ max: 1, used: 0 });
    expect(slots.cookLines).toEqual([{ item: 'banh_mi', taken: 's1' }]);
  });
});

describe('fireStaff', () => {
  it('removes the person, pays today\'s wage and logs it', () => {
    const w = world();
    hireStaff(w, 'banh_mi', 'cashier', null, 'a');
    const id = w.shops.banh_mi.staff[0].id;
    expect(fireStaff(w, 'banh_mi', id, 'a')).toEqual({ ok: true });
    expect(w.shops.banh_mi.staff).toEqual([]);
    expect(w.money).toBe(5_000_000 - 120_000);
    expect(w.log.at(-1)?.text).toBe('Mẹ đã cho Lan nghỉ, trả 120K lương');
    expect(fireStaff(w, 'banh_mi', 'nope', 'a')).toEqual({ ok: false, error: 'NOT_FOUND' });
  });
});
