import { BALANCE, DEFAULT_OUTFIT, SHOPS } from '../content';
import type { ShopId } from '../content';
import type { ActionResult } from './actions';
import type { PlayerState, WorldState } from './world';

export const PLAYER_COLORS = [0x2f6db5, 0xd8573d, 0x5aa34a, 0x9b59b6, 0xe0a020, 0x2aa3a3];

/** Tạo mới hoặc lấy lại nhân vật theo id; đánh dấu online. */
export function joinPlayer(world: WorldState, playerId: string, name: string): PlayerState {
  const existing = world.players[playerId];
  if (existing) {
    existing.online = true;
    existing.name = name;
    existing.input = { mx: 0, mz: 0 };
    existing.inMenu = false;
    if (!world.shops[existing.location]?.owned) {
      existing.location = 'banh_mi';
      existing.x = SHOPS.banh_mi.entrance.x;
      existing.z = SHOPS.banh_mi.entrance.z;
    }
    return existing;
  }
  const entrance = SHOPS.banh_mi.entrance;
  const p: PlayerState = {
    id: playerId,
    name,
    color: PLAYER_COLORS[Object.keys(world.players).length % PLAYER_COLORS.length],
    x: entrance.x,
    z: entrance.z,
    dir: Math.PI,
    carry: [],
    carryCap: BALANCE.PLAYER_CARRY,
    speed: BALANCE.PLAYER_SPEED,
    online: true,
    input: { mx: 0, mz: 0 },
    dropCd: 0,
    pickTimer: 0,
    pickAt: null,
    inMenu: false,
    carryLevel: 0,
    speedLevel: 0,
    location: 'banh_mi',
    outfit: { ...DEFAULT_OUTFIT },
    wardrobe: [],
  };
  world.players[playerId] = p;
  return p;
}

export function leavePlayer(world: WorldState, playerId: string): void {
  const p = world.players[playerId];
  if (!p) return;
  p.online = false;
  p.input = { mx: 0, mz: 0 };
  p.inMenu = false;
  for (const id of Object.keys(world.shops) as ShopId[])
    for (const st of Object.values(world.shops[id].stations))
      if (st.tileOccupant?.playerId === playerId) st.tileOccupant = null;
}

/** Khoá so tên: bỏ khoảng trắng thừa, không phân biệt hoa/thường ("bố" = " Bố "). */
export function nameKey(name: string): string {
  return name.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');
}

/** Nhân vật trong thế giới có cùng tên (cùng phòng + cùng tên = cùng một người). */
export function findPlayerByName(world: WorldState, name: string): PlayerState | null {
  const key = nameKey(name);
  if (!key) return null;
  return Object.values(world.players).find((p) => nameKey(p.name) === key) ?? null;
}

/** Đổi tên nhân vật: bỏ khoảng trắng thừa, tối đa 16 ký tự; tên rỗng giữ tên cũ; trùng tên người khác thì từ chối. */
export function renamePlayer(world: WorldState, playerId: string, name: unknown): ActionResult {
  const p = world.players[playerId];
  if (!p) return { ok: false, error: 'NOT_FOUND' };
  const clean = String(name ?? '').trim().slice(0, 16).trim();
  if (!clean) return { ok: true };
  const other = findPlayerByName(world, clean);
  if (other && other.id !== playerId) return { ok: false, error: 'NAME_TAKEN' };
  p.name = clean;
  return { ok: true };
}

export function setInput(world: WorldState, playerId: string, input: { mx: number; mz: number; menu?: unknown }): void {
  const p = world.players[playerId];
  if (!p) return;
  let mx = Number.isFinite(input?.mx) ? input.mx : 0;
  let mz = Number.isFinite(input?.mz) ? input.mz : 0;
  const len = Math.hypot(mx, mz);
  if (len > 1) {
    mx /= len;
    mz /= len;
  }
  p.input = { mx, mz };
  p.inMenu = input?.menu === true;
}
