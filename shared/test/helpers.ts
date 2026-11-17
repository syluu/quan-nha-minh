import { BALANCE, getPlaced } from '../src/content';
import type { ItemId } from '../src/content';
import type { PlayerState, WorldState } from '../src/sim/world';

/** Đặt thẳng một người chơi online vào thế giới (không qua joinPlayer) cho test đơn vị. */
export function putPlayer(world: WorldState, id: string, x: number, z: number, carry: ItemId[] = []): PlayerState {
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
    transferCd: 0,
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
