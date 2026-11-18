import type { ItemId, ShopId } from '../content';
import type { DaySummary, Settlement } from './world';

export type SimEvent =
  | { type: 'sale'; shopId: ShopId; amount: number; x: number; z: number; tip?: number }
  | { type: 'combo'; shopId: ShopId; n: number; bonus: number; x: number; z: number }
  | { type: 'tourBus'; shopId: ShopId }
  | { type: 'catStray'; shopId: ShopId }
  | { type: 'catFed'; shopId: ShopId; x: number; z: number }
  | { type: 'highFive'; shopId: ShopId; names: string[]; x: number; z: number }
  | { type: 'questDone'; text: string; reward: number }
  | { type: 'badge'; id: string }
  | { type: 'unlock'; shopId: ShopId; instanceId: string; byPlayerId: string }
  | { type: 'customerLost'; shopId: ShopId; x: number; z: number }
  | { type: 'trash'; shopId: ShopId; playerId: string; item: ItemId; value: number; x: number; z: number }
  | { type: 'dayEnd'; summary: DaySummary }
  | { type: 'monthEnd'; settlement: Settlement }
  | { type: 'monthClosed'; month: number }
  | { type: 'bankrupt' }
  | { type: 'orderDone'; shopId: ShopId; net: number; x: number; z: number }
  | { type: 'orderCancelled'; shopId: ShopId; x: number; z: number }
  | { type: 'clean'; shopId: ShopId; instanceId: string; x: number; z: number }
  | { type: 'stored'; shopId: ShopId; item: ItemId; x: number; z: number }
  | { type: 'shopTier'; shopId: ShopId; tier: number }
  | { type: 'regular'; shopId: ShopId; text: string; x: number; z: number }
  | { type: 'partyOffer'; shopId: ShopId }
  | { type: 'partyDone'; shopId: ShopId; reward: number; x: number; z: number }
  | { type: 'partyFailed'; shopId: ShopId; delivered: number; qty: number }
  | { type: 'intruder'; shopId: ShopId; kind: 'thief' | 'drunk' }
  | { type: 'intruderCaught'; shopId: ShopId; kind: 'thief' | 'drunk'; by: string; refund: number; items: number; x: number; z: number }
  | { type: 'intruderEscaped'; shopId: ShopId; kind: 'thief' | 'drunk'; value: number; items: number; x: number; z: number };
