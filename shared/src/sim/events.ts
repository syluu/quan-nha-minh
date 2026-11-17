import type { ShopId } from '../content';
import type { DaySummary } from './world';

export type SimEvent =
  | { type: 'sale'; shopId: ShopId; amount: number; x: number; z: number }
  | { type: 'unlock'; shopId: ShopId; instanceId: string; byPlayerId: string }
  | { type: 'customerLost'; shopId: ShopId; x: number; z: number }
  | { type: 'dayEnd'; summary: DaySummary };
