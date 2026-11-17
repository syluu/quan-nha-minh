import { BALANCE } from '../content';
import type { ShopId } from '../content';
import { stars } from './rating';
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

/** Tiến thời gian; hết ngày thì trả bảng tổng kết và sang ngày mới. */
export function advanceTime(world: WorldState, dt: number): DaySummary | null {
  world.secOfDay += dt;
  if (world.secOfDay < BALANCE.DAY_REAL_SEC) return null;

  const s = world.dayStats;
  const summary: DaySummary = {
    ...s,
    day: world.day,
    operatingProfit: s.revenue - s.ingredientCost,
    stars: stars(world.shops.banh_mi.ratings),
  };
  world.day += 1;
  world.secOfDay = 0;
  world.dayStats = emptyDayStats();
  for (const id of Object.keys(world.shops) as ShopId[]) world.shops[id].customers = [];
  return summary;
}
