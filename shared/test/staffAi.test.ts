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

describe('courier (plan 4)', () => {
  function courierWorld() {
    const w = idleWorld();
    w.shops.banh_mi.nextCustomerIn = 1e9;
    w.shops.banh_mi.nextOrderIn = 1e9;
    return w;
  }

  it('can only be hired once the pickup point is open, one per pickup', () => {
    const w = courierWorld();
    expect(hireStaff(w, 'banh_mi', 'courier', null, 'owner')).toEqual({ ok: false, error: 'BAD_ITEM' });
    w.shops.banh_mi.stations.diem_giao.unlocked = true;
    expect(hireStaff(w, 'banh_mi', 'courier', null, 'owner')).toEqual({ ok: true });
    expect(hireStaff(w, 'banh_mi', 'courier', null, 'owner')).toEqual({ ok: false, error: 'NO_SLOT' });
    expect(w.log.at(-1)?.text).toBe('Mẹ đã thuê Lan (giao đơn)');
  });

  it('fetches bread from the oven and hands it to the waiting shipper', () => {
    const w = courierWorld();
    w.shops.banh_mi.stations.diem_giao.unlocked = true;
    hireStaff(w, 'banh_mi', 'courier', null, 'owner');
    w.shops.banh_mi.orders.push({ id: 1, items: ['banh_mi'], delivered: [], total: 5000, createdSec: 0 });
    w.shops.banh_mi.nextOrderId = 2;
    for (let i = 0; i < 800; i++) {
      tick(w, 0.05);
      if (i % 20 === 0) checkStaff(w);
    }
    expect(w.dayStats.onlineOrders).toBe(1);
  });

  it('with nothing to deliver it waits without getting stuck (Review Focus 5)', () => {
    const w = courierWorld();
    w.shops.banh_mi.stations.diem_giao.unlocked = true;
    w.shops.banh_mi.stations.lo_banh_mi.unlocked = false;
    hireStaff(w, 'banh_mi', 'courier', null, 'owner');
    w.shops.banh_mi.orders.push({ id: 1, items: ['banh_mi'], delivered: [], total: 5000, createdSec: 0 });
    for (let i = 0; i < 400; i++) {
      tick(w, 0.05);
      checkStaff(w);
    }
    expect(w.shops.banh_mi.staff[0].carry).toEqual([]);
  });
});

describe('courier with a leftover item (I2)', () => {
  it('still fetches what the shipper needs while holding bread nobody wants', () => {
    const w = idleWorld();
    w.shops.banh_mi.nextCustomerIn = 1e9;
    w.shops.banh_mi.nextOrderIn = 1e9;
    const st = w.shops.banh_mi.stations;
    st.diem_giao.unlocked = true;
    st.binh_tra.unlocked = true;
    st.ke_tra_da.unlocked = true;
    st.ke_tra_da.stock = 5;
    st.ke_banh_mi.stock = 10; // kệ bánh mì đầy: không trả được bánh thừa
    hireStaff(w, 'banh_mi', 'courier', null, 'owner');
    const courier = w.shops.banh_mi.staff[0];
    courier.carry = ['banh_mi'];
    w.shops.banh_mi.orders.push({ id: 1, items: ['tra_da'], delivered: [], total: 3000, createdSec: 0 });
    w.shops.banh_mi.nextOrderId = 2;
    for (let i = 0; i < 1400; i++) tick(w, 0.05);
    expect(w.dayStats.onlineOrders).toBe(1);
    expect(w.dayStats.onlineCancelled).toBe(0);
  });
});

describe('general cooks (owner request)', () => {
  function fullCart(): WorldState {
    const w = idleWorld();
    for (const st of Object.values(w.shops.banh_mi.stations)) st.unlocked = true;
    w.shops.banh_mi.stations.diem_giao.unlocked = false;
    w.shops.banh_mi.nextCustomerIn = 1e9; // không có khách: chỉ xem nhân viên bày hàng
    w.money = 50_000_000;
    return w;
  }

  it('one cook keeps every shelf stocked, including grilled pork, and feeds the combo tables', () => {
    const w = fullCart();
    expect(hireStaff(w, 'banh_mi', 'cook', null, 'owner')).toEqual({ ok: true });
    for (let i = 0; i < 1800; i++) {
      tick(w, 0.05);
      if (i % 100 === 0) checkStaff(w);
    }
    const st = w.shops.banh_mi.stations;
    for (const shelf of ['ke_banh_mi', 'ke_bm_trung', 'ke_thit_nuong', 'ke_bm_thit', 'ke_tra_da']) expect(st[shelf].stock, shelf).toBeGreaterThan(0);
  });

  it('serves the emptiest shelf first', async () => {
    const w = fullCart();
    const st = w.shops.banh_mi.stations;
    st.ke_banh_mi.stock = 9;
    st.ke_tra_da.stock = 0;
    st.lo_banh_mi.outputCount = 3;
    st.binh_tra.outputCount = 3;
    for (const id of ['chao_op_la', 'lo_than', 'ban_bm_trung', 'ban_bm_thit']) st[id].enabled = false;
    hireStaff(w, 'banh_mi', 'cook', null, 'owner');
    tick(w, 0.05);
    expect(w.shops.banh_mi.staff[0].task).toMatchObject({ from: 'binh_tra', to: 'ke_tra_da', item: 'tra_da' });
  });

  it('two cooks split the work instead of doing the same job', () => {
    const w = fullCart();
    const st = w.shops.banh_mi.stations;
    st.lo_banh_mi.outputCount = 5;
    st.binh_tra.outputCount = 5;
    hireStaff(w, 'banh_mi', 'cook', null, 'owner');
    hireStaff(w, 'banh_mi', 'cook', null, 'owner');
    tick(w, 0.05);
    const [a, b] = w.shops.banh_mi.staff;
    expect(a.task).not.toBeNull();
    expect(b.task).not.toBeNull();
    expect(`${a.task!.to}|${a.task!.item}`).not.toBe(`${b.task!.to}|${b.task!.item}`);
  });

  it('cooks tied to one dish in an old save become general cooks on load', async () => {
    const { normalizeLoaded } = await import('../src/sim/snapshot');
    const w = fullCart();
    hireStaff(w, 'banh_mi', 'cook', null, 'owner');
    const raw = JSON.parse(JSON.stringify(w));
    raw.shops.banh_mi.staff[0].item = 'banh_mi';
    expect(normalizeLoaded(raw).shops.banh_mi.staff[0].item).toBeNull();
  });
});
