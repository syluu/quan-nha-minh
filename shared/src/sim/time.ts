import { BALANCE, isFarm } from '../content';
import type { ShopId } from '../content';
import { averageStars } from './rating';
import { buildSettlement } from './settlement';
import { tickCampaignsDaily } from './marketing';
import { accrueWages } from './staff';
import { emptyDayStats } from './world';
import type { DaySummary, WorldState } from './world';

export function gameClock(secOfDay: number): { hour: number; minute: number } {
  const openMinutes = (BALANCE.CLOSE_HOUR - BALANCE.OPEN_HOUR) * 60;
  const total = Math.floor(BALANCE.OPEN_HOUR * 60 + (secOfDay / BALANCE.DAY_REAL_SEC) * openMinutes);
  return { hour: Math.floor(total / 60), minute: total % 60 };
}

/** Giờ trong game dạng số thực (6.5 = 06:30). */
export function gameHour(secOfDay: number): number {
  return BALANCE.OPEN_HOUR + (secOfDay / BALANCE.DAY_REAL_SEC) * (BALANCE.CLOSE_HOUR - BALANCE.OPEN_HOUR);
}

export function formatClock(secOfDay: number): string {
  const { hour, minute } = gameClock(secOfDay);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * Sáng sớm: xe chở hàng từ kho tổng tới mỗi quán (khi có trang trại và kho còn hàng).
 * Không đủ tiền thì trả hết số đang có (không âm ví).
 */
export function chargeDelivery(world: WorldState): number {
  if (!world.shops.farm?.owned) return 0;
  if (!Object.values(world.warehouse).some((n) => (n ?? 0) > 0)) return 0;
  const shops = (Object.keys(world.shops) as ShopId[]).filter((id) => world.shops[id].owned && !isFarm(id)).length;
  const fee = Math.min(world.money, shops * BALANCE.DELIVERY_FEE_PER_SHOP);
  world.money -= fee;
  world.dayStats.ingredientCost += fee;
  return fee;
}

/** Tiến thời gian; hết ngày thì trả bảng tổng kết và sang ngày mới. */
export function advanceTime(world: WorldState, dt: number): DaySummary | null {
  world.secOfDay += dt;
  if (world.secOfDay < BALANCE.DAY_REAL_SEC) return null;

  accrueWages(world);
  tickCampaignsDaily(world);
  const s = world.dayStats;
  const summary: DaySummary = {
    ...s,
    sold: { ...s.sold },
    day: world.day,
    operatingProfit: s.revenue - s.ingredientCost - s.wages - s.commission,
    stars: averageStars(world),
  };
  world.history.push(summary);
  while (world.history.length > BALANCE.HISTORY_DAYS) world.history.shift();
  // Hết tháng (mỗi MONTH_DAYS ngày): mở bảng kết toán; tick sẽ thử trả ngay.
  if (summary.day % BALANCE.MONTH_DAYS === 0) world.settlement = buildSettlement(world);
  world.day += 1;
  world.secOfDay = 0;
  world.dayStats = emptyDayStats();
  chargeDelivery(world);
  for (const id of Object.keys(world.shops) as ShopId[]) {
    const shop = world.shops[id];
    // Đóng cửa: khách đang ăn để lại chỗ bẩn; chỗ giữ cho khách chưa kịp ngồi thì trả lại.
    for (const st of Object.values(shop.stations)) st.seats = st.seats.map((x) => (x === 'taken' ? 'free' : x));
    for (const c of shop.customers) if (c.state === 'eating' && c.table) shop.stations[c.table].seats[c.seat] = 'dirty';
    shop.customers = [];
  }
  return summary;
}
