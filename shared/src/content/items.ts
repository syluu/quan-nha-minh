import { K } from '../money';
import type { ItemDef, ItemId } from './ids';

export const ITEMS: Record<ItemId, ItemDef> = {
  banh_mi: { id: 'banh_mi', name: 'Bánh mì', sellable: true, basePrice: K(5), demandWeight: 1, color: 0xe0a458 },
  trung_op: { id: 'trung_op', name: 'Trứng ốp', sellable: false, basePrice: 0, demandWeight: 0, color: 0xfff4d6 },
  thit_nuong: { id: 'thit_nuong', name: 'Thịt nướng', sellable: true, basePrice: K(12), demandWeight: 0.5, color: 0x8a3b1a },
  banh_mi_trung: { id: 'banh_mi_trung', name: 'Bánh mì trứng', sellable: true, basePrice: K(15), demandWeight: 1.5, color: 0xf2c14e },
  banh_mi_thit: { id: 'banh_mi_thit', name: 'Bánh mì thịt', sellable: true, basePrice: K(25), demandWeight: 2, color: 0xc0603a },
  tra_da: { id: 'tra_da', name: 'Trà đá', sellable: true, basePrice: K(3), demandWeight: 1, color: 0xc8a050 },
  com: { id: 'com', name: 'Cơm tấm', sellable: false, basePrice: 0, demandWeight: 0, color: 0xf7f3e8 },
  suon_nuong: { id: 'suon_nuong', name: 'Sườn nướng', sellable: false, basePrice: 0, demandWeight: 0, color: 0x9a4a22 },
  cha_trung: { id: 'cha_trung', name: 'Chả trứng', sellable: false, basePrice: 0, demandWeight: 0, color: 0xe8b84a },
  com_tam_suon: { id: 'com_tam_suon', name: 'Cơm tấm sườn', sellable: true, basePrice: K(35), demandWeight: 2, color: 0xd98a4a },
  com_tam_suon_cha: { id: 'com_tam_suon_cha', name: 'Cơm tấm sườn chả', sellable: true, basePrice: K(45), demandWeight: 1.5, color: 0xc96f35 },
  nuoc_dung: { id: 'nuoc_dung', name: 'Nước dùng', sellable: false, basePrice: 0, demandWeight: 0, color: 0xc9a26a },
  banh_pho: { id: 'banh_pho', name: 'Bánh phở', sellable: false, basePrice: 0, demandWeight: 0, color: 0xfaf6ee },
  bo_tai: { id: 'bo_tai', name: 'Bò tái', sellable: false, basePrice: 0, demandWeight: 0, color: 0xb84a4a },
  pho_bo: { id: 'pho_bo', name: 'Phở bò', sellable: true, basePrice: K(50), demandWeight: 2, color: 0xe2b66a },
  ca_phe_phin: { id: 'ca_phe_phin', name: 'Cà phê đen', sellable: true, basePrice: K(15), demandWeight: 1, color: 0x3b2416 },
  ca_phe_sua_da: { id: 'ca_phe_sua_da', name: 'Cà phê sữa đá', sellable: true, basePrice: K(25), demandWeight: 1.5, color: 0x8a5a3a },
};
