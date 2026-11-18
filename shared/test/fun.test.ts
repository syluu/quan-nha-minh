import { describe, expect, it } from 'vitest';
import { BADGES, FUN, festivalOfDay, getPlaced } from '../src/content';
import { checkBadges, checkQuests, emote, highFive, makeQuests, startDay, tickCat, tickPlayersFun, tickTour } from '../src/sim/fun';
import { spawnCustomer, tickCustomers } from '../src/sim/customers';
import { advanceTime } from '../src/sim/time';
import { tick } from '../src/sim/tick';
import { bankrupt } from '../src/sim/settlement';
import { normalizeLoaded } from '../src/sim/snapshot';
import { createWorld } from '../src/sim/world';
import { putPlayer, repeat } from './helpers';

function payingCustomer(w: ReturnType<typeof createWorld>, waited = 0) {
  const cashier = getPlaced('banh_mi', 'thu_ngan');
  const c = spawnCustomer(w, 'banh_mi')!;
  Object.assign(c, { state: 'inQueue', wants: [], holding: ['banh_mi'], bill: 10_000, waited, x: cashier.customerPoint!.x, z: cashier.customerPoint!.z });
  return c;
}

describe('tips, faces and combos', () => {
  it('a quick sale earns a tip and a happy face; every 5 quick sales in a row pays a combo bonus', () => {
    const w = createWorld('X', 1);
    w.shops.banh_mi.nextCustomerIn = 1e9;
    const wp = getPlaced('banh_mi', 'thu_ngan').workPoint;
    putPlayer(w, 'a', wp.x, wp.z);
    const events: { type: string }[] = [];
    for (let i = 0; i < 5; i++) {
      const c = payingCustomer(w);
      repeat(1.1, (dt) => events.push(...tickCustomers(w, 'banh_mi', dt)));
      expect(c.face).toBe('😍');
      w.shops.banh_mi.customers = [];
    }
    expect(w.dayStats.tips).toBe(5 * 1000);
    expect(w.shops.banh_mi.combo).toBe(5);
    expect(events.filter((e) => e.type === 'combo')).toHaveLength(1);
    expect(w.dayPlayers.a.served).toBe(5);
    // Khách chờ lâu: không boa, combo về 0.
    const slow = payingCustomer(w, 25);
    repeat(1.1, (dt) => tickCustomers(w, 'banh_mi', dt));
    expect(slow.face).toBe('😐');
    expect(w.shops.banh_mi.combo).toBe(0);
  });

  it('tourists buy at higher prices and tip more', () => {
    const w = createWorld('X', 1);
    w.shops.banh_mi.prices.banh_mi = 8_000; // đắt hơn giá thị trường 60%: khách thường không mua
    const c = spawnCustomer(w, 'banh_mi', true)!;
    expect(c.tourist).toBe(true);
    expect(c.wants).toEqual(['banh_mi']);
  });
});

describe('a day full of surprises', () => {
  it('each new day sets the weather, maybe a tour bus, a stray cat and 3 quests (only once per day)', () => {
    const w = createWorld('X', 7);
    startDay(w);
    expect(['sun', 'rain']).toContain(w.weather);
    expect(w.quests).toHaveLength(FUN.QUESTS_PER_DAY);
    const before = JSON.stringify(w.quests);
    startDay(w);
    expect(JSON.stringify(w.quests)).toBe(before);
  });

  it('a tour bus drops 10 tourists one by one', () => {
    const w = createWorld('X', 1);
    w.tour = { shopId: 'banh_mi', at: 10, done: false };
    w.secOfDay = 11;
    expect(tickTour(w, 'banh_mi')).toEqual([{ type: 'tourBus', shopId: 'banh_mi' }]);
    w.shops.banh_mi.nextCustomerIn = 1e9;
    repeat(10, (dt) => tickCustomers(w, 'banh_mi', dt));
    expect(w.shops.banh_mi.customers.filter((c) => c.tourist).length).toBeGreaterThanOrEqual(9);
  });

  it('feeding the stray cat makes it the shop cat and raises the stars', () => {
    const w = createWorld('X', 1);
    w.shops.banh_mi.cat = 'stray';
    const spot = { x: -5, z: 4.7 };
    putPlayer(w, 'a', spot.x, spot.z, ['banh_mi']);
    expect(tickCat(w, 'banh_mi')).toHaveLength(1);
    expect(w.shops.banh_mi.cat).toBe('pet');
    expect(w.players.a.carry).toEqual([]);
    expect(w.shops.banh_mi.ratings).toEqual([5, 5, 5]);
  });

  it('festival days come every 10 days', () => {
    expect(festivalOfDay(9)).toBeNull();
    expect(festivalOfDay(10)?.id).toBe('tet');
    expect(festivalOfDay(20)?.id).toBe('trung_thu');
  });
});

describe('family play', () => {
  it('emotes show for 3 seconds; a high-five next to each other boosts both', () => {
    const w = createWorld('X', 1);
    const a = putPlayer(w, 'a', 0, 2);
    const b = putPlayer(w, 'b', 0.8, 2);
    expect(emote(w, 'a', 'wave')).toEqual({ ok: true });
    expect(emote(w, 'a', 'boom')).toEqual({ ok: false, error: 'BAD_ITEM' });
    expect(a.emote).toBe('wave');
    highFive(w, 'a');
    highFive(w, 'b');
    const ev = tickPlayersFun(w, 0.05);
    expect(ev[0]).toMatchObject({ type: 'highFive', names: ['a', 'b'] });
    expect(a.boost).toBe(FUN.HIFIVE_BOOST_SEC);
    expect(b.boost).toBe(FUN.HIFIVE_BOOST_SEC);
    // Tăng tốc: cùng một khoảng thời gian đi xa hơn.
    a.input = { mx: 1, mz: 0 };
    const x0 = a.x;
    tick(w, 0.5);
    expect(a.x - x0).toBeGreaterThan(3.2 * 0.5 * 1.2);
  });

  it('the day summary lists what each family member did', () => {
    const w = createWorld('X', 1);
    putPlayer(w, 'a', 0, 2);
    w.dayPlayers = { a: { name: 'a', placed: 12, served: 30, cleaned: 0, crates: 0 } };
    w.secOfDay = 359.99;
    const s = advanceTime(w, 0.05)!;
    expect(s.players).toEqual([{ name: 'a', placed: 12, served: 30, cleaned: 0, crates: 0 }]);
    expect(w.dayPlayers).toEqual({});
  });
});

describe('quests and badges', () => {
  it('a finished quest pays its reward once', () => {
    const w = createWorld('X', 1);
    w.quests = [{ id: 'q', kind: 'serve', target: 3, reward: 300_000, done: false }];
    w.dayStats.served = 3;
    const ev = checkQuests(w);
    expect(ev).toHaveLength(1);
    expect(w.money).toBe(5_300_000);
    expect(checkQuests(w)).toEqual([]);
    expect(w.lifetime.quests).toBe(1);
  });

  it('"no customer lost" fails as soon as one leaves, and needs real customers', () => {
    const w = createWorld('X', 1);
    w.quests = [{ id: 'q', kind: 'no_lost', target: 14, reward: 400_000, done: false }];
    w.secOfDay = 200; // sau 14:00
    checkQuests(w);
    expect(w.quests[0].done).toBe(false); // chưa đủ 10 khách
    w.dayStats.lost = 1;
    checkQuests(w);
    expect(w.quests[0].failed).toBe(true);
  });

  it('quests fit the shop: no online / cleaning quests before those exist', () => {
    const w = createWorld('X', 3);
    for (let i = 0; i < 20; i++) for (const q of makeQuests(w)) expect(['online', 'clean']).not.toContain(q.kind);
  });

  it('badges are earned once, logged, and kept after bankruptcy', () => {
    const w = createWorld('X', 1);
    w.lifetime.sold.banh_mi = 120;
    expect(checkBadges(w).map((e) => (e as { id: string }).id)).toEqual(['banh_mi_100']);
    expect(checkBadges(w)).toEqual([]);
    bankrupt(w);
    expect(w.badges).toEqual(['banh_mi_100']);
    expect(BADGES.length).toBeGreaterThanOrEqual(12);
  });

  it('save v9 → v10 adds the new fields', () => {
    const raw = JSON.parse(JSON.stringify(createWorld('ABC-DEF', 1)));
    raw.schemaVersion = 9;
    delete raw.quests;
    delete raw.badges;
    delete raw.lifetime;
    delete raw.dayStats.tips;
    const w = normalizeLoaded(raw);
    expect(w.schemaVersion).toBe(10);
    expect(w.badges).toEqual([]);
    expect(w.lifetime.quests).toBe(0);
    expect(w.dayStats.tips).toBe(0);
  });
});

describe('tour bus parks at the curb (owner request)', () => {
  it('tourists step off at the bus door after it stops, walk back to it, and the bus waits for all of them', async () => {
    const { tourDoor, tourBusSpot } = await import('../src/sim/fun');
    const w = createWorld('X', 1);
    w.shops.banh_mi.nextCustomerIn = 1e9;
    w.tour = { shopId: 'banh_mi', at: 10, done: false };
    w.secOfDay = 11;
    tickTour(w, 'banh_mi');
    const door = tourDoor('banh_mi');
    expect(tourBusSpot('banh_mi').z).toBeGreaterThan(6); // ngoài đường, không phải vỉa hè trong quán
    repeat(2.5, (dt) => tickCustomers(w, 'banh_mi', dt));
    expect(w.shops.banh_mi.customers).toHaveLength(0); // xe chưa dừng hẳn
    repeat(0.6, (dt) => tickCustomers(w, 'banh_mi', dt));
    const first = w.shops.banh_mi.customers[0];
    expect(first.tourist).toBe(true);
    expect(Math.hypot(first.x - door.x, first.z - door.z)).toBeLessThan(1.5);
    // Một khách đoàn mua xong đi ra lại xe.
    Object.assign(first, { state: 'leaving', x: 0, z: 2 });
    repeat(8, (dt) => tickCustomers(w, 'banh_mi', dt));
    expect(w.shops.banh_mi.customers.includes(first)).toBe(false);
    // Xe vẫn đỗ khi còn khách đoàn trong quán, dù đã quá thời gian tối thiểu.
    for (let i = 0; i < 40; i++) {
      w.secOfDay += 1;
      tickTour(w, 'banh_mi');
    }
    expect(w.shops.banh_mi.customers.some((c) => c.tourist)).toBe(true);
    expect(w.shops.banh_mi.tourBusUntil!).toBeGreaterThan(w.secOfDay);
  });
});
