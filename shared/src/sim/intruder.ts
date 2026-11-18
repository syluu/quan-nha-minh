import { BALANCE, LIFE, SHOP_IDS, SHOP_META, SHOPS, getStationDef, itemCost } from '../content';
import type { ItemId, ShopId } from '../content';
import { formatK } from '../money';
import { priceOf } from './customers';
import type { SimEvent } from './events';
import { addLog } from './log';
import { gameHour } from './time';
import type { Intruder, IntruderKind, WorldState } from './world';
import { nextRandom } from './world';

export const INTRUDER_NAME: Record<IntruderKind, string> = { thief: '🦹 Tên trộm', drunk: '🥴 Người say xỉn' };
const ARRIVE = 0.05;

/** Đầu ngày: hôm nay có trộm / người say ghé không, lúc nào. */
export function planIntruder(world: WorldState): void {
  world.intruderAt = null;
  if (world.day < LIFE.INTRUDER_FROM_DAY || nextRandom(world) >= LIFE.INTRUDER_CHANCE) return;
  world.intruderAt = Math.round(40 + nextRandom(world) * 260);
  world.intruderKind = nextRandom(world) < 0.5 ? 'thief' : 'drunk';
}

/** Đưa thẳng một tên trộm / người say vào quán (cửa vào). */
export function spawnIntruder(world: WorldState, shopId: ShopId, kind: IntruderKind): Intruder {
  const e = SHOPS[shopId].entrance;
  const it: Intruder = { kind, x: e.x, z: e.z, dir: 0, state: 'toShelf', target: null, stolen: [], value: 0, grabbedHere: 0, timer: 0, life: 0 };
  world.shops[shopId].intruder = it;
  return it;
}

function shelvesOf(world: WorldState, shopId: ShopId) {
  return SHOPS[shopId].stations.filter((p) => getStationDef(p.def).kind === 'display' && world.shops[shopId].stations[p.instanceId].unlocked);
}

/** Kệ tiếp theo: ưu tiên kệ còn món (khác kệ vừa lấy); hết món cả quán thì null. */
function pickShelf(world: WorldState, shopId: ShopId, exclude: string | null): string | null {
  const shop = world.shops[shopId];
  const full = shelvesOf(world, shopId).filter((p) => shop.stations[p.instanceId].stock > 0);
  const others = full.filter((p) => p.instanceId !== exclude);
  const pool = others.length ? others : full;
  if (!pool.length) return null;
  return pool[Math.floor(nextRandom(world) * pool.length)].instanceId;
}

function walk(it: Intruder, tx: number, tz: number, speed: number, dt: number): boolean {
  const dx = tx - it.x;
  const dz = tz - it.z;
  const d = Math.hypot(dx, dz);
  if (d <= ARRIVE) {
    it.x = tx;
    it.z = tz;
    return true;
  }
  const step = Math.min(d, speed * dt);
  it.x += (dx / d) * step;
  it.z += (dz / d) * step;
  it.dir = Math.atan2(dx, dz);
  return d - step <= ARRIVE;
}

/** Người chơi đang ở quán chạm vào → bắt được: trả lại tiền các món đã lấy (món thì mất), rồi đuổi ra. */
function tryCatch(world: WorldState, shopId: ShopId, it: Intruder): SimEvent[] {
  for (const p of Object.values(world.players)) {
    if (!p.online || p.location !== shopId) continue;
    if (Math.hypot(p.x - it.x, p.z - it.z) > LIFE.CATCH_DIST) continue;
    const refund = it.value;
    const items = it.stolen.length;
    world.money += refund;
    world.lifetime.caught = (world.lifetime.caught ?? 0) + 1;
    for (const item of it.stolen) world.dayStats.wasted += itemCost(item);
    it.state = 'caught';
    it.stolen = [];
    it.value = 0;
    addLog(world, `👮 ${p.name} bắt được ${INTRUDER_NAME[it.kind].toLowerCase()}${items ? ` — đòi lại ${formatK(refund)} (${items} món đã hỏng)` : ' trước khi kịp lấy gì'}!`);
    return [{ type: 'intruderCaught', shopId, kind: it.kind, by: p.name, refund, items, x: it.x, z: it.z }];
  }
  return [];
}

function tickOne(world: WorldState, shopId: ShopId, dt: number): SimEvent[] {
  const shop = world.shops[shopId];
  const it = shop.intruder!;
  const layout = SHOPS[shopId];
  const speed = it.kind === 'thief' ? LIFE.THIEF_SPEED : LIFE.DRUNK_SPEED;
  const events: SimEvent[] = [];
  it.life += dt;
  if (it.state !== 'caught') events.push(...tryCatch(world, shopId, it));
  if ((it.state === 'toShelf' || it.state === 'grabbing') && it.life > LIFE.INTRUDER_MAX_SEC) it.state = 'leaving';

  switch (it.state) {
    case 'toShelf': {
      it.target ??= pickShelf(world, shopId, null);
      const shelf = it.target ? layout.stations.find((p) => p.instanceId === it.target) : null;
      if (!shelf?.customerPoint) {
        it.state = 'leaving';
        break;
      }
      if (walk(it, shelf.customerPoint.x, shelf.customerPoint.z, speed, dt)) {
        it.state = 'grabbing';
        it.timer = 0;
        it.grabbedHere = 0;
      }
      break;
    }
    case 'grabbing': {
      const st = shop.stations[it.target!];
      if (!st || st.stock <= 0 || it.grabbedHere >= LIFE.INTRUDER_PER_SHELF) {
        it.target = pickShelf(world, shopId, it.target);
        it.state = it.target ? 'toShelf' : 'leaving';
        break;
      }
      it.timer += dt;
      if (it.timer < LIFE.INTRUDER_GRAB_SEC - 1e-6) break;
      it.timer = 0;
      const def = getStationDef(layout.stations.find((p) => p.instanceId === it.target)!.def);
      if (def.kind !== 'display') break;
      st.stock -= 1;
      it.stolen.push(def.item);
      it.value += priceOf(shop, def.item);
      it.grabbedHere += 1;
      if (it.stolen.length >= LIFE.INTRUDER_MAX_ITEMS) it.state = 'leaving';
      break;
    }
    case 'leaving':
    case 'caught': {
      if (!walk(it, layout.exit.x, layout.exit.z, it.state === 'caught' ? speed * 1.3 : speed, dt)) break;
      shop.intruder = null;
      if (it.state === 'leaving' && it.stolen.length) {
        for (const item of it.stolen) world.dayStats.wasted += itemCost(item);
        addLog(world, `${INTRUDER_NAME[it.kind]} ${it.kind === 'thief' ? 'chuồn mất' : 'loạng choạng bỏ đi'} với ${it.stolen.length} món (mất ${formatK(it.value)})`);
        events.push({ type: 'intruderEscaped', shopId, kind: it.kind, value: it.value, items: it.stolen.length, x: it.x, z: it.z });
      }
      break;
    }
  }
  return events;
}

/** Mỗi bước: tới giờ thì trộm / người say vào một quán đang có người chơi; trộm trong các quán đi lấy món. */
export function tickIntruders(world: WorldState, dt: number): SimEvent[] {
  const events: SimEvent[] = [];
  if (world.intruderAt != null && world.secOfDay >= world.intruderAt && gameHour(world.secOfDay) < BALANCE.LAST_SPAWN_HOUR) {
    // Chỉ vào quán đang có người chơi đứng (để còn kịp bắt).
    const here = [...new Set(Object.values(world.players).filter((p) => p.online).map((p) => p.location))].filter(
      (id) => SHOP_META[id].kind === 'shop' && world.shops[id].owned && !world.shops[id].intruder && shelvesOf(world, id).length,
    );
    if (here.length) {
      const shopId = here[Math.floor(nextRandom(world) * here.length)];
      const kind = world.intruderKind ?? 'thief';
      spawnIntruder(world, shopId, kind);
      world.intruderAt = null;
      addLog(world, `🚨 ${INTRUDER_NAME[kind]} vừa lẻn vào ${SHOP_META[shopId].name}! Chạy tới chạm vào để bắt`);
      events.push({ type: 'intruder', shopId, kind });
    }
  }
  for (const id of SHOP_IDS) if (world.shops[id].intruder) events.push(...tickOne(world, id, dt));
  return events;
}

/** Ảnh chụp cho máy khách. */
export function intruderSnapshot(world: WorldState, shopId: ShopId) {
  const it = world.shops[shopId].intruder;
  if (!it) return null;
  return { kind: it.kind, x: it.x, z: it.z, dir: it.dir, state: it.state, stolen: [...it.stolen] as ItemId[], value: it.value, name: INTRUDER_NAME[it.kind] };
}
