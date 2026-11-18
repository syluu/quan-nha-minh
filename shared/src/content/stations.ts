import { K } from '../money';
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
  | { kind: 'pickup'; id: string; name: string; footprint: Footprint }
  | { kind: 'table'; id: string; name: string; seats: number; footprint: Footprint }
  /** Lô trang trại: trả tiền giống/thức ăn mỗi mẻ (đồng), ra 1 thùng hàng sau cycleSec. */
  | { kind: 'plot'; id: string; name: string; seedCost: number; output: ItemId; cycleSec: number; outputCap: number; animal: boolean; footprint: Footprint }
  /** Xe chở hàng: bốc thùng hàng lên → nguyên liệu vào kho tổng. */
  | { kind: 'truck'; id: string; name: string; footprint: Footprint };

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
  /** Chỗ khách ngồi ăn (chỉ bàn ăn). */
  seatPoints?: { x: number; z: number }[];
  /** Lô đất mở rộng trang trại: có khi mua lần mở rộng thứ mấy (1–3); ban đầu là đất trống. */
  farmExpansion?: number;
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
  /**
   * Lối đi sang quán khác / trang trại: ô đầu tiên ở đây, các ô sau xếp sang phải (mỗi nơi đang có một ô).
   * Đặt xa lối vào (người vừa sang không đứng trúng ô) và xa chỗ mèo hoang.
   */
  portal: { x: number; z: number };
  stations: PlacedStation[];
  baseCustomerIntervalSec: number;
  /** [từ giờ, đến giờ, hệ số] */
  hourCurve: [number, number, number][];
}

/**
 * Hàng kệ + thu ngân đặt cách hàng máy (z=-3.8) một lối bếp rộng: đi dọc lối bếp
 * (z ≈ -1.85, ra điểm giao hàng) không lọt vào vùng đặt đồ của kệ.
 */
export const SHELF_ROW_Z = 1.0;

const MACHINE: Footprint = { w: 1.2, d: 1.0 };
const SHELF: Footprint = { w: 1.0, d: 0.8 };
const PLOT: Footprint = { w: 2.2, d: 1.6 };

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
  { kind: 'table', id: 'ban_an', name: 'Bàn ăn', seats: 2, footprint: { w: 1.2, d: 0.8 } },

  // Trang trại
  { kind: 'plot', id: 'ruong_rau', name: 'Ruộng rau', seedCost: K(4), output: 'thung_rau', cycleSec: 40, outputCap: 3, animal: false, footprint: PLOT },
  { kind: 'plot', id: 'ruong_lua_mi', name: 'Ruộng lúa mì', seedCost: K(10), output: 'bao_bot_mi', cycleSec: 60, outputCap: 3, animal: false, footprint: PLOT },
  { kind: 'plot', id: 'ruong_lua', name: 'Ruộng lúa', seedCost: K(14), output: 'bao_gao', cycleSec: 60, outputCap: 3, animal: false, footprint: PLOT },
  { kind: 'plot', id: 'chuong_ga', name: 'Chuồng gà', seedCost: K(12), output: 'khay_trung', cycleSec: 50, outputCap: 3, animal: true, footprint: PLOT },
  { kind: 'plot', id: 'chuong_lon', name: 'Chuồng lợn', seedCost: K(16), output: 'thung_thit_lon', cycleSec: 90, outputCap: 3, animal: true, footprint: PLOT },
  { kind: 'plot', id: 'chuong_bo', name: 'Chuồng bò', seedCost: K(45), output: 'thung_thit_bo', cycleSec: 120, outputCap: 3, animal: true, footprint: PLOT },
  { kind: 'truck', id: 'xe_cho_hang', name: 'Xe chở hàng', footprint: { w: 1.0, d: 1.8 } },

  // Quán cơm tấm
  { kind: 'producer', id: 'noi_com', name: 'Nồi cơm', ingredients: [{ id: 'gao', qty: 1 }], output: 'com', cycleSec: 3, outputCap: 8, footprint: MACHINE },
  { kind: 'producer', id: 'lo_suon', name: 'Lò nướng sườn', ingredients: [{ id: 'thit_lon', qty: 1 }], output: 'suon_nuong', cycleSec: 5, outputCap: 6, footprint: MACHINE },
  { kind: 'producer', id: 'chao_cha', name: 'Chảo chả trứng', ingredients: [{ id: 'trung', qty: 1 }, { id: 'thit_lon', qty: 1 }], output: 'cha_trung', cycleSec: 5, outputCap: 6, footprint: MACHINE },
  {
    kind: 'assembler', id: 'ban_com_tam_suon', name: 'Bàn cơm tấm sườn',
    inputs: [{ item: 'com', qty: 1 }, { item: 'suon_nuong', qty: 1 }], inputCap: 6,
    ingredients: [{ id: 'rau', qty: 1 }], output: 'com_tam_suon', cycleSec: 2, outputCap: 6, footprint: MACHINE,
  },
  {
    kind: 'assembler', id: 'ban_com_tam_suon_cha', name: 'Bàn cơm tấm sườn chả',
    inputs: [{ item: 'com', qty: 1 }, { item: 'suon_nuong', qty: 1 }, { item: 'cha_trung', qty: 1 }], inputCap: 6,
    ingredients: [{ id: 'rau', qty: 1 }], output: 'com_tam_suon_cha', cycleSec: 2.5, outputCap: 6, footprint: MACHINE,
  },
  { kind: 'display', id: 'ke_com_tam_suon', name: 'Kệ cơm tấm sườn', item: 'com_tam_suon', cap: 8, footprint: SHELF },
  { kind: 'display', id: 'ke_com_tam_suon_cha', name: 'Kệ cơm tấm sườn chả', item: 'com_tam_suon_cha', cap: 8, footprint: SHELF },

  // Quán phở & cà phê
  { kind: 'producer', id: 'noi_nuoc_dung', name: 'Nồi nước dùng', ingredients: [{ id: 'xuong_bo', qty: 1 }], output: 'nuoc_dung', cycleSec: 4, outputCap: 8, footprint: MACHINE },
  { kind: 'producer', id: 'may_banh_pho', name: 'Máy bánh phở', ingredients: [{ id: 'gao', qty: 1 }], output: 'banh_pho', cycleSec: 3, outputCap: 8, footprint: MACHINE },
  { kind: 'producer', id: 'thot_bo', name: 'Thớt thái bò', ingredients: [{ id: 'thit_bo', qty: 1 }], output: 'bo_tai', cycleSec: 4, outputCap: 6, footprint: MACHINE },
  {
    kind: 'assembler', id: 'ban_pho', name: 'Bàn phở',
    inputs: [{ item: 'nuoc_dung', qty: 1 }, { item: 'banh_pho', qty: 1 }, { item: 'bo_tai', qty: 1 }], inputCap: 6,
    ingredients: [{ id: 'rau', qty: 1 }], output: 'pho_bo', cycleSec: 2.5, outputCap: 6, footprint: MACHINE,
  },
  { kind: 'producer', id: 'may_pha_phin', name: 'Máy pha phin', ingredients: [{ id: 'ca_phe', qty: 1 }], output: 'ca_phe_phin', cycleSec: 3, outputCap: 8, footprint: MACHINE },
  {
    kind: 'assembler', id: 'quay_ca_phe', name: 'Quầy cà phê sữa',
    inputs: [{ item: 'ca_phe_phin', qty: 1 }], inputCap: 6,
    ingredients: [{ id: 'sua_dac', qty: 1 }], output: 'ca_phe_sua_da', cycleSec: 2, outputCap: 6, footprint: MACHINE,
  },
  { kind: 'display', id: 'ke_pho', name: 'Kệ phở bò', item: 'pho_bo', cap: 8, footprint: SHELF },
  { kind: 'display', id: 'ke_ca_phe_den', name: 'Kệ cà phê đen', item: 'ca_phe_phin', cap: 10, footprint: SHELF },
  { kind: 'display', id: 'ke_ca_phe_sua', name: 'Kệ cà phê sữa đá', item: 'ca_phe_sua_da', cap: 10, footprint: SHELF },
];

export const STATIONS: Record<string, StationDef> = Object.fromEntries(list.map((d) => [d.id, d]));

export function getStationDef(id: string): StationDef {
  const def = STATIONS[id];
  if (!def) throw new Error(`Unknown station def: ${id}`);
  return def;
}
