import { COSTUMES } from '../content';
import { formatK } from '../money';
import type { ActionResult } from './actions';
import { addLog } from './log';
import type { WorldState } from './world';

/** Món này người chơi mặc được chưa: đồ mặc định (giá 0) hoặc đã mua. */
export function ownsCostume(world: WorldState, playerId: string, id: string): boolean {
  if (!Object.hasOwn(COSTUMES, id)) return false;
  const c = COSTUMES[id];
  const p = world.players[playerId];
  return !!p && (c.price === 0 || p.wardrobe.includes(id));
}

/** Mua (ví chung) một món trang phục cho chính mình và mặc ngay; món đã có thì chỉ mặc. */
export function buyCostume(world: WorldState, playerId: string, id: unknown): ActionResult {
  const p = world.players[playerId];
  if (!p) return { ok: false, error: 'NOT_FOUND' };
  if (typeof id !== 'string' || !Object.hasOwn(COSTUMES, id)) return { ok: false, error: 'BAD_ITEM' };
  const c = COSTUMES[id];
  if (!ownsCostume(world, playerId, id)) {
    if (world.settlement) return { ok: false, error: 'PAUSED' };
    if (world.money < c.price) return { ok: false, error: 'NO_MONEY' };
    world.money -= c.price;
    world.dayStats.unlockSpend += c.price;
    p.wardrobe.push(id);
    addLog(world, `${p.name} mua ${c.name} (${formatK(c.price)})`);
  }
  p.outfit[c.slot] = id;
  return { ok: true };
}

/** Mặc một món đã có. */
export function wearCostume(world: WorldState, playerId: string, id: unknown): ActionResult {
  if (typeof id !== 'string' || !Object.hasOwn(COSTUMES, id)) return { ok: false, error: 'BAD_ITEM' };
  if (!ownsCostume(world, playerId, id)) return { ok: false, error: 'NOT_FOUND' };
  world.players[playerId].outfit[COSTUMES[id].slot] = id;
  return { ok: true };
}
