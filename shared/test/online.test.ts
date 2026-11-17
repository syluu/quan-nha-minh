import { describe, expect, it } from 'vitest';
import { K } from '../src/money';
import { isOnlineOpen, tickOrders } from '../src/sim/online';
import { joinPlayer } from '../src/sim/players';
import { createWorld } from '../src/sim/world';
import type { WorldState } from '../src/sim/world';
import { repeat } from './helpers';

export function onlineWorld(seed = 42): WorldState {
  const w = createWorld('X', seed);
  joinPlayer(w, 'a', 'Bố');
  w.shops.banh_mi.stations.diem_giao.unlocked = true;
  return w;
}

/** Chạy cả ngày chỉ phần sinh đơn; `drain` = có người giao ngay (xoá đơn) để đếm tổng số đơn sinh ra. */
function runDay(w: WorldState, drain: boolean): number {
  repeat(360, (dt) => {
    tickOrders(w, 'banh_mi', dt);
    if (drain) w.shops.banh_mi.orders = [];
    w.secOfDay += dt;
  });
  return w.shops.banh_mi.nextOrderId - 1;
}

describe('online orders', () => {
  it('none until the pickup point is opened', () => {
    const w = onlineWorld();
    w.shops.banh_mi.stations.diem_giao.unlocked = false;
    expect(isOnlineOpen(w, 'banh_mi')).toBe(false);
    expect(runDay(w, true)).toBe(0);
  });

  it('about one order attempt every 20 s at 3 stars; ~40% walk away at market price', () => {
    // ≈ 17,5 lượt đặt/ngày × 60% chấp nhận giá ≈ 10 đơn
    const counts = [1, 2, 3, 42].map((seed) => runDay(onlineWorld(seed), true));
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
    expect(avg).toBeGreaterThanOrEqual(6);
    expect(avg).toBeLessThanOrEqual(16);
  });

  it('never more than 6 waiting', () => {
    const w = onlineWorld();
    runDay(w, false);
    expect(w.shops.banh_mi.orders.length).toBe(6);
  });

  it('pausing stops new orders but keeps what is already there (Review Focus 2)', () => {
    const w = onlineWorld();
    repeat(60, (dt) => {
      tickOrders(w, 'banh_mi', dt);
      w.secOfDay += dt;
    });
    const before = w.shops.banh_mi.orders.map((o) => o.id);
    expect(before.length).toBeGreaterThan(0);
    w.shops.banh_mi.onlinePaused = true;
    expect(isOnlineOpen(w, 'banh_mi')).toBe(false);
    repeat(120, (dt) => tickOrders(w, 'banh_mi', dt));
    expect(w.shops.banh_mi.orders.map((o) => o.id)).toEqual(before);
  });

  it('price twice the market price → nobody orders', () => {
    const w = onlineWorld();
    w.shops.banh_mi.prices.banh_mi = K(10);
    expect(runDay(w, true)).toBe(0);
  });

  it('orders list items on sale with their total at the current price', () => {
    const w = onlineWorld();
    w.shops.banh_mi.prices.banh_mi = K(5.5);
    repeat(100, (dt) => {
      tickOrders(w, 'banh_mi', dt);
      w.secOfDay += dt;
    });
    const o = w.shops.banh_mi.orders[0];
    expect(o.items.every((i) => i === 'banh_mi')).toBe(true);
    expect(o.total).toBe(o.items.length * 5500);
    expect(o.delivered).toEqual([]);
  });
});

describe('shipper and delivery', async () => {
  const { tick } = await import('../src/sim/tick');
  const { getPlaced, BALANCE } = await import('../src/content');
  const { putPlayer } = await import('./helpers');
  const { pickupNeeds } = await import('../src/sim/online');
  type Ev = import('../src/sim/events').SimEvent;

  function setup() {
    const w = onlineWorld();
    w.shops.banh_mi.nextCustomerIn = 1e9; // không có khách tại quán
    w.shops.banh_mi.nextOrderIn = 1e9; // đơn do test tạo
    w.shops.banh_mi.stations.lo_banh_mi.unlocked = false; // không tốn nguyên liệu
    w.players.a.x = 0; w.players.a.z = 3; // đứng xa
    return w;
  }
  const order = (w: WorldState, items: string[], total: number) =>
    w.shops.banh_mi.orders.push({ id: w.shops.banh_mi.nextOrderId++, items: items as never, delivered: [], total, createdSec: w.secOfDay });
  const run = (w: WorldState, sec: number) => {
    const ev: Ev[] = [];
    repeat(sec, (dt) => ev.push(...tick(w, dt)));
    return ev;
  };
  const atPickup = (w: WorldState, carry: string[]) => {
    const wp = getPlaced('banh_mi', 'diem_giao').workPoint;
    return putPlayer(w, 'b', wp.x, wp.z, carry as never);
  };

  it('a motorbike comes for one order; handing the item pays 80% and rates the shop', () => {
    const w = setup();
    order(w, ['banh_mi'], 5000);
    run(w, 3);
    expect(w.shops.banh_mi.shipper).toMatchObject({ vehicle: 'bike', state: 'waiting', orderIds: [1] });
    expect(pickupNeeds(w.shops.banh_mi)).toEqual(['banh_mi']);
    const money = w.money;
    const p = atPickup(w, ['banh_mi']);
    const ev = run(w, 0.5);
    expect(p.carry).toEqual([]);
    expect(w.money).toBe(money + 4000);
    expect(w.dayStats).toMatchObject({ commission: 1000, onlineOrders: 1, revenue: 5000, sold: { banh_mi: 1 } });
    expect(w.shops.banh_mi.ratings.at(-1)).toBe(5);
    expect(ev.some((e) => e.type === 'orderDone')).toBe(true);
    expect(w.shops.banh_mi.shipper?.state).toBe('leaving');
  });

  it('a shipper who waits too long leaves: order cancelled, 1 star, handed items wasted', () => {
    const w = setup();
    order(w, ['banh_mi', 'banh_mi'], 10_000);
    run(w, 3);
    atPickup(w, ['banh_mi']);
    run(w, 0.5); // đưa được 1/2
    w.players.b.online = false;
    const ev = run(w, BALANCE.ONLINE.bike.patience);
    expect(ev.some((e) => e.type === 'orderCancelled')).toBe(true);
    expect(w.shops.banh_mi.orders).toEqual([]);
    expect(w.dayStats.onlineCancelled).toBe(1);
    expect(w.dayStats.wasted).toBe(2000);
    expect(w.shops.banh_mi.ratings.at(-1)).toBe(1);
  });

  it('a car (pickup level 1) waits for 2+ orders, then takes up to 5', () => {
    const w = setup();
    w.shops.banh_mi.stations.diem_giao.level = 1;
    order(w, ['banh_mi'], 5000);
    run(w, 5);
    expect(w.shops.banh_mi.shipper).toBeNull(); // 1 đơn mới, chưa đủ 30 s
    for (let i = 0; i < 6; i++) order(w, ['banh_mi'], 5000);
    run(w, 1);
    expect(w.shops.banh_mi.shipper).toMatchObject({ vehicle: 'car' });
    expect(w.shops.banh_mi.shipper!.orderIds).toHaveLength(5);
  });

  it('the last item handed on the very tick patience runs out completes the order (Review Focus 1)', () => {
    const w = setup();
    order(w, ['banh_mi'], 5000);
    run(w, 3);
    const s = w.shops.banh_mi.shipper!;
    s.waited = BALANCE.ONLINE.bike.patience - 0.01;
    const money = w.money;
    atPickup(w, ['banh_mi']);
    const ev = run(w, 0.05);
    expect(ev.filter((e) => e.type === 'orderDone')).toHaveLength(1);
    expect(ev.filter((e) => e.type === 'orderCancelled')).toHaveLength(0);
    expect(w.money).toBe(money + 4000);
  });
});
