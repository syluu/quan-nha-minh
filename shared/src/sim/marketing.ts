import { BALANCE, INGREDIENTS, isFarm } from '../content';
import type { IngredientId, ShopId } from '../content';
import { formatK } from '../money';
import type { ActionResult } from './actions';
import { addLog, playerName } from './log';
import { stars } from './rating';
import { trySettleAfterAction } from './settlement';
import type { AdId, CampaignId, ShopState, WorldState } from './world';

const isCampaign = (id: unknown): id is CampaignId => typeof id === 'string' && Object.hasOwn(BALANCE.CAMPAIGNS, id);
const isAd = (id: unknown): id is AdId => typeof id === 'string' && Object.hasOwn(BALANCE.ADS, id);

/** Chạy một chiến dịch quảng cáo cho quán: trả tiền ngay; đang chạy chiến dịch đó thì gia hạn thêm ngày. */
export function runCampaign(world: WorldState, shopId: ShopId, id: unknown, byPlayerId: string): ActionResult {
  if (world.settlement) return { ok: false, error: 'PAUSED' };
  if (!isCampaign(id) || isFarm(shopId)) return { ok: false, error: 'BAD_ITEM' };
  const c = BALANCE.CAMPAIGNS[id];
  if (world.money < c.cost) return { ok: false, error: 'NO_MONEY' };
  world.money -= c.cost;
  world.dayStats.marketing += c.cost;
  const shop = world.shops[shopId];
  const running = shop.campaigns.find((x) => x.id === id);
  if (running) running.daysLeft += c.days;
  else shop.campaigns.push({ id, daysLeft: c.days });
  addLog(world, `${playerName(world, byPlayerId)} ${running ? 'gia hạn' : 'chạy'} quảng cáo: ${c.name} (${formatK(c.cost)})`);
  return { ok: true };
}

/** Mua quảng cáo lâu dài (biển LED, đèn lồng…) cho quán: một lần, tác dụng mãi. */
export function buyAd(world: WorldState, shopId: ShopId, id: unknown, byPlayerId: string): ActionResult {
  if (world.settlement) return { ok: false, error: 'PAUSED' };
  if (!isAd(id) || isFarm(shopId)) return { ok: false, error: 'BAD_ITEM' };
  const shop = world.shops[shopId];
  if (shop.ads.includes(id)) return { ok: false, error: 'NO_SLOT' };
  const a = BALANCE.ADS[id];
  if (world.money < a.cost) return { ok: false, error: 'NO_MONEY' };
  world.money -= a.cost;
  world.dayStats.marketing += a.cost;
  shop.ads.push(id);
  addLog(world, `${playerName(world, byPlayerId)} lắp ${a.name} (${formatK(a.cost)})`);
  return { ok: true };
}

/** Chiến dịch: mạnh nhất tính đủ, cái thứ hai một nửa, thứ ba một phần tư… */
function diminishing(boosts: number[]): number {
  return boosts
    .filter((b) => b > 0)
    .sort((a, b) => b - a)
    .reduce((sum, b, i) => sum + b * Math.pow(0.5, i), 0);
}

const adsOf = (shop: Pick<ShopState, 'ads'>) => (shop.ads ?? []).filter((id) => Object.hasOwn(BALANCE.ADS, id));

/** Hệ số lượng khách tại quán: (1 + quảng cáo lâu dài) × (1 + chiến dịch giảm dần). */
export function marketingMultiplier(shop: Pick<ShopState, 'campaigns' | 'ads'>): number {
  const perm = adsOf(shop).reduce((n, id) => n + BALANCE.ADS[id].boost, 0);
  return (1 + perm) * (1 + diminishing(shop.campaigns.map((c) => BALANCE.CAMPAIGNS[c.id]?.boost ?? 0)));
}

/** Hệ số đơn online (app giao đồ ăn). */
export function onlineMarketingMultiplier(shop: Pick<ShopState, 'campaigns' | 'ads'>): number {
  const perm = adsOf(shop).reduce((n, id) => n + BALANCE.ADS[id].onlineBoost, 0);
  return (1 + perm) * (1 + diminishing(shop.campaigns.map((c) => BALANCE.CAMPAIGNS[c.id]?.onlineBoost ?? 0)));
}

/** Sao hiển thị và dùng tính lượng khách: sao thật + thưởng chiến dịch mạnh nhất + thẻ tích điểm (tối đa 5). */
export function effectiveStars(shop: ShopState): number {
  const bonus = Math.max(0, ...shop.campaigns.map((c) => BALANCE.CAMPAIGNS[c.id]?.starBonus ?? 0));
  const perm = adsOf(shop).reduce((n, id) => n + BALANCE.ADS[id].starBonus, 0);
  return Math.min(5, Math.round((stars(shop.ratings) + bonus + perm) * 10) / 10);
}

/** Cuối ngày: giảm số ngày còn lại, bỏ chiến dịch đã hết. */
export function tickCampaignsDaily(world: WorldState): void {
  for (const id of Object.keys(world.shops) as ShopId[]) {
    const shop = world.shops[id];
    for (const c of shop.campaigns) c.daysLeft -= 1;
    shop.campaigns = shop.campaigns.filter((c) => c.daysLeft > 0);
  }
}

/** Giá bán 1 đơn vị nguyên liệu trong kho ra chợ (bằng giá chợ). */
export function warehouseSellPrice(id: IngredientId): number {
  return Math.round(INGREDIENTS[id].marketPrice * BALANCE.WAREHOUSE_SELL_RATIO);
}

/** Bán nguyên liệu dư trong kho tổng ra chợ: qty = số lượng hoặc 'all'. Bán được cả lúc kết toán (để có tiền trả). */
export function sellWarehouse(world: WorldState, ingredient: unknown, qty: unknown, byPlayerId: string): ActionResult {
  if (typeof ingredient !== 'string' || !Object.hasOwn(INGREDIENTS, ingredient)) return { ok: false, error: 'BAD_ITEM' };
  const id = ingredient as IngredientId;
  const have = world.warehouse[id] ?? 0;
  const n = qty === 'all' ? have : typeof qty === 'number' && Number.isInteger(qty) && qty > 0 ? Math.min(qty, have) : 0;
  if (qty !== 'all' && (typeof qty !== 'number' || !Number.isInteger(qty) || qty <= 0)) return { ok: false, error: 'BAD_AMOUNT' };
  if (n <= 0) return { ok: false, error: 'NOT_FOUND' };
  const amount = n * warehouseSellPrice(id);
  world.warehouse[id] = have - n;
  world.money += amount;
  world.dayStats.revenue += amount;
  addLog(world, `${playerName(world, byPlayerId)} bán ${n} ${INGREDIENTS[id].name.toLowerCase()} ra chợ, thu ${formatK(amount)}`);
  trySettleAfterAction(world);
  return { ok: true };
}
