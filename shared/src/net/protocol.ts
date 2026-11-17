import type { ItemId } from '../content';
import type { LogEntry, StationState } from '../sim/world';

export const MSG = { input: 'input', snapshot: 'snap', event: 'event', welcome: 'welcome' } as const;

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
  players: { id: string; name: string; color: number; x: number; z: number; dir: number; carry: ItemId[]; online: boolean }[];
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
