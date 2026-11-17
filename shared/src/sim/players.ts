import { BALANCE, DEFAULT_OUTFIT, SHOPS } from '../content';
import type { ShopId } from '../content';
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

/** Đổi tên nhân vật: bỏ khoảng trắng thừa, tối đa 16 ký tự; tên rỗng thì giữ tên cũ. */
export function renamePlayer(world: WorldState, playerId: string, name: unknown): void {
  const p = world.players[playerId];
  if (!p) return;
  const clean = String(name ?? '').trim().slice(0, 16).trim();
  if (clean) p.name = clean;
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
