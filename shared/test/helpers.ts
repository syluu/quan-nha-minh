import { BALANCE, getPlaced } from '../src/content';
import type { ItemId, ShopId } from '../src/content';
import type { PlayerState, StaffState, WorldState } from '../src/sim/world';

/** Đặt thẳng một người chơi online vào thế giới (không qua joinPlayer) cho test đơn vị. */
export function putPlayer(world: WorldState, id: string, x: number, z: number, carry: ItemId[] = [], location: ShopId = 'banh_mi'): PlayerState {
  const p: PlayerState = {
    id,
    name: id,
    color: 0x2f6db5,
    x,
    z,
    dir: 0,
    carry: [...carry],
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
    location,
  };
  world.players[id] = p;
  return p;
}

/** Chỗ đứng để dùng một trạm của xe bánh mì (workPoint trong content). */
export function standAt(instanceId: string): { x: number; z: number } {
  return { ...getPlaced('banh_mi', instanceId).workPoint };
}

export function repeat(seconds: number, fn: (dt: number) => void, dt = 0.05): void {
  const steps = Math.round(seconds / dt);
  for (let i = 0; i < steps; i++) fn(dt);
}

/** Đặt thẳng một nhân viên vào quán (không qua hireStaff) cho test đơn vị. */
export function putStaff(world: WorldState, name: string, role: 'cashier' | 'cook' | 'cleaner' = 'cook', item: ItemId | null = 'banh_mi', shopId: ShopId = 'banh_mi'): StaffState {
  const shop = world.shops[shopId];
  const s: StaffState = {
    id: `s${shop.nextStaffId++}`, name, role, item: role === 'cook' ? item : null,
    x: 0, z: -1.85, dir: 0, carry: [], task: null, timer: 0, hiredDay: world.day, level: 1, wageOwed: 0,
  };
  shop.staff.push(s);
  return s;
}
