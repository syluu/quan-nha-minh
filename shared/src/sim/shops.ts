import { BALANCE, ITEMS, SHOP_IDS, SHOP_META, SHOPS, getStationDef, isFarm, itemCost } from '../content';
import { loadCrate } from './carry';
import type { ShopId } from '../content';
import { formatK } from '../money';
import type { ActionResult } from './actions';
import { shopAssetValue } from './bank';
import { addLog, playerName } from './log';
import { settlementMismatch, trySettleAfterAction } from './settlement';
import { createShop } from './world';
import type { WorldState } from './world';

export const RETURN_SHOP_ID = 'mat_bang';

function isShopId(x: unknown): x is ShopId {
  return typeof x === 'string' && (SHOP_IDS as string[]).includes(x);
}

/** Đã mở hết máy và kệ (bàn ăn, điểm giao không bắt buộc). */
export function isShopComplete(world: WorldState, shopId: ShopId): boolean {
  const shop = world.shops[shopId];
  return SHOPS[shopId].stations.every((p) => {
    if (p.farmExpansion) return true; // đất mở rộng không bắt buộc
    const kind = getStationDef(p.def).kind;
    if (kind !== 'producer' && kind !== 'assembler' && kind !== 'display' && kind !== 'plot') return true;
    return shop.stations[p.instanceId].unlocked;
  });
}

/** Được thuê mặt bằng quán mới khi mọi quán đang có đã mở hết (trang trại không tính). */
export function canRent(world: WorldState): boolean {
  return SHOP_IDS.filter((id) => world.shops[id].owned && !isFarm(id)).every((id) => isShopComplete(world, id));
}

export function rentShop(world: WorldState, shopId: unknown, byPlayerId: string): ActionResult {
  if (world.settlement) return { ok: false, error: 'PAUSED' };
  if (!isShopId(shopId) || SHOP_META[shopId].deposit <= 0) return { ok: false, error: 'BAD_ITEM' };
  if (world.shops[shopId].owned) return { ok: false, error: 'NO_SLOT' };
  // Trang trại thuê được bất cứ lúc nào (đủ tiền); quán mới cần mở hết các quán đang có.
  if (!isFarm(shopId) && !canRent(world)) return { ok: false, error: 'NOT_READY' };
  const deposit = SHOP_META[shopId].deposit;
  if (world.money < deposit) return { ok: false, error: 'NO_MONEY' };
  world.money -= deposit;
  world.dayStats.unlockSpend += deposit;
  const shop = createShop(shopId, true);
  shop.rentedDay = world.day;
  world.shops[shopId] = shop;
  addLog(world, `${playerName(world, byPlayerId)} đã thuê mặt bằng mở ${SHOP_META[shopId].name} (cọc ${formatK(deposit)})`);
  travel(world, byPlayerId, shopId);
  return { ok: true };
}

/** Đi tới một quán đang có: xuất hiện ở lối vào, đồ đang cầm mang theo. */
export function travel(world: WorldState, playerId: string, to: unknown): ActionResult {
  const p = world.players[playerId];
  if (!p) return { ok: false, error: 'NOT_FOUND' };
  if (!isShopId(to) || !world.shops[to].owned) return { ok: false, error: 'NOT_FOUND' };
  if (p.location === to) return { ok: true };
  const from = world.shops[p.location];
  if (from) for (const st of Object.values(from.stations)) if (st.tileOccupant?.playerId === playerId) st.tileOccupant = null;
  const e = SHOPS[to].entrance;
  Object.assign(p, { location: to, x: e.x, z: e.z, dir: Math.PI, pickTimer: 0, pickAt: null });
  return { ok: true };
}

/** Thu về khi trả mặt bằng: 50% cọc + 50% giá trị máy và nâng cấp. */
export function returnRefund(world: WorldState, shopId: ShopId): number {
  return Math.round(BALANCE.SELL_RATIO * shopAssetValue(world, shopId));
}

export function canReturn(world: WorldState, shopId: ShopId): boolean {
  return world.shops[shopId].owned && SHOP_META[shopId].deposit > 0;
}

/**
 * Trả mặt bằng (khi kết toán thiếu tiền): nhân viên nghỉ (lương còn nợ vẫn vào kết toán),
 * người đang đứng ở đó về xe bánh mì.
 */
export function returnShop(world: WorldState, shopId: unknown, byPlayerId: string, forMonth?: unknown): ActionResult {
  // Chỉ trả mặt bằng trong bảng kết toán (tiền thuê tháng này đã tính xong).
  if (!world.settlement || settlementMismatch(world, forMonth)) return { ok: false, error: 'NO_SETTLEMENT' };
  if (!isShopId(shopId) || !canReturn(world, shopId)) return { ok: false, error: 'NOT_SELLABLE' };
  const refund = returnRefund(world, shopId);
  const old = world.shops[shopId];
  world.extraWagesOwed += old.staff.reduce((n, s) => n + s.wageOwed, 0);
  // Thùng hàng người làm trang trại đang cầm: bốc vào kho; món khác coi như bỏ đi.
  for (const s of old.staff)
    for (const it of s.carry) {
      if (ITEMS[it].bundle) loadCrate(world, it);
      else world.dayStats.wasted += itemCost(it);
    }
  world.shops[shopId] = createShop(shopId, false);
  for (const p of Object.values(world.players)) {
    if (p.location !== shopId) continue;
    const e = SHOPS.banh_mi.entrance;
    Object.assign(p, { location: 'banh_mi', x: e.x, z: e.z, pickTimer: 0, pickAt: null });
  }
  world.money += refund;
  addLog(world, `${playerName(world, byPlayerId)} đã trả mặt bằng ${SHOP_META[shopId].name}, thu ${formatK(refund)}`);
  trySettleAfterAction(world);
  return { ok: true };
}
