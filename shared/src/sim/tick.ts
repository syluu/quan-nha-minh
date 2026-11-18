import { BALANCE, FUN, SHOPS, getPlaced, getStationDef, isFarm } from '../content';
import { checkBadges, checkQuests, startDay, tickCat, tickPlayersFun, tickTour } from './fun';
import type { ShopId } from '../content';
import { tickCarry } from './carry';
import { tickCustomers } from './customers';
import type { SimEvent } from './events';
import { movePlayer } from './movement';
import { tickPayTiles } from './payTiles';
import { tickStations } from './production';
import { addLog } from './log';
import { tickOrders, tickShipper } from './online';
import { trySettle } from './settlement';
import { tickStaff } from './staff';
import { tickParty } from './life';
import { tickIntruders } from './intruder';
import { advanceTime } from './time';
import type { Settlement, WorldState } from './world';

/** Một bước mô phỏng. Không ai online → không làm gì (thời gian dừng). */
export function tick(world: WorldState, dt: number): SimEvent[] {
  const online = Object.values(world.players).filter((p) => p.online);
  if (online.length === 0) return [];
  // Đang kết toán cuối tháng mà thiếu tiền: cả quán dừng chờ (vay / bán máy).
  if (world.settlement) return [];

  const total = Math.min(Math.max(dt, 0), BALANCE.MAX_TICK_DT);
  const steps = Math.max(1, Math.ceil(total / BALANCE.SUBSTEP_DT - 1e-9));
  const sdt = total / steps;
  const events: SimEvent[] = [];
  // Chỉ quán đã thuê mới chạy; quán vẫn chạy khi không ai đứng ở đó (nhân viên làm thay).
  const shopIds = (Object.keys(world.shops) as ShopId[]).filter((id) => world.shops[id].owned);

  for (let i = 0; i < steps; i++) {
    // Đầu ngày: thời tiết, đoàn khách, mèo hoang, nhiệm vụ (một lần mỗi ngày).
    events.push(...startDay(world));
    events.push(...tickPlayersFun(world, sdt));
    for (const p of online) {
      const shop = world.shops[p.location];
      // Vừa đập tay với người nhà: đi nhanh hơn một lúc.
      const speed = p.speed * (p.boost ? FUN.HIFIVE_SPEED : 1);
      const next = movePlayer(p, p.input, speed, sdt, SHOPS[p.location], (id) => shop.stations[id].unlocked);
      p.x = next.x;
      p.z = next.z;
      p.dir = next.dir;
    }
    for (const shopId of shopIds) {
      events.push(...tickCarry(world, shopId, sdt));
      events.push(...tickStaff(world, shopId, sdt));
      const isShop = !isFarm(shopId);
      if (isShop) {
        tickOrders(world, shopId, sdt);
        events.push(...tickShipper(world, shopId, sdt));
        events.push(...tickTour(world, shopId));
        events.push(...tickCat(world, shopId));
      }
      for (const e of tickPayTiles(world, shopId, sdt)) {
        if (e.type === 'unlock') {
          const name = world.players[e.byPlayerId]?.name ?? 'Ai đó';
          addLog(world, `${name} đã mở ${getStationDef(getPlaced(e.shopId, e.instanceId).def).name}`);
        }
        events.push(e);
      }
      tickStations(world, shopId, sdt);
      if (isShop) events.push(...tickCustomers(world, shopId, sdt));
    }
    events.push(...tickParty(world));
    events.push(...tickIntruders(world, sdt));
    events.push(...checkQuests(world));
    events.push(...checkBadges(world));
    const summary = advanceTime(world, sdt);
    if (summary) events.push({ type: 'dayEnd', summary });
    // (đọc lại qua biến: TS đã thu hẹp world.settlement về null ở đầu hàm)
    const opened = world.settlement as Settlement | null;
    if (opened) {
      events.push({ type: 'monthEnd', settlement: { ...opened } });
      events.push(...trySettle(world));
      if (world.settlement as Settlement | null) break;
    }
  }
  return events;
}
