import { describe, expect, it } from 'vitest';
import { SHOPS } from '../src/content';
import { movePlayer } from '../src/sim/movement';
import { normalizeLoaded } from '../src/sim/snapshot';

/** Một file lưu Kế hoạch 1 (schemaVersion 1) tối thiểu, viết tay như dữ liệu thật trong DB. */
function v1Save() {
  const station = (id: string, unlocked: boolean) => ({
    instanceId: id, unlocked, paid: 0, outputCount: 0, inputs: {}, stock: 0, progress: 0, running: false, blocked: null, tileOccupant: null,
  });
  return {
    schemaVersion: 1,
    code: 'ABC-DEF',
    money: 4_200_000,
    day: 3,
    secOfDay: 100,
    rngState: 7,
    shops: {
      banh_mi: {
        id: 'banh_mi',
        stations: { lo_banh_mi: station('lo_banh_mi', true), ke_banh_mi: station('ke_banh_mi', true), thu_ngan: station('thu_ngan', true), chao_op_la: station('chao_op_la', true) },
        customers: [],
        prices: {},
        ratings: [5, 4],
        nextCustomerIn: 2,
        nextCustomerId: 40,
      },
    },
    players: {
      a: { id: 'a', name: 'Bố', color: 1, x: -6.25, z: -3.8, dir: 0, carry: ['banh_mi'], carryCap: 4, speed: 3.2, online: true, input: { mx: 1, mz: 0 }, transferCd: 0.1 },
    },
    log: [],
    dayStats: { revenue: 10_000, ingredientCost: 4_000, unlockSpend: 0, served: 2, lost: 0 },
  };
}

describe('normalizeLoaded v1 → v2', () => {
  it('fills the new fields with defaults and keeps progress', () => {
    const w = normalizeLoaded(v1Save());
    expect(w.schemaVersion).toBe(8);
    expect(w.money).toBe(4_200_000);
    expect(w.day).toBe(3);
    expect(w.history).toEqual([]);
    expect(w.shops.banh_mi.staff).toEqual([]);
    expect(w.shops.banh_mi.nextStaffId).toBe(1);
    expect(w.shops.banh_mi.firedToday).toBe(0);
    expect(w.shops.banh_mi.stations.chao_op_la.unlocked).toBe(true);
    expect(w.shops.banh_mi.stations.thung_rac.unlocked).toBe(true);
    expect(w.dayStats).toMatchObject({ revenue: 10_000, wages: 0, wasted: 0, sold: {} });
    const p = w.players.a as unknown as Record<string, unknown>;
    expect(p.dropCd).toBe(0);
    expect(p.pickTimer).toBe(0);
    expect(p.pickAt).toBeNull();
    expect('transferCd' in p).toBe(false);
  });

  it('a player saved inside a machine of the new layout can walk out (Review Focus 1)', () => {
    const w = normalizeLoaded(v1Save());
    const p = w.players.a;
    const next = movePlayer(p, { mx: 0, mz: 1 }, p.speed, 0.05, SHOPS.banh_mi, (id) => w.shops.banh_mi.stations[id]?.unlocked ?? false);
    // lò bánh mì: footprint z ∈ [-4.3, -3.3]
    expect(next.z).toBeGreaterThan(-3.3);
  });

  it('rejects unknown versions', () => {
    expect(() => normalizeLoaded({ ...v1Save(), schemaVersion: 9 })).toThrow('UNSUPPORTED_SCHEMA');
  });
});

describe('normalizeLoaded v2 → v3', () => {
  function v2Save() {
    const w = normalizeLoaded(v1Save()) as unknown as Record<string, any>;
    // ép về đúng dạng v2: bỏ các trường v3
    w.schemaVersion = 2;
    delete w.loans; delete w.nextLoanId; delete w.settlement; delete w.month;
    delete w.dayStats.marketing;
    for (const shop of Object.values<any>(w.shops)) {
      delete shop.campaigns;
      for (const st of Object.values<any>(shop.stations)) { delete st.level; delete st.upgradeSpent; }
      shop.staff = [{ id: 's1', name: 'Lan', role: 'cashier', item: null, x: 0, z: 0, dir: 0, carry: [], task: null, timer: 0, hiredDay: 1 }];
    }
    for (const p of Object.values<any>(w.players)) { delete p.carryLevel; delete p.speedLevel; }
    return w;
  }

  it('fills v3 defaults and keeps progress', () => {
    const w = normalizeLoaded(v2Save());
    expect(w.schemaVersion).toBe(8);
    expect(w.loans).toEqual([]);
    expect(w.nextLoanId).toBe(1);
    expect(w.settlement).toBeNull();
    expect(w.month).toBe(1);
    expect(w.dayStats.marketing).toBe(0);
    expect(w.shops.banh_mi.campaigns).toEqual([]);
    expect(w.shops.banh_mi.staff[0]).toMatchObject({ name: 'Lan', level: 1, wageOwed: 0 });
    expect(w.shops.banh_mi.stations.lo_banh_mi).toMatchObject({ level: 0, upgradeSpent: 0 });
    expect(w.players.a).toMatchObject({ carryLevel: 0, speedLevel: 0 });
    expect(w.money).toBe(4_200_000);
  });

  it('numbers the month from the saved day (M6)', () => {
    const raw = v2Save();
    raw.day = 13;
    expect(normalizeLoaded(raw).month).toBe(2);
  });

  it('keeps an open month-end settlement across a server restart (Review Focus 2)', () => {
    const w = normalizeLoaded(v2Save());
    w.settlement = { month: 1, revenue: 1, ingredientCost: 2, marketing: 0, commission: 0, wages: 840_000, rent: 0, loanDue: 0, totalDue: 840_000 };
    const again = normalizeLoaded(JSON.parse(JSON.stringify(w)));
    expect(again.settlement).toEqual(w.settlement);
  });
});

describe('normalizeLoaded v3 → v4', () => {
  it('adds online fields, the pickup station (locked) and drops unfinished orders on load', () => {
    const w3 = normalizeLoaded(v1Save()) as unknown as Record<string, any>;
    w3.schemaVersion = 3;
    delete w3.dayStats.commission; delete w3.dayStats.onlineOrders; delete w3.dayStats.onlineCancelled;
    for (const shop of Object.values<any>(w3.shops)) {
      delete shop.orders; delete shop.nextOrderId; delete shop.nextOrderIn; delete shop.shipper; delete shop.onlinePaused;
      delete shop.stations.diem_giao;
    }
    const w = normalizeLoaded(w3);
    expect(w.schemaVersion).toBe(8);
    const shop = w.shops.banh_mi;
    expect(shop).toMatchObject({ orders: [], nextOrderId: 1, shipper: null, onlinePaused: false });
    expect(shop.stations.diem_giao.unlocked).toBe(false);
    expect(w.dayStats).toMatchObject({ commission: 0, onlineOrders: 0, onlineCancelled: 0 });

    shop.orders.push({ id: 1, items: ['banh_mi'], delivered: [], total: 5000, createdSec: 0 });
    shop.shipper = { vehicle: 'bike', x: 0, z: 0, dir: 0, state: 'waiting', orderIds: [1], waited: 3 };
    const again = normalizeLoaded(JSON.parse(JSON.stringify(w)));
    expect(again.shops.banh_mi.orders).toEqual([]);
    expect(again.shops.banh_mi.shipper).toBeNull();
  });
});

describe('normalizeLoaded v4 → v5 (Review Focus 3)', () => {
  it('puts everyone in the bánh mì cart, adds the two new shops unrented, machines on', () => {
    const w4 = normalizeLoaded(v1Save()) as unknown as Record<string, any>;
    w4.schemaVersion = 4;
    delete w4.extraWagesOwed;
    delete w4.shops.com_tam;
    delete w4.shops.pho_cafe;
    delete w4.shops.banh_mi.owned;
    for (const st of Object.values<any>(w4.shops.banh_mi.stations)) {
      delete st.enabled;
      delete st.seats;
    }
    for (const p of Object.values<any>(w4.players)) delete p.location;
    const w = normalizeLoaded(w4);
    expect(w.schemaVersion).toBe(8);
    expect(w.shops.banh_mi.owned).toBe(true);
    expect(w.shops.com_tam.owned).toBe(false);
    expect(w.shops.pho_cafe.owned).toBe(false);
    expect(w.shops.com_tam.stations.noi_com.unlocked).toBe(true);
    expect(w.shops.banh_mi.stations.lo_banh_mi.enabled).toBe(true);
    expect(Object.values(w.players).every((p) => p.location === 'banh_mi')).toBe(true);
    expect(w.extraWagesOwed).toBe(0);
  });

  it('a player saved in a shop that is no longer owned is moved back to the cart', () => {
    const w = normalizeLoaded(v1Save());
    const p = Object.values(w.players)[0];
    p.location = 'com_tam';
    const again = normalizeLoaded(JSON.parse(JSON.stringify(w)));
    expect(Object.values(again.players)[0].location).toBe('banh_mi');
  });
});
