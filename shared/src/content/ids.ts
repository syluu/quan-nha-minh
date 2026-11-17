export type IngredientId = 'bot_mi' | 'trung' | 'thit_lon' | 'rau' | 'tra' | 'gao' | 'xuong_bo' | 'thit_bo' | 'ca_phe' | 'sua_dac';
export type ItemId =
  | 'banh_mi' | 'trung_op' | 'thit_nuong' | 'banh_mi_trung' | 'banh_mi_thit' | 'tra_da'
  | 'com' | 'suon_nuong' | 'cha_trung' | 'com_tam_suon' | 'com_tam_suon_cha'
  | 'nuoc_dung' | 'banh_pho' | 'bo_tai' | 'pho_bo' | 'ca_phe_phin' | 'ca_phe_sua_da'
  | 'thung_rau' | 'bao_bot_mi' | 'bao_gao' | 'khay_trung' | 'thung_thit_lon' | 'thung_thit_bo';
export type ShopId = 'banh_mi' | 'com_tam' | 'pho_cafe' | 'farm';

export interface IngredientDef {
  id: IngredientId;
  name: string;
  /** Giá chợ cho 1 đơn vị, tính bằng đồng. */
  marketPrice: number;
}

export interface ItemDef {
  id: ItemId;
  name: string;
  sellable: boolean;
  /** Giá thị trường (đồng). 0 nếu không bán. */
  basePrice: number;
  demandWeight: number;
  color: number;
  /** Thùng hàng trang trại: bốc lên xe → các nguyên liệu này vào kho tổng. */
  bundle?: { id: IngredientId; qty: number }[];
}
