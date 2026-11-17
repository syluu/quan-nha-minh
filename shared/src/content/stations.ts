import type { IngredientId, ItemId, ShopId } from './ids';

export interface Footprint {
  w: number;
  d: number;
}

export type StationDef =
  | {
      kind: 'producer';
      id: string;
      name: string;
      ingredients: { id: IngredientId; qty: number }[];
      output: ItemId;
      cycleSec: number;
      outputCap: number;
      footprint: Footprint;
    }
  | {
      kind: 'assembler';
      id: string;
      name: string;
      inputs: { item: ItemId; qty: number }[];
      inputCap: number;
      ingredients: { id: IngredientId; qty: number }[];
      output: ItemId;
      cycleSec: number;
      outputCap: number;
      footprint: Footprint;
    }
  | { kind: 'display'; id: string; name: string; item: ItemId; cap: number; footprint: Footprint }
  | { kind: 'cashier'; id: string; name: string; footprint: Footprint }
  | { kind: 'trash'; id: string; name: string; footprint: Footprint }
  | { kind: 'pickup'; id: string; name: string; footprint: Footprint };

export interface PlacedStation {
  instanceId: string;
  def: string;
  x: number;
  z: number;
  /** Đồng. 0 = có sẵn từ đầu. */
  unlockCost: number;
  requires: string[];
  customerPoint?: { x: number; z: number };
  /** Chỗ người chơi/nhân viên đứng để dùng trạm (phía bếp). */
  workPoint: { x: number; z: number };
  /** Chỗ shipper đứng chờ (chỉ điểm giao hàng). */
  shipperPoint?: { x: number; z: number };
}

export interface ShopLayout {
  id: ShopId;
  name: string;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  entrance: { x: number; z: number };
  exit: { x: number; z: number };
  queueDir: { x: number; z: number };
  /** Nơi shipper xuất hiện (ngoài đường). */
  shipperSpawn: { x: number; z: number };
  stations: PlacedStation[];
  baseCustomerIntervalSec: number;
  /** [từ giờ, đến giờ, hệ số] */
  hourCurve: [number, number, number][];
}

const MACHINE: Footprint = { w: 1.2, d: 1.0 };
const SHELF: Footprint = { w: 1.0, d: 0.8 };

const list: StationDef[] = [
  { kind: 'producer', id: 'lo_banh_mi', name: 'Lò bánh mì', ingredients: [{ id: 'bot_mi', qty: 1 }], output: 'banh_mi', cycleSec: 3, outputCap: 8, footprint: MACHINE },
  { kind: 'producer', id: 'chao_op_la', name: 'Chảo ốp la', ingredients: [{ id: 'trung', qty: 1 }], output: 'trung_op', cycleSec: 4, outputCap: 6, footprint: MACHINE },
  { kind: 'producer', id: 'lo_than', name: 'Lò than', ingredients: [{ id: 'thit_lon', qty: 1 }], output: 'thit_nuong', cycleSec: 5, outputCap: 6, footprint: MACHINE },
  { kind: 'producer', id: 'binh_tra', name: 'Bình trà đá', ingredients: [{ id: 'tra', qty: 1 }], output: 'tra_da', cycleSec: 2, outputCap: 10, footprint: { w: 0.8, d: 0.8 } },
  {
    kind: 'assembler', id: 'ban_bm_trung', name: 'Bàn bánh mì trứng',
    inputs: [{ item: 'banh_mi', qty: 1 }, { item: 'trung_op', qty: 1 }], inputCap: 6,
    ingredients: [{ id: 'rau', qty: 1 }], output: 'banh_mi_trung', cycleSec: 2, outputCap: 6, footprint: MACHINE,
  },
  {
    kind: 'assembler', id: 'ban_bm_thit', name: 'Bàn bánh mì thịt',
    inputs: [{ item: 'banh_mi', qty: 1 }, { item: 'thit_nuong', qty: 1 }], inputCap: 6,
    ingredients: [{ id: 'rau', qty: 1 }], output: 'banh_mi_thit', cycleSec: 2, outputCap: 6, footprint: MACHINE,
  },
  { kind: 'display', id: 'ke_banh_mi', name: 'Kệ bánh mì', item: 'banh_mi', cap: 10, footprint: SHELF },
  { kind: 'display', id: 'ke_tra_da', name: 'Kệ trà đá', item: 'tra_da', cap: 10, footprint: SHELF },
  { kind: 'display', id: 'ke_bm_trung', name: 'Kệ bánh mì trứng', item: 'banh_mi_trung', cap: 8, footprint: SHELF },
  { kind: 'display', id: 'ke_thit_nuong', name: 'Kệ thịt nướng', item: 'thit_nuong', cap: 8, footprint: SHELF },
  { kind: 'display', id: 'ke_bm_thit', name: 'Kệ bánh mì thịt', item: 'banh_mi_thit', cap: 8, footprint: SHELF },
  { kind: 'cashier', id: 'thu_ngan', name: 'Quầy thu ngân', footprint: SHELF },
  { kind: 'trash', id: 'thung_rac', name: 'Thùng rác', footprint: { w: 0.6, d: 0.6 } },
  { kind: 'pickup', id: 'diem_giao', name: 'Điểm giao hàng', footprint: { w: 0.8, d: 0.6 } },
];

export const STATIONS: Record<string, StationDef> = Object.fromEntries(list.map((d) => [d.id, d]));

export function getStationDef(id: string): StationDef {
  const def = STATIONS[id];
  if (!def) throw new Error(`Unknown station def: ${id}`);
  return def;
}
