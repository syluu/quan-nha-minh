import { K } from '../../money';
import type { ShopId } from '../ids';

export interface ShopMeta {
  name: string;
  /** Chữ trên biển hiệu. */
  sign: string;
  /** Tiền cọc khi thuê (đồng). Bánh mì = 0 (xe có sẵn). */
  deposit: number;
  /** Tiền thuê mỗi tháng, trả lúc kết toán. */
  rentPerMonth: number;
  hasTables: boolean;
  signColor: string;
}

export const SHOP_META: Record<ShopId, ShopMeta> = {
  banh_mi: { name: 'Xe bánh mì', sign: 'BÁNH MÌ NÓNG GIÒN', deposit: 0, rentPerMonth: 0, hasTables: false, signColor: '#c8452c' },
  com_tam: { name: 'Quán cơm tấm', sign: 'CƠM TẤM SƯỜN CHẢ', deposit: K(8000), rentPerMonth: K(4000), hasTables: true, signColor: '#2f6b3a' },
  pho_cafe: { name: 'Quán phở & cà phê', sign: 'PHỞ BÒ · CÀ PHÊ', deposit: K(12000), rentPerMonth: K(6000), hasTables: true, signColor: '#2b4c7e' },
};

export const SHOP_IDS: ShopId[] = ['banh_mi', 'com_tam', 'pho_cafe'];
