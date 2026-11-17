import { BALANCE } from '../content';
import type { Report } from '../net/protocol';
import { averageStars } from './rating';
import { staffWage } from './staff';
import type { WorldState } from './world';

/** Báo cáo cho menu: các ngày đã qua + "hôm nay" đang chạy (lương tính theo số nhân viên hiện có). */
export function buildReport(world: WorldState): Report {
  const s = world.dayStats;
  const wages = Object.values(world.shops).reduce(
    (n, shop) => n + shop.staff.reduce((m, s) => m + staffWage(s), 0),
    0,
  );
  return {
    history: world.history.map((h) => ({ ...h, sold: { ...h.sold } })),
    months: world.months.map((m) => ({ ...m })),
    today: {
      ...s,
      sold: { ...s.sold },
      wages,
      day: world.day,
      operatingProfit: s.revenue - s.ingredientCost - wages - s.commission,
      stars: averageStars(world),
    },
  };
}
