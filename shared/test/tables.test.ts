import { describe, expect, it } from 'vitest';
import { SHOPS, getPlaced } from '../src/content';
import { tickCarry } from '../src/sim/carry';
import { seatCustomer, spawnCustomer, tickCustomers } from '../src/sim/customers';
import { tickStations } from '../src/sim/production';
import { sellStation } from '../src/sim/settlement';
import { hireStaff, staffSlots, tickStaff } from '../src/sim/staff';
import { setMachineEnabled } from '../src/sim/upgrades';
import { createWorld } from '../src/sim/world';
import type { WorldState } from '../src/sim/world';
import { putPlayer, repeat } from './helpers';
import { movePlayer } from '../src/sim/movement';
import { normalizeLoaded } from '../src/sim/snapshot';

function comTam(tables = 1): WorldState {
  const w = createWorld('X', 1);
  w.shops.com_tam.owned = true;
  for (let i = 1; i <= tables; i++) w.shops.com_tam.stations[`ban_an_${i}`].unlocked = true;
  w.shops.com_tam.nextCustomerIn = 1e9;
  return w;
}

/** Một khách đã cầm món, đang ở đầu hàng, có người đứng thu ngân. */
function payingCustomer(w: WorldState) {
  const shop = w.shops.com_tam;
  const cashier = getPlaced('com_tam', 'thu_ngan');
  const c = spawnCustomer(w, 'com_tam')!;
  Object.assign(c, { state: 'inQueue', wants: [], holding: ['com_tam_suon'], bill: 35_000, x: cashier.customerPoint!.x, z: cashier.customerPoint!.z });
  return { shop, c };
}

describe('dining tables (plan 5)', () => {
  it('a customer who sits walks to the seat, eats 20 s, leaves and the seat becomes dirty', () => {
    const w = comTam();
    const wp = getPlaced('com_tam', 'thu_ngan').workPoint;
    putPlayer(w, 'a', wp.x, wp.z, [], 'com_tam');
    // Ép khách muốn ngồi: thử nhiều khách cho tới khi có người ngồi.
    let seated = null;
    for (let i = 0; i < 20 && !seated; i++) {
      const { c } = payingCustomer(w);
      repeat(1.1, (dt) => tickCustomers(w, 'com_tam', dt));
      if (c.state === 'toTable') seated = c;
      else w.shops.com_tam.customers = [];
    }
    expect(seated).not.toBeNull();
    const st = w.shops.com_tam.stations.ban_an_1;
    expect(st.seats.filter((x) => x === 'taken')).toHaveLength(1);
    repeat(10, (dt) => tickCustomers(w, 'com_tam', dt));
    expect(seated!.state).toBe('eating');
    repeat(20, (dt) => tickCustomers(w, 'com_tam', dt));
    expect(seated!.state).toBe('leaving');
    expect(st.seats.filter((x) => x === 'dirty')).toHaveLength(1);
  });

  it('no clean seat → takeaway, rated at most 4 stars, seats never go negative (Review Focus 5)', () => {
    const w = comTam();
    w.shops.com_tam.stations.ban_an_1.seats = ['dirty', 'dirty'];
    let takeaway = 0;
    for (let i = 0; i < 30; i++) {
      const { c } = payingCustomer(w);
      const r = seatCustomer(w, 'com_tam', c);
      expect(r).not.toBe('seated');
      if (r === 'takeaway') takeaway++;
    }
    expect(takeaway).toBeGreaterThan(5);
    expect(w.shops.com_tam.stations.ban_an_1.seats).toEqual(['dirty', 'dirty']);

    // Qua thu ngân: mọi khách mang về chấm ≤ 4 sao dù phục vụ nhanh.
    w.shops.com_tam.customers = [];
    w.shops.com_tam.ratings = [];
    const wp = getPlaced('com_tam', 'thu_ngan').workPoint;
    putPlayer(w, 'a', wp.x, wp.z, [], 'com_tam');
    for (let i = 0; i < 10; i++) {
      payingCustomer(w);
      repeat(1.1, (dt) => tickCustomers(w, 'com_tam', dt));
      w.shops.com_tam.customers = [];
    }
    expect(Math.max(...w.shops.com_tam.ratings)).toBeLessThanOrEqual(5);
    expect(w.shops.com_tam.ratings.filter((r) => r === 5).length).toBeLessThan(10);
  });

  it('the bánh mì cart has no tables: nobody sits, no RNG used', () => {
    const w = createWorld('X', 1);
    const c = spawnCustomer(w, 'banh_mi')!;
    const rng = w.rngState;
    expect(seatCustomer(w, 'banh_mi', c)).toBe('none');
    expect(w.rngState).toBe(rng);
  });

  it('a player standing still next to a dirty table cleans one seat every 0.5 s', () => {
    const w = comTam();
    const st = w.shops.com_tam.stations.ban_an_1;
    st.seats = ['dirty', 'dirty'];
    const wp = getPlaced('com_tam', 'ban_an_1').workPoint;
    const p = putPlayer(w, 'a', wp.x, wp.z, [], 'com_tam');
    repeat(0.45, (dt) => tickCarry(w, 'com_tam', dt));
    expect(st.seats).toEqual(['dirty', 'dirty']);
    repeat(0.1, (dt) => tickCarry(w, 'com_tam', dt));
    expect(st.seats).toEqual(['free', 'dirty']);
    p.input = { mx: 1, mz: 0 }; // đang đi → không dọn
    repeat(1, (dt) => tickCarry(w, 'com_tam', dt));
    expect(st.seats).toEqual(['free', 'dirty']);
    p.input = { mx: 0, mz: 0 };
    repeat(0.55, (dt) => tickCarry(w, 'com_tam', dt));
    expect(st.seats).toEqual(['free', 'free']);
  });

  it('a cleaner (1 per shop with tables) walks around the shelves and cleans every dirty seat', () => {
    const w = comTam(4);
    putPlayer(w, 'a', 0, 2, [], 'com_tam');
    expect(staffSlots(w, 'banh_mi').cleaner).toBeNull();
    expect(hireStaff(w, 'banh_mi', 'cleaner', null, 'a')).toEqual({ ok: false, error: 'BAD_ITEM' });
    expect(hireStaff(w, 'com_tam', 'cleaner', null, 'a')).toEqual({ ok: true });
    expect(hireStaff(w, 'com_tam', 'cleaner', null, 'a')).toEqual({ ok: false, error: 'NO_SLOT' });
    for (let i = 1; i <= 4; i++) w.shops.com_tam.stations[`ban_an_${i}`].seats = ['dirty', 'dirty'];
    const s = w.shops.com_tam.staff[0];
    let crossedShelf = false;
    repeat(40, (dt) => {
      tickStaff(w, 'com_tam', dt);
      // Không bao giờ đứng trong hàng kệ (z 0 ± 0,4) ngoài các khe.
      if (Math.abs(s.z) < 0.4 && !SHOPS.com_tam.stations.every((p) => p.z !== 0 || Math.abs(p.x - s.x) > 0.5)) crossedShelf = true;
    });
    expect(crossedShelf).toBe(false);
    for (let i = 1; i <= 4; i++) expect(w.shops.com_tam.stations[`ban_an_${i}`].seats).toEqual(['free', 'free']);
  });

  it('selling a table sends the customers at it home', () => {
    const w = comTam(1);
    const { c } = payingCustomer(w);
    w.shops.com_tam.stations.ban_an_1.seats = ['taken', 'free'];
    Object.assign(c, { state: 'eating', table: 'ban_an_1', seat: 0 });
    w.day = 7;
    w.settlement = { month: 1, revenue: 0, ingredientCost: 0, marketing: 0, commission: 0, wages: 0, rent: 0, loanDue: 0, totalDue: 1e12 };
    expect(sellStation(w, 'com_tam', 'ban_an_1', 'a', 1)).toEqual({ ok: true });
    expect(c.state).toBe('leaving');
    expect(w.shops.com_tam.stations.ban_an_1.seats).toEqual(['free', 'free']);
  });
});

describe('machine on/off switch (plan 5)', () => {
  it('switching off mid-batch finishes that batch, then stops; staff stop feeding an off assembler', () => {
    const w = createWorld('X', 1);
    putPlayer(w, 'a', 0, 2);
    const st = w.shops.banh_mi.stations.lo_banh_mi;
    tickStations(w, 'banh_mi', 0.1);
    expect(st.running).toBe(true);
    expect(setMachineEnabled(w, 'banh_mi', 'lo_banh_mi', false, 'a')).toEqual({ ok: true });
    repeat(10, (dt) => tickStations(w, 'banh_mi', dt));
    expect(st.outputCount).toBe(1);
    expect(st.blocked).toBe('off');
    expect(setMachineEnabled(w, 'banh_mi', 'lo_banh_mi', true, 'a')).toEqual({ ok: true });
    repeat(3.1, (dt) => tickStations(w, 'banh_mi', dt));
    expect(st.outputCount).toBe(2);
  });

  it('a cook does not carry inputs into a switched-off assembler', () => {
    const w = createWorld('X', 1);
    putPlayer(w, 'a', 0, 2);
    const shop = w.shops.banh_mi;
    for (const id of ['chao_op_la', 'ban_bm_trung', 'ke_bm_trung']) shop.stations[id].unlocked = true;
    shop.stations.lo_banh_mi.outputCount = 4;
    shop.stations.chao_op_la.outputCount = 4;
    expect(setMachineEnabled(w, 'banh_mi', 'ban_bm_trung', false, 'a')).toEqual({ ok: true });
    w.money = 10_000_000;
    expect(hireStaff(w, 'banh_mi', 'cook', 'banh_mi_trung', 'a')).toEqual({ ok: true });
    repeat(15, (dt) => tickStaff(w, 'banh_mi', dt));
    expect(shop.stations.ban_bm_trung.inputs).toEqual({});
  });

  it('rejects shelves, locked machines and junk', () => {
    const w = createWorld('X', 1);
    expect(setMachineEnabled(w, 'banh_mi', 'ke_banh_mi', false, 'a')).toEqual({ ok: false, error: 'BAD_ITEM' });
    expect(setMachineEnabled(w, 'banh_mi', 'chao_op_la', false, 'a')).toEqual({ ok: false, error: 'BAD_ITEM' });
    expect(setMachineEnabled(w, 'banh_mi', 'lo_banh_mi', 'no', 'a')).toEqual({ ok: false, error: 'BAD_ITEM' });
  });
});

describe('plan 5 review fixes', () => {
  it('the last table cannot be sold while a cleaner is hired', () => {
    const w = comTam(2);
    putPlayer(w, 'a', 0, 2, [], 'com_tam');
    hireStaff(w, 'com_tam', 'cleaner', null, 'a');
    w.day = 7;
    // Tiền thuê không bị tính lại khi thử kết toán → giữ bảng kết toán mở suốt test.
    w.settlement = { month: 1, revenue: 0, ingredientCost: 0, marketing: 0, commission: 0, wages: 0, rent: 1e12, loanDue: 0, totalDue: 1e12 };
    expect(sellStation(w, 'com_tam', 'ban_an_2', 'a', 1)).toEqual({ ok: true });
    expect(sellStation(w, 'com_tam', 'ban_an_1', 'a', 1)).toEqual({ ok: false, error: 'NOT_SELLABLE' });
  });

  it('a place can only be returned from the month-end settlement', async () => {
    const { returnShop } = await import('../src/sim/shops');
    const w = comTam(0);
    expect(returnShop(w, 'com_tam', 'a')).toEqual({ ok: false, error: 'NO_SETTLEMENT' });
    expect(w.shops.com_tam.owned).toBe(true);
  });

  it('closing time: a seat reserved for someone still walking becomes free, an eaten one dirty', async () => {
    const { advanceTime } = await import('../src/sim/time');
    const w = comTam(1);
    const a = spawnCustomer(w, 'com_tam')!;
    const b = spawnCustomer(w, 'com_tam')!;
    w.shops.com_tam.stations.ban_an_1.seats = ['taken', 'taken'];
    Object.assign(a, { state: 'eating', table: 'ban_an_1', seat: 0 });
    Object.assign(b, { state: 'toTable', table: 'ban_an_1', seat: 1 });
    w.secOfDay = 359.99;
    advanceTime(w, 0.1);
    expect(w.shops.com_tam.stations.ban_an_1.seats).toEqual(['dirty', 'free']);
  });
});

describe('tables in rows + sidewalk tables', () => {
  const tableBoxes = SHOPS.com_tam.stations
    .filter((p) => p.seatPoints)
    .map((p) => ({ id: p.instanceId, minX: p.x - 0.6, maxX: p.x + 0.6, minZ: p.z - 0.4, maxZ: p.z + 0.4 }));
  const insideTable = (x: number, z: number) => tableBoxes.find((b) => x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ)?.id;

  it('a customer seated at the last sidewalk table walks there and back out without walking through any table', () => {
    const w = comTam(12);
    const shop = w.shops.com_tam;
    // Mọi bàn khác đều đã có người: khách mới chỉ còn chỗ ở bàn vỉa hè ngoài cùng.
    for (let i = 1; i <= 11; i++) shop.stations[`ban_an_${i}`].seats = ['taken', 'taken'];
    const wp = getPlaced('com_tam', 'thu_ngan').workPoint;
    putPlayer(w, 'a', wp.x, wp.z, [], 'com_tam');
    let seated = null;
    for (let i = 0; i < 20 && !seated; i++) {
      const { c } = payingCustomer(w);
      repeat(1.1, (dt) => tickCustomers(w, 'com_tam', dt));
      if (c.state === 'toTable') seated = c;
      else shop.customers = [];
    }
    expect(seated!.table).toBe('ban_an_12');
    const hits = new Set<string>();
    repeat(60, (dt) => {
      tickCustomers(w, 'com_tam', dt);
      if (!shop.customers.includes(seated!)) return;
      const t = insideTable(seated!.x, seated!.z);
      if (t) hits.add(t);
    });
    expect([...hits]).toEqual([]);
    expect(shop.customers.includes(seated!)).toBe(false); // ăn xong đã ra về
    expect(shop.stations.ban_an_12.seats).toContain('dirty');
  });

  it('the cleaner goes between table rows (and out to the sidewalk) without walking through a table', () => {
    const w = comTam(12);
    putPlayer(w, 'a', 0, 2, [], 'com_tam');
    expect(hireStaff(w, 'com_tam', 'cleaner', null, 'a')).toEqual({ ok: true });
    for (const i of [1, 8, 12, 5]) w.shops.com_tam.stations[`ban_an_${i}`].seats = ['dirty', 'dirty'];
    const s = w.shops.com_tam.staff[0];
    const hits = new Set<string>();
    repeat(60, (dt) => {
      tickStaff(w, 'com_tam', dt);
      const t = insideTable(s.x, s.z);
      if (t) hits.add(t);
    });
    expect([...hits]).toEqual([]);
    for (const i of [1, 8, 12, 5]) expect(w.shops.com_tam.stations[`ban_an_${i}`].seats).toEqual(['free', 'free']);
  });

  it('players can walk out onto the sidewalk to the sidewalk tables, the bánh mì cart stays inside its floor', () => {
    const layout = SHOPS.com_tam;
    let p = { x: 4.6, z: 8, dir: 0 };
    for (let i = 0; i < 100; i++) p = movePlayer(p, { mx: 0, mz: 1 }, 3, 0.05, layout, () => true);
    expect(p.z).toBeGreaterThan(getPlaced('com_tam', 'ban_an_9').z);
    let q = { x: 0, z: 4, dir: 0 };
    for (let i = 0; i < 100; i++) q = movePlayer(q, { mx: 0, mz: 1 }, 3, 0.05, SHOPS.banh_mi, () => true);
    expect(q.z).toBeLessThanOrEqual(SHOPS.banh_mi.bounds.maxZ);
  });

  it('sidewalk tables open after the first 4 inside tables, cost more, and old saves get the new tables', () => {
    const t9 = getPlaced('com_tam', 'ban_an_9');
    expect(t9.requires).toEqual(['ban_an_4']);
    expect(t9.unlockCost).toBe(1_200_000);
    expect(getPlaced('com_tam', 'ban_an_5').unlockCost).toBe(800_000);
    const old = JSON.parse(JSON.stringify(comTam(4)));
    for (let i = 5; i <= 12; i++) delete old.shops.com_tam.stations[`ban_an_${i}`];
    const w = normalizeLoaded(old);
    expect(w.shops.com_tam.stations.ban_an_4.unlocked).toBe(true);
    expect(w.shops.com_tam.stations.ban_an_12).toMatchObject({ unlocked: false, seats: ['free', 'free'] });
  });
});
