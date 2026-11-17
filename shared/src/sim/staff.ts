import { BALANCE } from '../content';
import type { ShopId } from '../content';
import { addLog } from './log';
import type { WorldState } from './world';

/**
 * Trả lương cuối ngày. Người bị cho nghỉ hôm nay vẫn được trả trước (nếu đủ tiền);
 * nhân viên đang làm được trả theo thứ tự thuê, ai không trả được thì nghỉ việc. Tiền không bao giờ âm.
 */
export function payWages(world: WorldState): { paid: number; quitNames: string[] } {
  let paid = 0;
  const quitNames: string[] = [];
  for (const id of Object.keys(world.shops) as ShopId[]) {
    const shop = world.shops[id];
    for (let i = 0; i < shop.firedToday; i++) {
      if (world.money < BALANCE.WAGE) break;
      world.money -= BALANCE.WAGE;
      paid += BALANCE.WAGE;
    }
    shop.firedToday = 0;
    shop.staff = shop.staff.filter((s) => {
      if (world.money >= BALANCE.WAGE) {
        world.money -= BALANCE.WAGE;
        paid += BALANCE.WAGE;
        return true;
      }
      quitNames.push(s.name);
      addLog(world, `${s.name} nghỉ việc vì không được trả lương`);
      return false;
    });
  }
  world.dayStats.wages += paid;
  return { paid, quitNames };
}
