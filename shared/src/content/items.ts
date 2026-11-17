import { K } from '../money';
import type { ItemDef, ItemId } from './ids';

export const ITEMS: Record<ItemId, ItemDef> = {
  banh_mi: { id: 'banh_mi', name: 'Bánh mì', sellable: true, basePrice: K(5), demandWeight: 1, color: 0xe0a458 },
  trung_op: { id: 'trung_op', name: 'Trứng ốp', sellable: false, basePrice: 0, demandWeight: 0, color: 0xfff4d6 },
  thit_nuong: { id: 'thit_nuong', name: 'Thịt nướng', sellable: true, basePrice: K(12), demandWeight: 0.5, color: 0x8a3b1a },
  banh_mi_trung: { id: 'banh_mi_trung', name: 'Bánh mì trứng', sellable: true, basePrice: K(15), demandWeight: 1.5, color: 0xf2c14e },
  banh_mi_thit: { id: 'banh_mi_thit', name: 'Bánh mì thịt', sellable: true, basePrice: K(25), demandWeight: 2, color: 0xc0603a },
  tra_da: { id: 'tra_da', name: 'Trà đá', sellable: true, basePrice: K(3), demandWeight: 1, color: 0xc8a050 },
};
