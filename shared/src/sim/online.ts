import { BALANCE, SHOPS, getStationDef, itemCost } from '../content';
import type { ItemId, PlacedStation, ShopId } from '../content';
import type { SimEvent } from './events';
import { pushRating } from './rating';
import { chooseWants, hourMultiplier, priceOf, trafficMultiplier } from './customers';
import { effectiveStars, marketingMultiplier } from './marketing';
import { gameHour } from './time';
import type { Order, ShopState, Shipper, WorldState } from './world';
import { nextRandom } from './world';

/** Điểm giao hàng của quán (trạm kind 'pickup'). */
export function pickupOf(shopId: ShopId): PlacedStation | undefined {
  return SHOPS[shopId].stations.find((p) => getStationDef(p.def).kind === 'pickup');
}

/** Quán đang nhận đơn online: đã mở điểm giao và không tạm ngưng. */
export function isOnlineOpen(world: WorldState, shopId: ShopId): boolean {
  const p = pickupOf(shopId);
  const shop = world.shops[shopId];
  return !!p && shop.stations[p.instanceId].unlocked && !shop.onlinePaused;
}

/** Tạo một đơn online (1–3 món đang bán, lọc theo giá). null nếu không chọn được món nào. */
export function spawnOrder(world: WorldState, shopId: ShopId): Order | null {
  const shop = world.shops[shopId];
  const { kept } = chooseWants(world, shopId);
  if (!kept.length) return null;
  const order: Order = {
    id: shop.nextOrderId++,
    items: kept,
    delivered: [],
    total: kept.reduce((s, it) => s + priceOf(shop, it), 0),
    createdSec: world.secOfDay,
  };
  shop.orders.push(order);
  return order;
}

/** Sinh đơn theo giờ, sao (bình phương — app hiện sao) và quảng cáo. */
export function tickOrders(world: WorldState, shopId: ShopId, dt: number): void {
  const shop = world.shops[shopId];
  shop.nextOrderIn -= dt;
  if (shop.nextOrderIn > 0) return;
  const hour = gameHour(world.secOfDay);
  const hm = hour < BALANCE.ONLINE.lastOrderHour ? hourMultiplier(SHOPS[shopId], hour) : 0;
  if (!isOnlineOpen(world, shopId) || hm <= 0 || shop.orders.length >= BALANCE.ONLINE.maxPending) {
    shop.nextOrderIn = 1;
    return;
  }
  spawnOrder(world, shopId);
  const t = trafficMultiplier(effectiveStars(shop));
  const mean = BALANCE.ONLINE.baseIntervalSec / (hm * t * t * marketingMultiplier(shop));
  shop.nextOrderIn = -Math.log(1 - nextRandom(world)) * mean;
}

// ───────────────────────── Shipper và giao đơn ─────────────────────────

const ARRIVE = 0.05;

export function vehicleOf(world: WorldState, shopId: ShopId): 'bike' | 'car' {
  const p = pickupOf(shopId);
  return p && world.shops[shopId].stations[p.instanceId].level >= 1 ? 'car' : 'bike';
}

function remaining(o: Order): ItemId[] {
  const left = [...o.items];
  for (const d of o.delivered) {
    const i = left.indexOf(d);
    if (i >= 0) left.splice(i, 1);
  }
  return left;
}

/** Món còn thiếu của các đơn shipper đang đứng chờ (rỗng nếu không có ai chờ). */
export function pickupNeeds(shop: ShopState): ItemId[] {
  const s = shop.shipper;
  if (!s || s.state !== 'waiting') return [];
  return shop.orders.filter((o) => s.orderIds.includes(o.id)).flatMap(remaining);
}

function scoreFor(waited: number): number {
  if (waited <= 20) return 5;
  if (waited <= 40) return 4;
  return 3;
}

/** Đưa 1 món cho shipper: ghi vào đơn đầu tiên cần nó; đơn đủ → trả tiền (trừ hoa hồng). */
export function deliverToPickup(world: WorldState, shopId: ShopId, item: ItemId): SimEvent[] {
  const shop = world.shops[shopId];
  const s = shop.shipper;
  if (!s || s.state !== 'waiting') return [];
  const order = shop.orders.find((o) => s.orderIds.includes(o.id) && remaining(o).includes(item));
  if (!order) return [];
  order.delivered.push(item);
  if (remaining(order).length > 0) return [];

  const net = Math.round(order.total * (1 - BALANCE.ONLINE.commission));
  world.money += net;
  world.dayStats.revenue += order.total;
  world.dayStats.commission += order.total - net;
  world.dayStats.onlineOrders += 1;
  for (const it of order.items) world.dayStats.sold[it] = (world.dayStats.sold[it] ?? 0) + 1;
  pushRating(shop, scoreFor(s.waited));
  shop.orders = shop.orders.filter((o) => o !== order);
  const p = pickupOf(shopId)!;
  return [{ type: 'orderDone', shopId, net, x: p.x, z: p.z }];
}

function moveShipper(s: Shipper, tx: number, tz: number, speed: number, dt: number): boolean {
  const dx = tx - s.x;
  const dz = tz - s.z;
  const d = Math.hypot(dx, dz);
  if (d <= ARRIVE) {
    s.x = tx;
    s.z = tz;
    return true;
  }
  const step = Math.min(d, speed * dt);
  s.x += (dx / d) * step;
  s.z += (dz / d) * step;
  s.dir = Math.atan2(dx, dz);
  return d - step <= ARRIVE;
}

/** Gọi shipper khi có đơn; shipper tới, chờ, hết kiên nhẫn thì huỷ đơn còn thiếu rồi đi. */
export function tickShipper(world: WorldState, shopId: ShopId, dt: number): SimEvent[] {
  const shop = world.shops[shopId];
  const pickup = pickupOf(shopId);
  if (!pickup) return [];
  const events: SimEvent[] = [];
  const layout = SHOPS[shopId];

  if (!shop.shipper) {
    if (!shop.stations[pickup.instanceId].unlocked || shop.orders.length === 0) return [];
    const vehicle = vehicleOf(world, shopId);
    let take: Order[] = [];
    if (vehicle === 'bike') take = shop.orders.slice(0, BALANCE.ONLINE.bike.batch);
    else {
      const car = BALANCE.ONLINE.car;
      const oldestWait = world.secOfDay - shop.orders[0].createdSec;
      if (shop.orders.length >= car.batchMin || oldestWait >= car.waitOldest) take = shop.orders.slice(0, car.batchMax);
    }
    if (!take.length) return [];
    shop.shipper = {
      vehicle, x: layout.shipperSpawn.x, z: layout.shipperSpawn.z, dir: 0, state: 'arriving', orderIds: take.map((o) => o.id), waited: 0,
    };
    return [];
  }

  const s = shop.shipper;
  const cfg = s.vehicle === 'bike' ? BALANCE.ONLINE.bike : BALANCE.ONLINE.car;
  const spot = pickup.shipperPoint!;
  if (s.state === 'arriving') {
    if (moveShipper(s, spot.x, spot.z, cfg.speed, dt)) s.state = 'waiting';
  } else if (s.state === 'waiting') {
    const mine = shop.orders.filter((o) => s.orderIds.includes(o.id));
    if (mine.length === 0) {
      s.state = 'leaving';
    } else {
      s.waited += dt;
      if (s.waited > cfg.patience) {
        for (const o of mine) {
          for (const it of o.delivered) world.dayStats.wasted += itemCost(it);
          world.dayStats.onlineCancelled += 1;
          pushRating(shop, BALANCE.SCORE_ABANDON);
          events.push({ type: 'orderCancelled', shopId, x: pickup.x, z: pickup.z });
        }
        shop.orders = shop.orders.filter((o) => !s.orderIds.includes(o.id));
        s.state = 'leaving';
      }
    }
  } else if (moveShipper(s, layout.shipperSpawn.x, layout.shipperSpawn.z, cfg.speed, dt)) {
    shop.shipper = null;
  }
  return events;
}
