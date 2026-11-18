import { BALANCE, SHOP_IDS, SHOP_META, SHOPS } from '../content';
import type { ShopId } from '../content';
import { travel } from './shops';
import type { PlayerState, WorldState } from './world';

export interface PortalPad {
  to: ShopId;
  x: number;
  z: number;
}

/** Các ô lối đi trong một quán: mỗi nơi đang có (trừ chính quán này) một ô, xếp hàng ngang từ `layout.portal`. */
export function portalPads(world: WorldState, shopId: ShopId): PortalPad[] {
  const start = SHOPS[shopId].portal;
  return SHOP_IDS.filter((id) => id !== shopId && world.shops[id].owned).map((to, i) => ({
    to,
    x: start.x + i * BALANCE.PORTAL_SPACING,
    z: start.z,
  }));
}

/** Ô người chơi đang đứng yên trên (đi ngang qua hay đang mở menu thì không tính). */
function padUnder(p: PlayerState, pads: PortalPad[]): PortalPad | null {
  if (!p.online || p.inMenu) return null;
  if (Math.hypot(p.input.mx, p.input.mz) > BALANCE.STILL_INPUT) return null;
  return pads.find((pad) => Math.hypot(p.x - pad.x, p.z - pad.z) <= BALANCE.PORTAL_RADIUS) ?? null;
}

/** Đứng yên trên ô lối đi đủ PORTAL_SEC thì sang nơi đó (xuất hiện ở lối vào, đồ đang cầm mang theo). */
export function tickPortals(world: WorldState, shopId: ShopId, dt: number): void {
  const players = Object.values(world.players).filter((p) => p.location === shopId);
  if (players.length === 0) return;
  const pads = portalPads(world, shopId);
  for (const p of players) {
    const pad = padUnder(p, pads);
    if (!pad) {
      p.portal = null;
      continue;
    }
    const sec = (p.portal?.to === pad.to ? p.portal.sec : 0) + dt;
    if (sec + 1e-9 < BALANCE.PORTAL_SEC) {
      p.portal = { to: pad.to, sec };
      continue;
    }
    p.portal = null;
    travel(world, p.id, pad.to);
  }
}

/** Ô lối đi cho snapshot của quán đang xem, kèm tiến trình của người đứng lâu nhất. */
export function portalSnapshot(world: WorldState, shopId: ShopId) {
  return portalPads(world, shopId).map((pad) => ({
    ...pad,
    name: SHOP_META[pad.to].name,
    kind: SHOP_META[pad.to].kind,
    sec: Math.max(
      0,
      ...Object.values(world.players)
        .filter((p) => p.location === shopId && p.portal?.to === pad.to)
        .map((p) => p.portal!.sec),
    ),
  }));
}
