import { BALANCE, SHOPS, STATIONS, getStationDef } from '../content';
import type { PlacedStation, StationDef } from '../content';
import { formatK } from '../money';
import type { ActionResult } from './actions';
import { addLog, playerName } from './log';
import type { ShopState, WorldState } from './world';

export type PlotDef = Extract<StationDef, { kind: 'plot' }>;

/** Các giống trồng/nuôi chọn được cho một lô (theo thứ tự hiện trong menu). */
export const PLOT_CROPS = ['ruong_rau', 'ruong_lua_mi', 'ruong_lua', 'chuong_ga', 'chuong_lon', 'chuong_bo'] as const;
export type PlotCrop = (typeof PLOT_CROPS)[number];

export const isPlotCrop = (x: unknown): x is PlotCrop => typeof x === 'string' && (PLOT_CROPS as readonly string[]).includes(x);

/** Giống lô đang trồng: null = đất trống (lô mở rộng chưa chọn giống). */
export function plotDef(shop: ShopState, placed: PlacedStation): PlotDef | null {
  const base = getStationDef(placed.def);
  if (base.kind !== 'plot') return null;
  const crop = shop.stations[placed.instanceId]?.crop;
  if (crop === null) return null;
  const def = crop ? STATIONS[crop] : base;
  return def?.kind === 'plot' ? def : null;
}

/** Mở rộng trang trại thêm một mảnh (4 lô đất trống ở bên trái), tối đa 3 lần. */
export function buyFarmExpansion(world: WorldState, byPlayerId: string): ActionResult {
  if (world.settlement) return { ok: false, error: 'PAUSED' };
  const farm = world.shops.farm;
  if (!farm?.owned) return { ok: false, error: 'NOT_FOUND' };
  if (farm.farmLevel >= BALANCE.FARM_EXPANSION_COSTS.length) return { ok: false, error: 'MAXED' };
  const cost = BALANCE.FARM_EXPANSION_COSTS[farm.farmLevel];
  if (world.money < cost) return { ok: false, error: 'NO_MONEY' };
  world.money -= cost;
  world.dayStats.unlockSpend += cost;
  farm.farmLevel += 1;
  for (const p of SHOPS.farm.stations) {
    if (p.farmExpansion !== farm.farmLevel) continue;
    const st = farm.stations[p.instanceId];
    Object.assign(st, { unlocked: true, crop: null, nextCrop: null, outputCount: 0, progress: 0, running: false, blocked: null });
  }
  addLog(world, `${playerName(world, byPlayerId)} mở rộng trang trại lần ${farm.farmLevel} (+4 lô đất, ${formatK(cost)})`);
  return { ok: true };
}

/**
 * Chọn giống cho một lô. Lô trống → trồng ngay. Lô đang có giống → đổi sau khi xong mẻ đang trồng và
 * lấy hết thùng còn trên lô (không mất phí). Chọn lại đúng giống đang trồng = huỷ lệnh đổi.
 */
export function setPlotCrop(world: WorldState, instanceId: unknown, crop: unknown, byPlayerId: string): ActionResult {
  const farm = world.shops.farm;
  if (!farm?.owned) return { ok: false, error: 'NOT_FOUND' };
  const placed = SHOPS.farm.stations.find((p) => p.instanceId === instanceId);
  if (!placed || getStationDef(placed.def).kind !== 'plot' || !isPlotCrop(crop)) return { ok: false, error: 'BAD_ITEM' };
  const st = farm.stations[placed.instanceId];
  if (!st.unlocked) return { ok: false, error: 'NOT_FOUND' };
  const current = plotDef(farm, placed);
  const name = (STATIONS[crop] as PlotDef).name;
  if (!current) {
    st.crop = crop;
    st.nextCrop = null;
    addLog(world, `${playerName(world, byPlayerId)} cho lô đất mới làm ${name.toLowerCase()}`);
  } else if (current.id === crop) {
    st.nextCrop = null;
  } else {
    st.nextCrop = crop;
    addLog(world, `${playerName(world, byPlayerId)} cho đổi ${current.name.toLowerCase()} sang ${name.toLowerCase()} (sau mẻ này)`);
  }
  return { ok: true };
}

/** Đổi giống chờ sẵn: chỉ áp dụng khi lô không đang trồng và không còn thùng trên lô. */
export function applyPendingCrop(st: ShopState['stations'][string]): void {
  if (!st.nextCrop || st.running || st.outputCount > 0) return;
  st.crop = st.nextCrop;
  st.nextCrop = null;
  st.level = st.level ?? 0;
}
