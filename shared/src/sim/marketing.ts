import { BALANCE, isFarm } from '../content';
import type { ShopId } from '../content';
import { formatK } from '../money';
import type { ActionResult } from './actions';
import { addLog, playerName } from './log';
import { stars } from './rating';
import type { CampaignId, ShopState, WorldState } from './world';

const isCampaign = (id: unknown): id is CampaignId => typeof id === 'string' && Object.hasOwn(BALANCE.CAMPAIGNS, id);

/** Chạy một chiến dịch quảng cáo cho quán: trả tiền ngay, có hiệu lực trong số ngày của chiến dịch. */
export function runCampaign(world: WorldState, shopId: ShopId, id: unknown, byPlayerId: string): ActionResult {
  if (world.settlement) return { ok: false, error: 'PAUSED' };
  if (!isCampaign(id) || isFarm(shopId)) return { ok: false, error: 'BAD_ITEM' };
  const c = BALANCE.CAMPAIGNS[id];
  if (world.money < c.cost) return { ok: false, error: 'NO_MONEY' };
  world.money -= c.cost;
  world.dayStats.marketing += c.cost;
  world.shops[shopId].campaigns.push({ id, daysLeft: c.days });
  addLog(world, `${playerName(world, byPlayerId)} chạy quảng cáo: ${c.name} (${formatK(c.cost)})`);
  return { ok: true };
}

/** Hệ số lượng khách: mạnh nhất tính đủ, cái thứ hai một nửa, thứ ba một phần tư… */
export function marketingMultiplier(shop: ShopState): number {
  const boosts = shop.campaigns.map((c) => BALANCE.CAMPAIGNS[c.id].boost).sort((a, b) => b - a);
  return 1 + boosts.reduce((sum, b, i) => sum + b * Math.pow(0.5, i), 0);
}

/** Sao hiển thị và dùng tính lượng khách: sao thật + thưởng của người review (tối đa 5). */
export function effectiveStars(shop: ShopState): number {
  const bonus = Math.max(0, ...shop.campaigns.map((c) => BALANCE.CAMPAIGNS[c.id].starBonus));
  return Math.min(5, Math.round((stars(shop.ratings) + bonus) * 10) / 10);
}

/** Cuối ngày: giảm số ngày còn lại, bỏ chiến dịch đã hết. */
export function tickCampaignsDaily(world: WorldState): void {
  for (const id of Object.keys(world.shops) as ShopId[]) {
    const shop = world.shops[id];
    for (const c of shop.campaigns) c.daysLeft -= 1;
    shop.campaigns = shop.campaigns.filter((c) => c.daysLeft > 0);
  }
}
