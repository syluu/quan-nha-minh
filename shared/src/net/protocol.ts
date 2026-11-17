import type { ItemId } from '../content';
import type { DaySummary, LogEntry, StaffRole, StationState } from '../sim/world';

export const MSG = {
  input: 'input',
  snapshot: 'snap',
  event: 'event',
  welcome: 'welcome',
  hire: 'hire',
  fire: 'fire',
  setPrice: 'setPrice',
  rename: 'rename',
  getReport: 'getReport',
  report: 'report',
  actionError: 'actionError',
} as const;

export interface HireMsg {
  role: StaffRole;
  item: ItemId | null;
}
export interface FireMsg {
  staffId: string;
}
export interface SetPriceMsg {
  item: ItemId;
  price: number;
}
export interface RenameMsg {
  name: string;
}
export interface ActionErrorMsg {
  error: string;
}
export interface Report {
  history: DaySummary[];
  /** Ngày đang chạy; lương = số nhân viên hiện có × lương ngày. */
  today: DaySummary;
}

export interface JoinOptions {
  code: string;
  name: string;
  token: string;
}

export interface WelcomeMsg {
  playerId: string;
  code: string;
}

export interface InputMsg {
  mx: number;
  mz: number;
}

export interface Snapshot {
  day: number;
  secOfDay: number;
  money: number;
  stars: number;
  players: {
    id: string; name: string; color: number; x: number; z: number; dir: number; carry: ItemId[]; online: boolean;
    cap: number;
    /** Tiến độ nhặt món tiếp theo, 0..1. */
    pick: number;
    pickAt: string | null;
  }[];
  staff: { id: string; name: string; role: StaffRole; item: ItemId | null; x: number; z: number; dir: number; carry: ItemId[] }[];
  prices: Partial<Record<ItemId, number>>;
  customers: { id: number; x: number; z: number; dir: number; holding: ItemId[] }[];
  stations: {
    instanceId: string;
    unlocked: boolean;
    outputCount: number;
    stock: number;
    inputs: Partial<Record<ItemId, number>>;
    blocked: StationState['blocked'];
  }[];
  tiles: { instanceId: string; cost: number; paid: number; occupantSec: number }[];
  log: LogEntry[];
}
