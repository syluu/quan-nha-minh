import { describe, expect, it } from 'vitest';
import { BALANCE, LIFE, SHOP_TIERS, getPlaced } from '../src/content';
import { cashierRate, spawnCustomer, tickCustomers } from '../src/sim/customers';
import { startDay } from '../src/sim/fun';
import {
  acceptParty, addEarned, changeLove, declineParty, dueRegulars, loveLevel, staffSpeedMult, tickParty, tickStaffEnergy, tierTrafficMultiplier, treatStaff,
} from '../src/sim/life';
import { tickCarry } from '../src/sim/carry';
import { normalizeLoaded, toSnapshot } from '../src/sim/snapshot';
import { tickStaff } from '../src/sim/staff';
import { createWorld } from '../src/sim/world';
import type { Party, WorldState } from '../src/sim/world';
import { putPlayer, putStaff, repeat } from './helpers';

function openPickup(w: WorldState) {
  w.shops.banh_mi.stations.diem_giao.unlocked = true;
}

function party(w: WorldState, over: Partial<Party> = {}): Party {
  w.party = {
    kind: 'cuoi', shopId: 'banh_mi', item: 'banh_mi', qty: 3, delivered: 0, offerUntil: 40, dueSec: 120, reward: 50_000, state: 'offer', ...over,
  };
  return w.party;
}

describe('staff energy', () => {
  it('working drains energy and slows staff down; resting brings it back', () => {
    const w = createWorld('X', 1);
    const s = putStaff(w, 'Lan');
    expect(staffSpeedMult(s)).toBe(1);
    repeat(120, (dt) => tickStaffEnergy(s, true, dt));
    expect(s.energy!).toBeLessThan(LIFE.TIRED);
    expect(staffSpeedMult(s)).toBeLessThan(1);
    repeat(60, (dt) => tickStaffEnergy(s, false, dt));
    expect(s.energy).toBe(LIFE.ENERGY_MAX);
  });

  it('a cook who keeps walking gets tired inside tickStaff', () => {
    const w = createWorld('X', 1);
    const s = putStaff(w, 'Lan');
    // Ra lò liên tục: lò luôn có bánh, kệ luôn còn chỗ.
    repeat(150, (dt) => {
      w.shops.banh_mi.stations.lo_banh_mi.outputCount = 5;
      w.shops.banh_mi.stations.ke_banh_mi.stock = 0;
      tickStaff(w, 'banh_mi', dt);
    });
    expect(s.energy!).toBeLessThan(LIFE.TIRED);
  });

  it('a glass of iced tea costs money, refills energy and gives a burst of speed (not twice at once)', () => {
    const w = createWorld('X', 1);
    const s = putStaff(w, 'Lan');
    s.energy = 5;
    const money = w.money;
    expect(treatStaff(w, 'banh_mi', s.id, 'a')).toEqual({ ok: true });
    expect(w.money).toBe(money - LIFE.TEA_COST);
    expect(s.energy).toBe(LIFE.ENERGY_MAX);
    expect(staffSpeedMult(s)).toBe(LIFE.CHEER_SPEED);
    expect(treatStaff(w, 'banh_mi', s.id, 'a')).toEqual({ ok: false, error: 'MAXED' });
    // Đang hăng hái thì làm không mất sức; hết hăng hái mới tụt.
    repeat(LIFE.CHEER_SEC - 1, (dt) => tickStaffEnergy(s, true, dt));
    expect(s.energy).toBe(LIFE.ENERGY_MAX);
    expect(treatStaff(w, 'banh_mi', 'nobody', 'a')).toEqual({ ok: false, error: 'NOT_FOUND' });
  });

  it('a worn-out cashier rings customers up more slowly; the snapshot shows energy', () => {
    const w = createWorld('X', 1);
    const s = putStaff(w, 'Mai', 'cashier');
    const wp = getPlaced('banh_mi', 'thu_ngan').workPoint;
    Object.assign(s, { x: wp.x, z: wp.z });
    expect(cashierRate(w, 'banh_mi')).toBe(1);
    s.energy = 5;
    expect(cashierRate(w, 'banh_mi')).toBe(LIFE.EXHAUSTED_SPEED);
    expect(toSnapshot(w, 'banh_mi').staff[0]).toMatchObject({ energy: 5, cheer: false });
  });
});

describe('regular customers', () => {
  it('a shop gains a regular on day 1 and more over the days (max 3), each with a favourite on sale', () => {
    const w = createWorld('X', 3);
    startDay(w);
    expect(w.regulars).toHaveLength(1);
    expect(w.regulars[0]).toMatchObject({ shopId: 'banh_mi', fav: 'banh_mi', love: 0 });
    for (const d of [3, 5, 9]) {
      w.day = d;
      startDay(w);
    }
    expect(w.regulars).toHaveLength(LIFE.REGULARS_PER_SHOP);
    expect(new Set(w.regulars.map((r) => r.id)).size).toBe(LIFE.REGULARS_PER_SHOP);
  });

  it('a regular comes once a day at their time, orders the favourite and grows fonder when served fast', () => {
    const w = createWorld('X', 3);
    startDay(w);
    const r = w.regulars[0];
    w.shops.banh_mi.nextCustomerIn = 1e9;
    w.secOfDay = r.visitAt + 0.01;
    expect(dueRegulars(w, 'banh_mi')).toEqual([r]);
    tickCustomers(w, 'banh_mi', 0.01);
    const c = w.shops.banh_mi.customers.find((x) => x.regular === r.id)!;
    expect(c.wants).toEqual(['banh_mi']);
    expect(dueRegulars(w, 'banh_mi')).toEqual([]);
    expect(toSnapshot(w, 'banh_mi').customers.find((x) => x.id === c.id)!.regular).toBe(r.id);
    // Phục vụ nhanh ở quầy.
    const cashier = getPlaced('banh_mi', 'thu_ngan');
    putPlayer(w, 'a', cashier.workPoint.x, cashier.workPoint.z);
    Object.assign(c, { state: 'inQueue', wants: [], holding: ['banh_mi'], bill: 5_000, x: cashier.customerPoint!.x, z: cashier.customerPoint!.z });
    repeat(1.1, (dt) => tickCustomers(w, 'banh_mi', dt));
    expect(r.love).toBe(LIFE.LOVE_SERVED + LIFE.LOVE_FAST);
  });

  it('crossing love levels is announced; best friends tip double; a long wait hurts', () => {
    const w = createWorld('X', 3);
    startDay(w);
    const r = w.regulars[0];
    expect(changeLove(w, r, LIFE.LOVE_QUEN, 0, 0)[0]).toMatchObject({ type: 'regular' });
    expect(loveLevel(r.love)).toBe(1);
    expect(changeLove(w, r, 1, 0, 0)).toEqual([]);
    changeLove(w, r, 100, 0, 0);
    expect(r.love).toBe(100);
    expect(loveLevel(r.love)).toBe(2);

    w.shops.banh_mi.nextCustomerIn = 1e9;
    const cashier = getPlaced('banh_mi', 'thu_ngan');
    putPlayer(w, 'a', cashier.workPoint.x, cashier.workPoint.z);
    const c = spawnCustomer(w, 'banh_mi', false, r)!;
    Object.assign(c, { state: 'inQueue', wants: [], holding: ['banh_mi'], bill: 10_000, x: cashier.customerPoint!.x, z: cashier.customerPoint!.z });
    repeat(1.1, (dt) => tickCustomers(w, 'banh_mi', dt));
    expect(w.dayStats.tips).toBe(2_000);

    const angry = spawnCustomer(w, 'banh_mi', false, r)!;
    w.players.a.x = 0; // không ai đứng quầy
    angry.state = 'atShelf';
    w.shops.banh_mi.stations.ke_banh_mi.stock = 0;
    const before = r.love;
    repeat(BALANCE.PATIENCE_SEC + 1, (dt) => tickCustomers(w, 'banh_mi', dt), 0.25);
    expect(r.love).toBe(before + LIFE.LOVE_LOST);
  });

  it('a regular walks off if the favourite is overpriced', () => {
    const w = createWorld('X', 3);
    startDay(w);
    const r = w.regulars[0];
    w.shops.banh_mi.prices.banh_mi = 50_000;
    r.love = 20;
    w.shops.banh_mi.nextCustomerIn = 1e9;
    w.secOfDay = r.visitAt + 0.01;
    tickCustomers(w, 'banh_mi', 0.01);
    expect(r.love).toBe(20 + LIFE.LOVE_PRICEY);
  });
});

describe('party orders', () => {
  it('appear from day 3 only for shops with a delivery point', () => {
    const w = createWorld('X', 5);
    w.day = 3;
    startDay(w);
    expect(w.party).toBeNull();
    let found = false;
    for (let d = 4; d < 40 && !found; d++) {
      w.day = d;
      openPickup(w);
      startDay(w);
      if (w.party) {
        found = true;
        expect(w.party).toMatchObject({ shopId: 'banh_mi', state: 'offer', delivered: 0 });
        expect(LIFE.PARTY_QTY).toContain(w.party.qty);
        expect(w.party.offerUntil).toBeLessThan(w.party.dueSec);
      }
    }
    expect(found).toBe(true);
  });

  it('accepting, delivering every item at the delivery point pays the bonus', () => {
    const w = createWorld('X', 1);
    openPickup(w);
    const p = party(w);
    // Chưa nhận đơn: đứng điểm giao cũng không giao.
    const pk = getPlaced('banh_mi', 'diem_giao').workPoint;
    const pl = putPlayer(w, 'a', pk.x, pk.z, ['banh_mi', 'banh_mi', 'banh_mi', 'banh_mi']);
    repeat(2, (dt) => tickCarry(w, 'banh_mi', dt));
    expect(p.delivered).toBe(0);
    expect(acceptParty(w, 'a')).toEqual({ ok: true });
    expect(acceptParty(w, 'a')).toEqual({ ok: false, error: 'NOT_FOUND' });
    const money = w.money;
    const events: { type: string }[] = [];
    repeat(3, (dt) => events.push(...tickCarry(w, 'banh_mi', dt)));
    expect(p.state).toBe('done');
    expect(pl.carry).toEqual(['banh_mi']);
    expect(w.money).toBe(money + 50_000);
    expect(w.dayStats.sold.banh_mi).toBe(3);
    expect(events.some((e) => e.type === 'partyDone')).toBe(true);
  });

  it('late delivery pays only the normal price for what arrived; unaccepted offers lapse', () => {
    const w = createWorld('X', 1);
    openPickup(w);
    const p = party(w, { state: 'active', delivered: 2 });
    w.secOfDay = p.dueSec;
    const money = w.money;
    expect(tickParty(w)[0]).toMatchObject({ type: 'partyFailed', delivered: 2, qty: 3 });
    expect(p.state).toBe('failed');
    expect(w.money).toBe(money + 2 * 5_000);

    const q = party(w);
    w.secOfDay = q.offerUntil + 1;
    tickParty(w);
    expect(q.state).toBe('declined');
    const r = party(w);
    expect(declineParty(w, 'a')).toEqual({ ok: true });
    expect(r.state).toBe('declined');
  });

  it('a courier also carries party items to the delivery point', () => {
    const w = createWorld('X', 1);
    openPickup(w);
    const p = party(w, { state: 'active' });
    putStaff(w, 'Hùng', 'cook');
    w.shops.banh_mi.staff[0].role = 'courier';
    w.shops.banh_mi.staff[0].item = null;
    w.shops.banh_mi.stations.ke_banh_mi.stock = 5;
    repeat(30, (dt) => tickStaff(w, 'banh_mi', dt));
    expect(p.state).toBe('done');
  });
});

describe('shop tiers', () => {
  it('revenue builds up the shop; crossing a threshold is announced and brings a little more foot traffic', () => {
    const w = createWorld('X', 1);
    expect(tierTrafficMultiplier(w.shops.banh_mi)).toBe(1);
    expect(addEarned(w, 'banh_mi', SHOP_TIERS[1].min - 1)).toEqual([]);
    expect(addEarned(w, 'banh_mi', 1)).toEqual([{ type: 'shopTier', shopId: 'banh_mi', tier: 1 }]);
    expect(tierTrafficMultiplier(w.shops.banh_mi)).toBeCloseTo(1 + LIFE.TIER_TRAFFIC);
    const snap = toSnapshot(w, 'banh_mi');
    expect(snap.life).toMatchObject({ tier: 1, nextTierAt: SHOP_TIERS[2].min });
  });

  it('a sale at the cashier counts towards the shop', () => {
    const w = createWorld('X', 1);
    w.shops.banh_mi.nextCustomerIn = 1e9;
    const cashier = getPlaced('banh_mi', 'thu_ngan');
    putPlayer(w, 'a', cashier.workPoint.x, cashier.workPoint.z);
    const c = spawnCustomer(w, 'banh_mi')!;
    Object.assign(c, { state: 'inQueue', wants: [], holding: ['banh_mi'], bill: 10_000, waited: 20, x: cashier.customerPoint!.x, z: cashier.customerPoint!.z });
    repeat(1.1, (dt) => tickCustomers(w, 'banh_mi', dt));
    expect(w.shops.banh_mi.earned).toBe(10_000);
  });
});

describe('save v10 → v11', () => {
  it('splits past revenue between owned shops and starts with no regulars or party', () => {
    const w = createWorld('X', 1) as unknown as Record<string, any>;
    w.schemaVersion = 10;
    delete w.regulars;
    delete w.party;
    for (const s of Object.values<any>(w.shops)) delete s.earned;
    w.history = [{ revenue: 1_000_000 }, { revenue: 500_000 }];
    const loaded = normalizeLoaded(JSON.parse(JSON.stringify(w)));
    expect(loaded.schemaVersion).toBe(11);
    expect(loaded.regulars).toEqual([]);
    expect(loaded.party).toBeNull();
    expect(loaded.shops.banh_mi.earned).toBe(1_500_000);
    expect(loaded.shops.com_tam.earned).toBe(0);
  });
});
