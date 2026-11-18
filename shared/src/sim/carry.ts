import { BALANCE, ITEMS, SHOPS, getStationDef, itemCost } from '../content';
import type { ItemId, PlacedStation, ShopId } from '../content';
import type { SimEvent } from './events';
import { deliverToPickup, pickupNeeds } from './online';
import { plotDef } from './farm';
import { credit } from './fun';
import type { PlayerState, ShopState, WorldState } from './world';

/** Khoảng cách từ điểm (x,z) tới cạnh footprint của trạm (0 nếu ở trong). */
export function distanceToFootprint(placed: PlacedStation, x: number, z: number): number {
  const fp = getStationDef(placed.def).footprint;
  const dx = Math.max(Math.abs(x - placed.x) - fp.w / 2, 0);
  const dz = Math.max(Math.abs(z - placed.z) - fp.d / 2, 0);
  return Math.hypot(dx, dz);
}

/** Trạm đã mở gần nhất trong phạm vi maxDist (tính tới cạnh footprint). */
export function nearestStation(shop: ShopState, shopId: ShopId, x: number, z: number, maxDist: number): PlacedStation | null {
  let best: PlacedStation | null = null;
  let bestD = Infinity;
  for (const placed of SHOPS[shopId].stations) {
    if (!shop.stations[placed.instanceId].unlocked) continue;
    const d = distanceToFootprint(placed, x, z);
    if (d <= maxDist && d < bestD) {
      best = placed;
      bestD = d;
    }
  }
  return best;
}

/** Đổ một thùng hàng vào kho tổng. */
export function loadCrate(world: WorldState, crate: ItemId): void {
  for (const b of ITEMS[crate].bundle ?? []) world.warehouse[b.id] = (world.warehouse[b.id] ?? 0) + b.qty;
}

function takeFromCarry(p: PlayerState, accepts: (item: ItemId) => boolean): ItemId | null {
  for (let i = p.carry.length - 1; i >= 0; i--) {
    if (accepts(p.carry[i])) return p.carry.splice(i, 1)[0];
  }
  return null;
}

/**
 * Tự động bê khi đứng gần trạm:
 * 1) đặt món phù hợp (kệ/bàn ghép) mỗi DROP_INTERVAL;
 * 2) đứng yên cạnh thùng rác → bỏ món trên cùng mỗi DROP_INTERVAL;
 * 3) nhặt từ đầu ra của máy mỗi PICK_INTERVAL (bước ra là dừng).
 */
export function tickCarry(world: WorldState, shopId: ShopId, dt: number): SimEvent[] {
  const events: SimEvent[] = [];
  const shop = world.shops[shopId];
  for (const p of Object.values(world.players)) {
    if (!p.online || p.location !== shopId) continue;
    p.dropCd = Math.max(p.dropCd - dt, 0);

    const placed = nearestStation(shop, shopId, p.x, p.z, BALANCE.INTERACT_DIST);
    if (!placed) {
      p.pickTimer = 0;
      p.pickAt = null;
      continue;
    }
    const def = getStationDef(placed.def);
    const st = shop.stations[placed.instanceId];

    // 1) Đặt
    let canDrop = false;
    if (def.kind === 'display') canDrop = st.stock < def.cap && p.carry.includes(def.item);
    else if (def.kind === 'assembler')
      canDrop = p.carry.some((it) => def.inputs.some((inp) => inp.item === it && (st.inputs[it] ?? 0) < def.inputCap));
    if (canDrop) {
      p.pickTimer = 0;
      p.pickAt = null;
      if (p.dropCd > 0) continue;
      credit(world, p.id, 'placed');
      if (def.kind === 'display') {
        takeFromCarry(p, (it) => it === def.item);
        st.stock += 1;
      } else if (def.kind === 'assembler') {
        const item = takeFromCarry(p, (it) =>
          def.inputs.some((inp) => inp.item === it && (st.inputs[it] ?? 0) < def.inputCap),
        )!;
        st.inputs[item] = (st.inputs[item] ?? 0) + 1;
      }
      p.dropCd = BALANCE.DROP_INTERVAL;
      continue;
    }

    // 1b) Điểm giao hàng: đưa món shipper đang cần
    if (def.kind === 'pickup') {
      p.pickTimer = 0;
      p.pickAt = null;
      const needs = pickupNeeds(shop);
      const has = p.carry.some((it) => needs.includes(it));
      if (!has || p.dropCd > 0) continue;
      const item = takeFromCarry(p, (it) => needs.includes(it))!;
      credit(world, p.id, 'placed');
      events.push(...deliverToPickup(world, shopId, item));
      p.dropCd = BALANCE.DROP_INTERVAL;
      continue;
    }

    // 1d) Xe chở hàng: bốc thùng hàng → nguyên liệu vào kho tổng
    if (def.kind === 'truck') {
      p.pickTimer = 0;
      p.pickAt = null;
      if (p.dropCd > 0) continue;
      const crate = takeFromCarry(p, (it) => !!ITEMS[it].bundle);
      if (!crate) continue;
      loadCrate(world, crate);
      credit(world, p.id, 'crates');
      events.push({ type: 'stored', shopId, item: crate, x: placed.x, z: placed.z });
      p.dropCd = BALANCE.DROP_INTERVAL;
      continue;
    }

    // 1c) Bàn ăn: đứng yên cạnh bàn bẩn → dọn 1 chỗ mỗi CLEAN_SEC
    if (def.kind === 'table') {
      const still = Math.hypot(p.input.mx, p.input.mz) <= BALANCE.STILL_INPUT;
      const dirty = st.seats.indexOf('dirty');
      if (!still || p.inMenu || dirty < 0) {
        p.pickTimer = 0;
        p.pickAt = null;
        continue;
      }
      if (p.pickAt !== placed.instanceId) p.pickTimer = 0;
      p.pickAt = placed.instanceId;
      p.pickTimer += dt;
      if (p.pickTimer >= BALANCE.CLEAN_SEC - 1e-6) {
        p.pickTimer = 0;
        st.seats[dirty] = 'free';
        world.dayStats.cleaned += 1;
        credit(world, p.id, 'cleaned');
        events.push({ type: 'clean', shopId, instanceId: placed.instanceId, x: placed.x, z: placed.z });
      }
      continue;
    }

    // 2) Thùng rác (chỉ khi đứng yên)
    if (def.kind === 'trash') {
      p.pickTimer = 0;
      p.pickAt = null;
      const still = Math.hypot(p.input.mx, p.input.mz) <= BALANCE.STILL_INPUT;
      if (!still || p.inMenu || p.dropCd > 0 || p.carry.length === 0) continue;
      const item = p.carry.pop()!;
      const value = itemCost(item);
      world.dayStats.wasted += value;
      events.push({ type: 'trash', shopId, playerId: p.id, item, value, x: p.x, z: p.z });
      p.dropCd = BALANCE.DROP_INTERVAL;
      continue;
    }

    // 3) Nhặt dần
    if ((def.kind === 'producer' || def.kind === 'assembler' || def.kind === 'plot') && st.outputCount > 0 && p.carry.length < p.carryCap) {
      if (p.pickAt !== placed.instanceId) p.pickTimer = 0;
      p.pickAt = placed.instanceId;
      p.pickTimer += dt;
      if (p.pickTimer >= BALANCE.PICK_INTERVAL - 1e-6) {
        p.pickTimer -= BALANCE.PICK_INTERVAL;
        if (p.pickTimer < 1e-6) p.pickTimer = 0;
        st.outputCount -= 1;
        // Lô trang trại: thùng theo giống đang trồng (lô có thể đã đổi giống).
        const out = def.kind === 'plot' ? plotDef(shop, placed)?.output ?? def.output : def.output;
        p.carry.push(out);
      }
    } else {
      p.pickTimer = 0;
      p.pickAt = null;
    }
  }
  return events;
}
