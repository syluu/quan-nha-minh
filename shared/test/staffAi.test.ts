import { describe, expect, it } from 'vitest';
import { BALANCE, SHOPS, getStationDef } from '../src/content';
import { joinPlayer } from '../src/sim/players';
import { hireStaff } from '../src/sim/staff';
import { tick } from '../src/sim/tick';
import { createWorld } from '../src/sim/world';
import type { WorldState } from '../src/sim/world';

function insideFootprint(x: number, z: number): string | null {
  for (const p of SHOPS.banh_mi.stations) {
    const fp = getStationDef(p.def).footprint;
    if (Math.abs(x - p.x) < fp.w / 2 && Math.abs(z - p.z) < fp.d / 2) return p.instanceId;
  }
  return null;
}

/** Một người chơi đứng yên ở lối vào để thời gian chạy; mọi việc do nhân viên làm. */
function idleWorld(seed = 42): WorldState {
  const w = createWorld('X', seed);
  joinPlayer(w, 'owner', 'Mẹ');
  return w;
}

function checkStaff(w: WorldState) {
  const b = SHOPS.banh_mi.bounds;
  for (const s of w.shops.banh_mi.staff) {
    expect(s.x >= b.minX && s.x <= b.maxX && s.z >= b.minZ && s.z <= b.maxZ, `${s.name} out of bounds`).toBe(true);
    expect(insideFootprint(s.x, s.z), `${s.name} inside a station`).toBeNull();
    expect(s.carry.length).toBeLessThanOrEqual(BALANCE.STAFF_LEVELS[s.level - 1].carry);
  }
}

describe('staff at work', () => {
  it('a bread cook and a cashier run the cart for a whole day on their own', () => {
    const w = idleWorld();
    expect(hireStaff(w, 'banh_mi', 'cook', 'banh_mi', 'owner')).toEqual({ ok: true });
    expect(hireStaff(w, 'banh_mi', 'cashier', null, 'owner')).toEqual({ ok: true });
    let ended = false;
    for (let i = 0; i < 7200; i++) {
      for (const e of tick(w, 0.05)) if (e.type === 'dayEnd') ended = true;
      expect(w.money).toBeGreaterThanOrEqual(0);
      if (i % 20 === 0) checkStaff(w);
    }
    expect(ended).toBe(true);
    const day1 = w.history[0];
    expect(day1.served).toBeGreaterThanOrEqual(30);
    expect(day1.revenue).toBeGreaterThan(0);
  });

  it('a cook for a combo dish feeds the assembler with both inputs and stocks its shelf', () => {
    const w = idleWorld(7);
    const st = w.shops.banh_mi.stations;
    st.chao_op_la.unlocked = true;
    st.ban_bm_trung.unlocked = true;
    st.ke_bm_trung.unlocked = true;
    expect(hireStaff(w, 'banh_mi', 'cook', 'banh_mi_trung', 'owner')).toEqual({ ok: true });
    w.shops.banh_mi.nextCustomerIn = 1e9; // không có khách lấy mất hàng trên kệ
    for (let i = 0; i < 1200; i++) {
      tick(w, 0.05);
      if (i % 20 === 0) checkStaff(w);
    }
    expect(st.ke_bm_trung.stock).toBeGreaterThan(0);
  });

  it('a cashier walks to the counter and mans it', async () => {
    const { isCashierManned } = await import('../src/sim/customers');
    const w = idleWorld();
    hireStaff(w, 'banh_mi', 'cashier', null, 'owner');
    expect(isCashierManned(w, 'banh_mi')).toBe(false);
    for (let i = 0; i < 200; i++) tick(w, 0.05);
    expect(isCashierManned(w, 'banh_mi')).toBe(true);
  });
});

describe('staff leftovers', () => {
  it('a fired cook hands items back where there is room; the rest counts as waste', async () => {
    const { fireStaff } = await import('../src/sim/staff');
    const w = idleWorld();
    hireStaff(w, 'banh_mi', 'cook', 'banh_mi', 'owner');
    const cook = w.shops.banh_mi.staff[0];
    cook.carry = ['banh_mi', 'banh_mi'];
    w.shops.banh_mi.stations.ke_banh_mi.stock = 9;
    expect(fireStaff(w, 'banh_mi', cook.id, 'owner')).toEqual({ ok: true });
    expect(w.shops.banh_mi.stations.ke_banh_mi.stock).toBe(10);
    expect(w.dayStats.wasted).toBe(2000);
  });

  it('a combo cook stuck with leftover bread still fetches eggs', () => {
    const w = idleWorld(7);
    const st = w.shops.banh_mi.stations;
    st.chao_op_la.unlocked = true;
    st.ban_bm_trung.unlocked = true;
    st.ke_bm_trung.unlocked = true;
    w.shops.banh_mi.nextCustomerIn = 1e9;
    st.lo_banh_mi.unlocked = false; // không có thêm bánh mì
    hireStaff(w, 'banh_mi', 'cook', 'banh_mi_trung', 'owner');
    const cook = w.shops.banh_mi.staff[0];
    cook.carry = ['banh_mi'];
    st.ban_bm_trung.inputs = { banh_mi: 6, trung_op: 0 };
    st.ke_banh_mi.stock = 10; // kệ bánh mì đầy: không có chỗ trả bánh mì thừa
    st.chao_op_la.outputCount = 3;
    for (let i = 0; i < 400; i++) {
      tick(w, 0.05);
      expect(cook.carry.length).toBeLessThanOrEqual(BALANCE.STAFF_LEVELS[0].carry);
    }
    expect((st.ban_bm_trung.inputs.trung_op ?? 0) + st.ban_bm_trung.outputCount + st.ke_bm_trung.stock).toBeGreaterThan(0);
  });
});
