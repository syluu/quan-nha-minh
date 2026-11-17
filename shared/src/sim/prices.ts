import { ITEMS, SHOPS, getStationDef } from '../content';
import type { ItemId, ShopId } from '../content';
import { formatK } from '../money';
import type { ActionResult } from './actions';
import { priceOf } from './customers';
import { addLog, playerName } from './log';
import type { WorldState } from './world';

const STEP = 500;

export function priceRange(item: ItemId): { min: number; max: number; step: 500; base: number } {
  const base = ITEMS[item].basePrice;
  return { min: Math.ceil((base * 0.5) / STEP) * STEP, max: Math.floor((base * 2) / STEP) * STEP, step: STEP, base };
}

/** Món đang bán ở quán: bán được và có kệ đã mở. */
export function isOnSale(world: WorldState, shopId: ShopId, item: ItemId): boolean {
  if (!ITEMS[item]?.sellable) return false;
  return SHOPS[shopId].stations.some((p) => {
    const def = getStationDef(p.def);
    return def.kind === 'display' && def.item === item && world.shops[shopId].stations[p.instanceId].unlocked;
  });
}

/** Đổi giá bán: kẹp 50–200% giá thị trường, làm tròn 500đ; giá không hợp lệ thì bỏ qua. */
export function setPrice(world: WorldState, shopId: ShopId, item: ItemId, price: unknown, byPlayerId: string): ActionResult {
  if (!isOnSale(world, shopId, item)) return { ok: false, error: 'BAD_ITEM' };
  if (typeof price !== 'number' || !Number.isFinite(price)) return { ok: true };
  const { min, max } = priceRange(item);
  const next = Math.min(max, Math.max(min, Math.round(price / STEP) * STEP));
  const shop = world.shops[shopId];
  const prev = priceOf(shop, item);
  if (next === prev) return { ok: true };
  shop.prices[item] = next;
  addLog(world, `${playerName(world, byPlayerId)} đổi giá ${ITEMS[item].name}: ${formatK(prev)} → ${formatK(next)}`);
  return { ok: true };
}
