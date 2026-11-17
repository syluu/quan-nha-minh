import { BALANCE } from '../content';
import type { Report } from '../net/protocol';
import { stars } from './rating';
import type { WorldState } from './world';

/** Báo cáo cho menu: các ngày đã qua + "hôm nay" đang chạy (lương tính theo số nhân viên hiện có). */
export function buildReport(world: WorldState): Report {
  const s = world.dayStats;
  const staffCount = Object.values(world.shops).reduce((n, shop) => n + shop.staff.length + shop.firedToday, 0);
  const wages = staffCount * BALANCE.WAGE;
  return {
    history: world.history.map((h) => ({ ...h, sold: { ...h.sold } })),
    today: {
      ...s,
      sold: { ...s.sold },
      wages,
      day: world.day,
      operatingProfit: s.revenue - s.ingredientCost - wages,
      stars: stars(world.shops.banh_mi.ratings),
    },
  };
}
