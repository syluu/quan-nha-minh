export type IngredientId = 'bot_mi' | 'trung' | 'thit_lon' | 'rau' | 'tra';
export type ItemId = 'banh_mi' | 'trung_op' | 'thit_nuong' | 'banh_mi_trung' | 'banh_mi_thit' | 'tra_da';
export type ShopId = 'banh_mi';

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
}
