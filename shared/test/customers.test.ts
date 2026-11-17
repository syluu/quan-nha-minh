import { describe, expect, it } from 'vitest';
import { K } from '../src/money';
import { SHOPS } from '../src/content';
import { hourMultiplier, isCashierManned, spawnCustomer, tickCustomers, trafficMultiplier } from '../src/sim/customers';
import type { SimEvent } from '../src/sim/events';
import { gameHour } from '../src/sim/time';
import { createWorld } from '../src/sim/world';
import { putPlayer, repeat } from './helpers';

const NEAR_CASHIER = { x: 4.6, z: -0.9 };

function noMoreSpawns(w: ReturnType<typeof createWorld>) {
  w.shops.banh_mi.nextCustomerIn = 1e9;
}

describe('multipliers', () => {
  it('interpolates traffic by stars', () => {
    expect(trafficMultiplier(1)).toBeCloseTo(0.5);
    expect(trafficMultiplier(3)).toBeCloseTo(1);
    expect(trafficMultiplier(4.5)).toBeCloseTo(1.575);
    expect(trafficMultiplier(5)).toBeCloseTo(1.8);
  });
  it('uses the hour curve and is 0 outside it', () => {
    expect(hourMultiplier(SHOPS.banh_mi, 7)).toBe(1.8);
    expect(hourMultiplier(SHOPS.banh_mi, 14)).toBe(0.6);
    expect(hourMultiplier(SHOPS.banh_mi, 23)).toBe(0);
  });
});

describe('spawning over a day', () => {
  it('spawns 60–130 customers, none after 21:30, never more than 20 at once', () => {
    const w = createWorld('X', 42);
    putPlayer(w, 'cashier', NEAR_CASHIER.x, NEAR_CASHIER.z);
    let maxAtOnce = 0;
    repeat(360, (dt) => {
      w.shops.banh_mi.stations.ke_banh_mi.stock = 10;
      const before = w.shops.banh_mi.nextCustomerId;
      tickCustomers(w, 'banh_mi', dt);
      if (w.shops.banh_mi.nextCustomerId > before) expect(gameHour(w.secOfDay)).toBeLessThan(21.5);
      maxAtOnce = Math.max(maxAtOnce, w.shops.banh_mi.customers.length);
      w.secOfDay += dt;
    });
    const spawned = w.shops.banh_mi.nextCustomerId - 1;
    expect(spawned).toBeGreaterThanOrEqual(60);
    expect(spawned).toBeLessThanOrEqual(130);
    expect(maxAtOnce).toBeLessThanOrEqual(20);
  });
});

describe('a single customer', () => {
  it('walks away (rating 3) when every wanted item is too expensive', () => {
    const w = createWorld('X', 1);
    w.shops.banh_mi.prices.banh_mi = K(10);
    const c = spawnCustomer(w, 'banh_mi')!;
    expect(c.state).toBe('leaving');
    expect(w.shops.banh_mi.ratings).toEqual([3]);
    expect(w.money).toBe(5_000_000);
  });

  it('gives up after PATIENCE_SEC when nobody is at the cashier (rating 1)', () => {
    const w = createWorld('X', 1);
    w.shops.banh_mi.stations.ke_banh_mi.stock = 1;
    spawnCustomer(w, 'banh_mi');
    noMoreSpawns(w);
    const events: SimEvent[] = [];
    repeat(60, (dt) => events.push(...tickCustomers(w, 'banh_mi', dt)));
    expect(w.shops.banh_mi.ratings.at(-1)).toBe(1);
    expect(w.dayStats.lost).toBe(1);
    expect(events.some((e) => e.type === 'customerLost')).toBe(true);
    expect(w.money).toBe(5_000_000);
  });

  it('pays at a manned cashier: money += bill, served, rating 5', () => {
    const w = createWorld('X', 1);
    w.shops.banh_mi.stations.ke_banh_mi.stock = 1;
    putPlayer(w, 'cashier', NEAR_CASHIER.x, NEAR_CASHIER.z);
    expect(isCashierManned(w, 'banh_mi')).toBe(true);
    spawnCustomer(w, 'banh_mi');
    noMoreSpawns(w);
    const events: SimEvent[] = [];
    repeat(15, (dt) => events.push(...tickCustomers(w, 'banh_mi', dt)));
    expect(w.money).toBe(5_000_000 + 5000);
    expect(w.dayStats.served).toBe(1);
    expect(w.dayStats.revenue).toBe(5000);
    expect(w.shops.banh_mi.ratings).toEqual([5]);
    expect(events.filter((e) => e.type === 'sale')).toHaveLength(1);
    expect(w.shops.banh_mi.stations.ke_banh_mi.stock).toBe(0);
  });

  it('waits at an empty shelf and buys once it is restocked', () => {
    const w = createWorld('X', 1);
    putPlayer(w, 'cashier', NEAR_CASHIER.x, NEAR_CASHIER.z);
    spawnCustomer(w, 'banh_mi');
    noMoreSpawns(w);
    repeat(10, (dt) => tickCustomers(w, 'banh_mi', dt));
    expect(w.shops.banh_mi.customers[0].state).toBe('atShelf');
    w.shops.banh_mi.stations.ke_banh_mi.stock = 1;
    repeat(10, (dt) => tickCustomers(w, 'banh_mi', dt));
    expect(w.dayStats.served).toBe(1);
  });
});
