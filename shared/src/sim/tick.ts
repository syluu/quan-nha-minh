import { BALANCE, SHOPS, getPlaced, getStationDef } from '../content';
import type { ShopId } from '../content';
import { tickCarry } from './carry';
import { tickCustomers } from './customers';
import type { SimEvent } from './events';
import { movePlayer } from './movement';
import { tickPayTiles } from './payTiles';
import { tickStations } from './production';
import { advanceTime, formatClock } from './time';
import type { WorldState } from './world';

const LOG_MAX = 30;

function addLog(world: WorldState, text: string): void {
  world.log.push({ day: world.day, clock: formatClock(world.secOfDay), text });
  while (world.log.length > LOG_MAX) world.log.shift();
}

/** Một bước mô phỏng. Không ai online → không làm gì (thời gian dừng). */
export function tick(world: WorldState, dt: number): SimEvent[] {
  const online = Object.values(world.players).filter((p) => p.online);
  if (online.length === 0) return [];

  const total = Math.min(Math.max(dt, 0), BALANCE.MAX_TICK_DT);
  const steps = Math.max(1, Math.ceil(total / BALANCE.SUBSTEP_DT - 1e-9));
  const sdt = total / steps;
  const events: SimEvent[] = [];
  const shopIds = Object.keys(world.shops) as ShopId[];

  for (let i = 0; i < steps; i++) {
    for (const shopId of shopIds) {
      const shop = world.shops[shopId];
      const layout = SHOPS[shopId];
      for (const p of online) {
        const next = movePlayer(p, p.input, p.speed, sdt, layout, (id) => shop.stations[id].unlocked);
        p.x = next.x;
        p.z = next.z;
        p.dir = next.dir;
      }
      tickCarry(world, shopId, sdt);
      for (const e of tickPayTiles(world, shopId, sdt)) {
        if (e.type === 'unlock') {
          const name = world.players[e.byPlayerId]?.name ?? 'Ai đó';
          addLog(world, `${name} đã mở ${getStationDef(getPlaced(e.shopId, e.instanceId).def).name}`);
        }
        events.push(e);
      }
      tickStations(world, shopId, sdt);
      events.push(...tickCustomers(world, shopId, sdt));
    }
    const summary = advanceTime(world, sdt);
    if (summary) events.push({ type: 'dayEnd', summary });
  }
  return events;
}
