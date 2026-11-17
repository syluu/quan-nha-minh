import { BALANCE, SHOPS } from '../content';
import type { ItemId, ShopId } from '../content';

export interface StationState {
  instanceId: string;
  unlocked: boolean;
  /** Số đồng đã trả qua ô trả tiền. */
  paid: number;
  outputCount: number;
  inputs: Partial<Record<ItemId, number>>;
  /** Số món đang bày (chỉ kệ). */
  stock: number;
  progress: number;
  running: boolean;
  blocked: null | 'no_money' | 'no_input' | 'full';
  tileOccupant: null | { playerId: string; sec: number };
}

export interface Customer {
  id: number;
  x: number;
  z: number;
  dir: number;
  state: 'toShelf' | 'atShelf' | 'toQueue' | 'inQueue' | 'paying' | 'leaving';
  wants: ItemId[];
  bill: number;
  waited: number;
  payTimer: number;
  holding: ItemId[];
  scored: boolean;
}

export interface ShopState {
  id: ShopId;
  stations: Record<string, StationState>;
  customers: Customer[];
  prices: Partial<Record<ItemId, number>>;
  ratings: number[];
  nextCustomerIn: number;
  nextCustomerId: number;
}

export interface PlayerState {
  id: string;
  name: string;
  color: number;
  x: number;
  z: number;
  dir: number;
  carry: ItemId[];
  carryCap: number;
  speed: number;
  online: boolean;
  input: { mx: number; mz: number };
  transferCd: number;
}

export interface DayStats {
  revenue: number;
  ingredientCost: number;
  unlockSpend: number;
  served: number;
  lost: number;
}

export interface DaySummary extends DayStats {
  day: number;
  operatingProfit: number;
  stars: number;
}

export interface LogEntry {
  day: number;
  clock: string;
  text: string;
}

export interface WorldState {
  schemaVersion: 1;
  code: string;
  money: number;
  day: number;
  secOfDay: number;
  rngState: number;
  shops: Record<ShopId, ShopState>;
  players: Record<string, PlayerState>;
  log: LogEntry[];
  dayStats: DayStats;
}

export function emptyDayStats(): DayStats {
  return { revenue: 0, ingredientCost: 0, unlockSpend: 0, served: 0, lost: 0 };
}

function createShop(id: ShopId): ShopState {
  const layout = SHOPS[id];
  const stations: Record<string, StationState> = {};
  for (const p of layout.stations) {
    stations[p.instanceId] = {
      instanceId: p.instanceId,
      unlocked: p.unlockCost === 0,
      paid: 0,
      outputCount: 0,
      inputs: {},
      stock: 0,
      progress: 0,
      running: false,
      blocked: null,
      tileOccupant: null,
    };
  }
  return { id, stations, customers: [], prices: {}, ratings: [], nextCustomerIn: 1, nextCustomerId: 1 };
}

export function createWorld(code: string, seed: number): WorldState {
  return {
    schemaVersion: 1,
    code,
    money: BALANCE.START_MONEY,
    day: 1,
    secOfDay: 0,
    rngState: seed >>> 0,
    shops: { banh_mi: createShop('banh_mi') },
    players: {},
    log: [],
    dayStats: emptyDayStats(),
  };
}

/** mulberry32 trên world.rngState → số trong [0, 1). */
export function nextRandom(world: WorldState): number {
  world.rngState = (world.rngState + 0x6d2b79f5) >>> 0;
  let t = world.rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
