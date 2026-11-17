import type { ItemId, ShopId } from '../content';
import type { DaySummary, Settlement } from './world';

export type SimEvent =
  | { type: 'sale'; shopId: ShopId; amount: number; x: number; z: number }
  | { type: 'unlock'; shopId: ShopId; instanceId: string; byPlayerId: string }
  | { type: 'customerLost'; shopId: ShopId; x: number; z: number }
  | { type: 'trash'; shopId: ShopId; playerId: string; item: ItemId; value: number; x: number; z: number }
  | { type: 'dayEnd'; summary: DaySummary }
  | { type: 'monthEnd'; settlement: Settlement }
  | { type: 'monthClosed'; month: number }
  | { type: 'bankrupt' }
  | { type: 'orderDone'; shopId: ShopId; net: number; x: number; z: number }
  | { type: 'orderCancelled'; shopId: ShopId; x: number; z: number }
  | { type: 'clean'; shopId: ShopId; instanceId: string; x: number; z: number };
