import { BALANCE, SHOPS, getStationDef } from '../content';
import type { ShopId, StationDef } from '../content';
import { formatK } from '../money';
import type { ActionResult } from './actions';
import { stationValue } from './bank';
import { addLog, playerName } from './log';
import { staffWage } from './staff';
import type { StationState, WorldState } from './world';

const round500 = (n: number) => Math.round(n / 500) * 500;

/** Nâng cấp nhân vật của chính người chơi: 'carry' (mang nhiều hơn) hoặc 'speed' (đi nhanh hơn). */
export function upgradePlayer(world: WorldState, playerId: string, kind: unknown): ActionResult {
  if (world.settlement) return { ok: false, error: 'PAUSED' };
  const p = world.players[playerId];
  if (!p) return { ok: false, error: 'NOT_FOUND' };
  if (kind !== 'carry' && kind !== 'speed') return { ok: false, error: 'BAD_ROLE' };
  const costs = kind === 'carry' ? BALANCE.PLAYER_CARRY_COSTS : BALANCE.PLAYER_SPEED_COSTS;
  const level = kind === 'carry' ? p.carryLevel : p.speedLevel;
  if (level >= costs.length) return { ok: false, error: 'MAXED' };
  const cost = costs[level];
  if (world.money < cost) return { ok: false, error: 'NO_MONEY' };
  world.money -= cost;
  if (kind === 'carry') {
    p.carryLevel += 1;
    p.carryCap = BALANCE.PLAYER_CARRY_CAPS[p.carryLevel];
  } else {
    p.speedLevel += 1;
    p.speed = BALANCE.PLAYER_SPEED * (1 + BALANCE.PLAYER_SPEED_STEP * p.speedLevel);
  }
  addLog(world, `${p.name} nâng ${kind === 'carry' ? `sức mang lên ${p.carryCap} món` : `tốc độ lên cấp ${p.speedLevel}`} (${formatK(cost)})`);
  return { ok: true };
}

/** Đào tạo một nhân viên lên cấp tiếp theo (đi nhanh hơn, mang nhiều hơn, lương cao hơn). */
export function upgradeStaff(world: WorldState, shopId: ShopId, staffId: unknown, byPlayerId: string): ActionResult {
  if (world.settlement) return { ok: false, error: 'PAUSED' };
  const s = world.shops[shopId].staff.find((x) => x.id === staffId);
  if (!s) return { ok: false, error: 'NOT_FOUND' };
  if (s.level >= BALANCE.STAFF_LEVELS.length) return { ok: false, error: 'MAXED' };
  const cost = BALANCE.STAFF_LEVELS[s.level].train;
  if (world.money < cost) return { ok: false, error: 'NO_MONEY' };
  world.money -= cost;
  s.level += 1;
  addLog(world, `${playerName(world, byPlayerId)} đã nâng ${s.name} lên cấp ${s.level} (lương ${formatK(staffWage(s))}/ngày)`);
  return { ok: true };
}

export function machineUpgradeCost(shopId: ShopId, instanceId: string, toLevel: number): number {
  return round500(0.5 * stationValue(shopId, instanceId) * Math.pow(1.6, toLevel - 1));
}

export function effectiveCycle(def: StationDef, st: Pick<StationState, 'level'>): number {
  if (def.kind !== 'producer' && def.kind !== 'assembler') return 0;
  return def.cycleSec * Math.pow(BALANCE.MACHINE_CYCLE_FACTOR, st.level ?? 0);
}

export function effectiveOutputCap(def: StationDef, st: Pick<StationState, 'level'>): number {
  if (def.kind !== 'producer' && def.kind !== 'assembler') return 0;
  return Math.floor(def.outputCap * (1 + BALANCE.MACHINE_CAP_BONUS * (st.level ?? 0)));
}

/** Nâng cấp một máy làm món đã mở (nhanh hơn, chứa nhiều hơn). */
export function upgradeMachine(world: WorldState, shopId: ShopId, instanceId: unknown, byPlayerId: string): ActionResult {
  if (world.settlement) return { ok: false, error: 'PAUSED' };
  const placed = SHOPS[shopId].stations.find((p) => p.instanceId === instanceId);
  if (!placed) return { ok: false, error: 'BAD_ITEM' };
  const def = getStationDef(placed.def);
  const st = world.shops[shopId].stations[placed.instanceId];
  if ((def.kind !== 'producer' && def.kind !== 'assembler') || !st.unlocked) return { ok: false, error: 'BAD_ITEM' };
  if (st.level >= BALANCE.MACHINE_MAX_LEVEL) return { ok: false, error: 'MAXED' };
  const cost = machineUpgradeCost(shopId, placed.instanceId, st.level + 1);
  if (world.money < cost) return { ok: false, error: 'NO_MONEY' };
  world.money -= cost;
  st.level += 1;
  st.upgradeSpent += cost;
  addLog(world, `${playerName(world, byPlayerId)} nâng ${def.name} lên cấp ${st.level} (${formatK(cost)})`);
  return { ok: true };
}

/** Bật/tắt tự sản xuất của một máy/bàn ghép. Tắt giữa mẻ → mẻ đó vẫn làm xong. */
export function setMachineEnabled(world: WorldState, shopId: ShopId, instanceId: unknown, enabled: unknown, byPlayerId: string): ActionResult {
  const placed = SHOPS[shopId].stations.find((p) => p.instanceId === instanceId);
  if (!placed || typeof enabled !== 'boolean') return { ok: false, error: 'BAD_ITEM' };
  const def = getStationDef(placed.def);
  const st = world.shops[shopId].stations[placed.instanceId];
  if ((def.kind !== 'producer' && def.kind !== 'assembler') || !st.unlocked) return { ok: false, error: 'BAD_ITEM' };
  if (st.enabled === enabled) return { ok: true };
  st.enabled = enabled;
  if (enabled && st.blocked === 'off') st.blocked = null;
  addLog(world, `${playerName(world, byPlayerId)} ${enabled ? 'bật' : 'tắt'} ${def.name}`);
  return { ok: true };
}
