import { BALANCE, ITEMS, SHOPS, getStationDef } from '../content';
import type { ItemId, PlacedStation, ShopId, ShopLayout } from '../content';
import { distanceToFootprint } from './carry';
import type { SimEvent } from './events';
import { effectiveStars, marketingMultiplier } from './marketing';
import { pushRating } from './rating';
import { gameHour } from './time';
import type { Customer, ShopState, WorldState } from './world';
import { nextRandom } from './world';

const ARRIVE = 0.05;

export function trafficMultiplier(s: number): number {
  const pts = BALANCE.STAR_MULT;
  if (s <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x0, y0] = pts[i - 1];
    if (s <= x1) return y0 + ((s - x0) / (x1 - x0)) * (y1 - y0);
  }
  return pts[pts.length - 1][1];
}

export function hourMultiplier(layout: ShopLayout, hour: number): number {
  const seg = layout.hourCurve.find(([from, to]) => hour >= from && hour < to);
  return seg ? seg[2] : 0;
}

export function priceOf(shop: ShopState, item: ItemId): number {
  return shop.prices[item] ?? ITEMS[item].basePrice;
}

function cashierOf(shopId: ShopId): PlacedStation {
  return SHOPS[shopId].stations.find((s) => getStationDef(s.def).kind === 'cashier')!;
}

function displayFor(shopId: ShopId, item: ItemId): PlacedStation | undefined {
  return SHOPS[shopId].stations.find((s) => {
    const d = getStationDef(s.def);
    return d.kind === 'display' && d.item === item;
  });
}

export function isCashierManned(world: WorldState, shopId: ShopId): boolean {
  const cashier = cashierOf(shopId);
  const near = (x: number, z: number) => distanceToFootprint(cashier, x, z) <= BALANCE.CASHIER_DIST;
  return (
    Object.values(world.players).some((p) => p.online && p.location === shopId && near(p.x, p.z)) ||
    world.shops[shopId].staff.some((s) => s.role === 'cashier' && near(s.x, s.z))
  );
}

function pickWeighted<T>(world: WorldState, list: T[], weight: (t: T) => number): T {
  const total = list.reduce((s, t) => s + weight(t), 0);
  let r = nextRandom(world) * total;
  for (const t of list) {
    r -= weight(t);
    if (r < 0) return t;
  }
  return list[list.length - 1];
}

/**
 * Chọn món một người mua muốn (1–3 món đang bán, theo độ thích từng món), rồi bỏ món đắt hơn giá họ chấp nhận.
 * Dùng chung cho khách tại quán và đơn online.
 */
export function chooseWants(world: WorldState, shopId: ShopId): { candidates: ItemId[]; kept: ItemId[] } {
  const shop = world.shops[shopId];
  const candidates = (Object.keys(ITEMS) as ItemId[]).filter((it) => {
    if (!ITEMS[it].sellable) return false;
    const d = displayFor(shopId, it);
    return d !== undefined && shop.stations[d.instanceId].unlocked;
  });
  if (candidates.length === 0) return { candidates, kept: [] };
  const weights = BALANCE.ITEMS_PER_CUSTOMER_WEIGHTS;
  const n = Math.min(pickWeighted(world, [1, 2, 3], (k) => weights[k - 1]), candidates.length);
  const pool = [...candidates];
  const kept: ItemId[] = [];
  for (let i = 0; i < n; i++) {
    const item = pickWeighted(world, pool, (it) => ITEMS[it].demandWeight);
    pool.splice(pool.indexOf(item), 1);
    const wtp = ITEMS[item].basePrice * (BALANCE.WTP_MIN + nextRandom(world) * (BALANCE.WTP_MAX - BALANCE.WTP_MIN));
    if (priceOf(shop, item) <= wtp) kept.push(item);
  }
  return { candidates, kept };
}

/** Sinh một khách ở lối vào và quyết định họ muốn mua gì theo giá. */
export function spawnCustomer(world: WorldState, shopId: ShopId): Customer | null {
  const shop = world.shops[shopId];
  const layout = SHOPS[shopId];
  const { candidates, kept } = chooseWants(world, shopId);
  if (candidates.length === 0) return null;

  const c: Customer = {
    id: shop.nextCustomerId++,
    x: layout.entrance.x,
    z: layout.entrance.z,
    dir: 0,
    state: kept.length ? 'toShelf' : 'leaving',
    wants: kept,
    bill: 0,
    waited: 0,
    payTimer: 0,
    holding: [],
    scored: false,
    table: null,
    seat: 0,
    eatTimer: 0,
  };
  if (!kept.length) {
    pushRating(shop, BALANCE.SCORE_PRICEY);
    c.scored = true;
  }
  shop.customers.push(c);
  return c;
}

function walk(c: Customer, tx: number, tz: number, dt: number): boolean {
  const dx = tx - c.x;
  const dz = tz - c.z;
  const d = Math.hypot(dx, dz);
  if (d <= ARRIVE) {
    c.x = tx;
    c.z = tz;
    return true;
  }
  const step = Math.min(d, BALANCE.CUSTOMER_SPEED * dt);
  c.x += (dx / d) * step;
  c.z += (dz / d) * step;
  c.dir = Math.atan2(dx, dz);
  return step >= d - ARRIVE;
}

function scoreFor(waited: number): number {
  if (waited <= BALANCE.SCORE_FAST_SEC) return 5;
  if (waited <= BALANCE.SCORE_OK_SEC) return 4;
  return 3;
}

export function tickCustomers(world: WorldState, shopId: ShopId, dt: number): SimEvent[] {
  const events: SimEvent[] = [];
  const shop = world.shops[shopId];
  const layout = SHOPS[shopId];

  // Sinh khách
  shop.nextCustomerIn -= dt;
  if (shop.nextCustomerIn <= 0) {
    const hour = gameHour(world.secOfDay);
    const hm = hour < BALANCE.LAST_SPAWN_HOUR ? hourMultiplier(layout, hour) : 0;
    if (hm <= 0) {
      shop.nextCustomerIn = 1;
    } else if (shop.customers.length >= BALANCE.MAX_CUSTOMERS) {
      shop.nextCustomerIn = 0.5;
    } else {
      spawnCustomer(world, shopId);
      const mean = layout.baseCustomerIntervalSec / (hm * trafficMultiplier(effectiveStars(shop)) * marketingMultiplier(shop));
      shop.nextCustomerIn = -Math.log(1 - nextRandom(world)) * mean;
    }
  }

  const cashier = cashierOf(shopId);
  const manned = isCashierManned(world, shopId);
  let queueIndex = 0;

  for (const c of [...shop.customers]) {
    switch (c.state) {
      case 'toShelf': {
        const d = displayFor(shopId, c.wants[0])!;
        if (walk(c, d.customerPoint!.x, d.customerPoint!.z, dt)) c.state = 'atShelf';
        break;
      }
      case 'atShelf': {
        const d = displayFor(shopId, c.wants[0])!;
        const st = shop.stations[d.instanceId];
        if (st.stock > 0) {
          st.stock -= 1;
          const item = c.wants.shift()!;
          c.holding.push(item);
          c.bill += priceOf(shop, item);
          if (c.wants.length) c.state = 'toShelf';
          else {
            c.state = 'toQueue';
            // Xếp cuối hàng: dời xuống cuối mảng để thứ tự mảng = thứ tự hàng.
            shop.customers.splice(shop.customers.indexOf(c), 1);
            shop.customers.push(c);
          }
        } else c.waited += dt;
        break;
      }
      case 'toQueue':
      case 'inQueue':
      case 'paying': {
        const i = queueIndex++;
        const tx = cashier.customerPoint!.x + layout.queueDir.x * BALANCE.QUEUE_SPACING * i;
        const tz = cashier.customerPoint!.z + layout.queueDir.z * BALANCE.QUEUE_SPACING * i;
        const arrived = walk(c, tx, tz, dt);
        if (!arrived) {
          c.state = 'toQueue';
          break;
        }
        if (c.state === 'toQueue') c.state = 'inQueue';
        if (i === 0 && manned) {
          c.state = 'paying';
          c.payTimer += dt;
          if (c.payTimer >= BALANCE.CASHIER_SERVICE_SEC - 1e-6) {
            world.money += c.bill;
            world.dayStats.revenue += c.bill;
            world.dayStats.served += 1;
            for (const it of c.holding) world.dayStats.sold[it] = (world.dayStats.sold[it] ?? 0) + 1;
            pushRating(shop, scoreFor(c.waited));
            c.scored = true;
            c.state = 'leaving';
            events.push({ type: 'sale', shopId, amount: c.bill, x: c.x, z: c.z });
          }
        } else c.waited += dt;
        break;
      }
      case 'leaving': {
        if (walk(c, layout.exit.x, layout.exit.z, dt)) shop.customers.splice(shop.customers.indexOf(c), 1);
        break;
      }
    }

    if (!c.scored && c.waited > BALANCE.PATIENCE_SEC) {
      pushRating(shop, BALANCE.SCORE_ABANDON);
      c.scored = true;
      c.state = 'leaving';
      c.holding = [];
      world.dayStats.lost += 1;
      events.push({ type: 'customerLost', shopId, x: c.x, z: c.z });
    }
  }
  return events;
}
