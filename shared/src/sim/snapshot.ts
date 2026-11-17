import { SHOPS } from '../content';
import type { ShopId } from '../content';
import type { Snapshot } from '../net/protocol';
import { migrateV1toV2 } from './migrate';
import { isTileVisible } from './payTiles';
import { stars } from './rating';
import { createWorld } from './world';
import type { WorldState } from './world';

export function toSnapshot(world: WorldState, shopId: ShopId): Snapshot {
  const shop = world.shops[shopId];
  const layout = SHOPS[shopId];
  return {
    day: world.day,
    secOfDay: world.secOfDay,
    money: world.money,
    stars: stars(shop.ratings),
    players: Object.values(world.players).map((p) => ({
      id: p.id, name: p.name, color: p.color, x: p.x, z: p.z, dir: p.dir, carry: [...p.carry], online: p.online,
    })),
    customers: shop.customers.map((c) => ({ id: c.id, x: c.x, z: c.z, dir: c.dir, holding: [...c.holding] })),
    stations: layout.stations.map((placed) => {
      const st = shop.stations[placed.instanceId];
      return {
        instanceId: st.instanceId, unlocked: st.unlocked, outputCount: st.outputCount, stock: st.stock,
        inputs: { ...st.inputs }, blocked: st.blocked,
      };
    }),
    tiles: layout.stations
      .filter((placed) => isTileVisible(shop, placed))
      .map((placed) => {
        const st = shop.stations[placed.instanceId];
        return { instanceId: placed.instanceId, cost: placed.unlockCost, paid: st.paid, occupantSec: st.tileOccupant?.sec ?? 0 };
      }),
    log: world.log.slice(-5),
  };
}

/** Chuẩn hoá thế giới vừa tải từ DB: nâng version, dọn trạng thái tạm, bổ sung trạm mới thêm vào nội dung. */
export function normalizeLoaded(raw: unknown): WorldState {
  const version = raw && typeof raw === 'object' ? (raw as { schemaVersion?: unknown }).schemaVersion : undefined;
  if (version !== 1 && version !== 2) throw new Error('UNSUPPORTED_SCHEMA');
  const world = (version === 1 ? migrateV1toV2(raw) : raw) as WorldState;
  const fresh = createWorld(world.code, 0);
  for (const id of Object.keys(fresh.shops) as ShopId[]) {
    const shop = (world.shops[id] ??= fresh.shops[id]);
    for (const [instanceId, st] of Object.entries(fresh.shops[id].stations)) shop.stations[instanceId] ??= st;
    shop.customers = [];
    for (const st of Object.values(shop.stations)) st.tileOccupant = null;
  }
  for (const p of Object.values(world.players)) {
    p.online = false;
    p.input = { mx: 0, mz: 0 };
    p.dropCd = 0;
    p.pickTimer = 0;
    p.pickAt = null;
  }
  return world;
}
