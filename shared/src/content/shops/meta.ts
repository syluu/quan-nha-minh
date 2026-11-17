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
  /** 'shop' có khách, giá bán, quảng cáo…; 'farm' chỉ sản xuất cho kho tổng. */
  kind: 'shop' | 'farm';
  /** Tiền thuê mỗi lô đã mở / tháng (chỉ trang trại). */
  plotRent: number;
}

export const SHOP_META: Record<ShopId, ShopMeta> = {
  banh_mi: { name: 'Xe bánh mì', sign: 'BÁNH MÌ NÓNG GIÒN', deposit: 0, rentPerMonth: 0, hasTables: false, signColor: '#c8452c', kind: 'shop', plotRent: 0 },
  com_tam: { name: 'Quán cơm tấm', sign: 'CƠM TẤM SƯỜN CHẢ', deposit: K(8000), rentPerMonth: K(4000), hasTables: true, signColor: '#2f6b3a', kind: 'shop', plotRent: 0 },
  pho_cafe: { name: 'Quán phở & cà phê', sign: 'PHỞ BÒ · CÀ PHÊ', deposit: K(12000), rentPerMonth: K(6000), hasTables: true, signColor: '#2b4c7e', kind: 'shop', plotRent: 0 },
  farm: {
    name: 'Trang trại', sign: 'TRANG TRẠI NHÀ MÌNH', deposit: K(5000), rentPerMonth: K(1500), hasTables: false, signColor: '#5a7a2a',
    kind: 'farm', plotRent: K(300),
  },
};

export const isFarm = (id: ShopId) => SHOP_META[id].kind === 'farm';

export const SHOP_IDS: ShopId[] = ['banh_mi', 'com_tam', 'pho_cafe', 'farm'];
