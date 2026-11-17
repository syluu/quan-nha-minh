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
