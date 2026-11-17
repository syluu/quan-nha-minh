import { BALANCE, SHOPS, getStationDef } from '../content';
import type { PlacedStation, ShopId } from '../content';
import { chooseWants, hourMultiplier, priceOf, trafficMultiplier } from './customers';
import { effectiveStars, marketingMultiplier } from './marketing';
import { gameHour } from './time';
import type { Order, WorldState } from './world';
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
