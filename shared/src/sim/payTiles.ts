import { BALANCE, SHOPS } from '../content';
import type { PlacedStation, ShopId } from '../content';
import type { SimEvent } from './events';
import type { PlayerState, ShopState, WorldState } from './world';

/** Ô hiện khi trạm chưa mở và mọi trạm yêu cầu đã mở. */
export function isTileVisible(shop: ShopState, placed: PlacedStation): boolean {
  if (shop.stations[placed.instanceId].unlocked) return false;
  return placed.requires.every((r) => shop.stations[r].unlocked);
}

function onTile(p: PlayerState, placed: PlacedStation): boolean {
  return p.online && Math.hypot(p.x - placed.x, p.z - placed.z) <= BALANCE.PAY_TILE_RADIUS;
}

/**
 * Đứng yên trên ô ≥ PAY_TILE_DELAY_SEC mới bắt đầu trừ tiền, trừ dần trong PAY_TILE_DRAIN_SEC.
 * Rời ô / offline → nhả ô, giữ phần đã trả.
 */
export function tickPayTiles(world: WorldState, shopId: ShopId, dt: number): SimEvent[] {
  const events: SimEvent[] = [];
  const shop = world.shops[shopId];
  for (const placed of SHOPS[shopId].stations) {
    const st = shop.stations[placed.instanceId];
    if (!isTileVisible(shop, placed)) {
      st.tileOccupant = null;
      continue;
    }

    const occ = st.tileOccupant;
    if (occ) {
      const p = world.players[occ.playerId];
      if (!p || !onTile(p, placed)) st.tileOccupant = null;
    }
    if (!st.tileOccupant) {
      const p = Object.values(world.players).find((pl) => onTile(pl, placed));
      if (!p) continue;
      st.tileOccupant = { playerId: p.id, sec: 0 };
    }

    const tile = st.tileOccupant;
    tile.sec += dt;
    const drainTime = Math.min(dt, tile.sec - BALANCE.PAY_TILE_DELAY_SEC);
    if (drainTime <= 0) continue;

    const cost = placed.unlockCost;
    const rate = cost / BALANCE.PAY_TILE_DRAIN_SEC;
    const amount = Math.min(Math.ceil(rate * drainTime), cost - st.paid, world.money);
    if (amount > 0) {
      world.money -= amount;
      st.paid += amount;
      world.dayStats.unlockSpend += amount;
    }
    if (st.paid >= cost) {
      st.unlocked = true;
      st.tileOccupant = null;
      events.push({ type: 'unlock', shopId, instanceId: placed.instanceId, byPlayerId: tile.playerId });
    }
  }
  return events;
}
