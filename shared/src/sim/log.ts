import { formatClock } from './time';
import type { WorldState } from './world';

const LOG_MAX = 30;

/** Thêm một dòng nhật ký chung (ai vừa làm gì) — hiện ở góc màn hình mọi người. */
export function addLog(world: WorldState, text: string): void {
  world.log.push({ day: world.day, clock: formatClock(world.secOfDay), text });
  while (world.log.length > LOG_MAX) world.log.shift();
}

export function playerName(world: WorldState, playerId: string): string {
  return world.players[playerId]?.name ?? 'Ai đó';
}
