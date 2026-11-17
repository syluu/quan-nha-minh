import { K } from '../money';

export type CostumeSlot = 'hat' | 'shirt' | 'pants' | 'apron';
export type CostumeStyle =
  | 'non_la' | 'mu_luoi_trai' | 'mu_bao_hiem' | 'mu_dau_bep' | 'mu_phot'
  | 'ao_mau_rieng' | 'ao' | 'ao_dai'
  | 'quan'
  | 'khong' | 'tap_de' | 'tap_de_caro';

export interface CostumeDef {
  id: string;
  slot: CostumeSlot;
  name: string;
  /** Đồng; 0 = đồ mặc định, ai cũng có. */
  price: number;
  color: number;
  style: CostumeStyle;
}

const list: CostumeDef[] = [
  // Mũ
  { id: 'non_la', slot: 'hat', name: 'Nón lá', price: 0, color: 0xe8d08a, style: 'non_la' },
  { id: 'mu_luoi_trai_do', slot: 'hat', name: 'Mũ lưỡi trai đỏ', price: K(300), color: 0xc8452c, style: 'mu_luoi_trai' },
  { id: 'mu_luoi_trai_xanh', slot: 'hat', name: 'Mũ lưỡi trai xanh', price: K(300), color: 0x2f6db5, style: 'mu_luoi_trai' },
  { id: 'mu_bao_hiem_vang', slot: 'hat', name: 'Mũ bảo hiểm vàng', price: K(800), color: 0xf2c14e, style: 'mu_bao_hiem' },
  { id: 'mu_dau_bep', slot: 'hat', name: 'Mũ đầu bếp', price: K(1500), color: 0xffffff, style: 'mu_dau_bep' },
  { id: 'mu_phot', slot: 'hat', name: 'Mũ phớt', price: K(3000), color: 0x3b2a20, style: 'mu_phot' },
  // Áo
  { id: 'ao_mac_dinh', slot: 'shirt', name: 'Áo màu riêng', price: 0, color: 0, style: 'ao_mau_rieng' },
  { id: 'ao_trang', slot: 'shirt', name: 'Áo trắng', price: K(200), color: 0xf4f1ea, style: 'ao' },
  { id: 'ao_do', slot: 'shirt', name: 'Áo đỏ', price: K(200), color: 0xd23b2a, style: 'ao' },
  { id: 'ao_vang', slot: 'shirt', name: 'Áo vàng', price: K(200), color: 0xf2c14e, style: 'ao' },
  { id: 'ao_xanh_la', slot: 'shirt', name: 'Áo xanh lá', price: K(200), color: 0x4f9a43, style: 'ao' },
  { id: 'ao_hong', slot: 'shirt', name: 'Áo hồng', price: K(300), color: 0xf08fb0, style: 'ao' },
  { id: 'ao_den', slot: 'shirt', name: 'Áo đen', price: K(300), color: 0x2b2b2b, style: 'ao' },
  { id: 'ao_dai_do', slot: 'shirt', name: 'Áo dài đỏ', price: K(5000), color: 0xc0262d, style: 'ao_dai' },
  { id: 'ao_dai_xanh', slot: 'shirt', name: 'Áo dài xanh', price: K(5000), color: 0x2a7bc0, style: 'ao_dai' },
  // Quần
  { id: 'quan_nau', slot: 'pants', name: 'Quần nâu', price: 0, color: 0x4a3b30, style: 'quan' },
  { id: 'quan_den', slot: 'pants', name: 'Quần đen', price: K(200), color: 0x1f1f1f, style: 'quan' },
  { id: 'quan_jean', slot: 'pants', name: 'Quần jean', price: K(300), color: 0x3a5a8c, style: 'quan' },
  { id: 'quan_trang', slot: 'pants', name: 'Quần trắng', price: K(300), color: 0xf0ede4, style: 'quan' },
  // Tạp dề
  { id: 'khong_tap_de', slot: 'apron', name: 'Không đeo tạp dề', price: 0, color: 0, style: 'khong' },
  { id: 'tap_de_trang', slot: 'apron', name: 'Tạp dề trắng', price: K(400), color: 0xf4f1ea, style: 'tap_de' },
  { id: 'tap_de_do', slot: 'apron', name: 'Tạp dề đỏ', price: K(500), color: 0xc8452c, style: 'tap_de' },
  { id: 'tap_de_caro', slot: 'apron', name: 'Tạp dề kẻ caro', price: K(1000), color: 0xc8452c, style: 'tap_de_caro' },
];

export const COSTUMES: Record<string, CostumeDef> = Object.fromEntries(list.map((c) => [c.id, c]));
export const COSTUME_LIST: readonly CostumeDef[] = list;
export const COSTUME_SLOTS: CostumeSlot[] = ['hat', 'shirt', 'pants', 'apron'];

export type Outfit = Record<CostumeSlot, string>;
export const DEFAULT_OUTFIT: Outfit = { hat: 'non_la', shirt: 'ao_mac_dinh', pants: 'quan_nau', apron: 'khong_tap_de' };
