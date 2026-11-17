import { BALANCE, SHOPS, getStationDef } from '../content';
import type { PlacedStation, ShopId } from '../content';
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

function takeFromCarry(p: PlayerState, accepts: (item: string) => boolean): string | null {
  for (let i = p.carry.length - 1; i >= 0; i--) {
    if (accepts(p.carry[i])) return p.carry.splice(i, 1)[0];
  }
  return null;
}

/** Tự động bê: đứng gần trạm thì ưu tiên đặt món phù hợp, không đặt được thì nhặt món ở đầu ra. */
export function tickCarry(world: WorldState, shopId: ShopId, dt: number): void {
  const shop = world.shops[shopId];
  for (const p of Object.values(world.players)) {
    if (!p.online) continue;
    p.transferCd = Math.max(p.transferCd - dt, 0);
    if (p.transferCd > 0) continue;

    const placed = nearestStation(shop, shopId, p.x, p.z, BALANCE.INTERACT_DIST);
    if (!placed) continue;
    const def = getStationDef(placed.def);
    const st = shop.stations[placed.instanceId];
    let moved = false;

    if (def.kind === 'display' && st.stock < def.cap) {
      if (takeFromCarry(p, (it) => it === def.item)) {
        st.stock += 1;
        moved = true;
      }
    } else if (def.kind === 'assembler') {
      const item = takeFromCarry(p, (it) =>
        def.inputs.some((inp) => inp.item === it && (st.inputs[inp.item] ?? 0) < def.inputCap),
      ) as keyof typeof st.inputs | null;
      if (item) {
        st.inputs[item] = (st.inputs[item] ?? 0) + 1;
        moved = true;
      }
    }

    if (!moved && (def.kind === 'producer' || def.kind === 'assembler') && st.outputCount > 0 && p.carry.length < p.carryCap) {
      st.outputCount -= 1;
      p.carry.push(def.output);
      moved = true;
    }

    if (moved) p.transferCd = BALANCE.TRANSFER_INTERVAL;
  }
}
