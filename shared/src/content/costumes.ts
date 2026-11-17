import { K } from '../money';

export type CostumeSlot = 'hat' | 'hair' | 'shirt' | 'pants' | 'apron';
export type CostumeStyle =
  // Mũ
  | 'khong_mu' | 'non_la' | 'mu_luoi_trai' | 'mu_bao_hiem' | 'mu_dau_bep' | 'mu_phot' | 'mu_len' | 'mu_coi' | 'mu_tai_beo'
  // Tóc
  | 'toc_ngan' | 'toc_dai' | 'toc_duoi_ngua' | 'toc_bui' | 'toc_hai_bim' | 'toc_xoan'
  // Áo (thân trên; váy liền che cả quần)
  | 'ao_mau_rieng' | 'ao_phong' | 'ao_ba_lo' | 'so_mi' | 'ao_khoac' | 'ao_dai' | 'vay_lien'
  // Quần / chân váy
  | 'quan_dai' | 'quan_jean' | 'quan_short' | 'chan_vay'
  // Tạp dề
  | 'khong' | 'tap_de' | 'tap_de_caro';

export interface CostumeDef {
  id: string;
  slot: CostumeSlot;
  name: string;
  /** Đồng; 0 = đồ mặc định, ai cũng có. */
  price: number;
  color: number;
  /** Kiểu dáng: quyết định hình khối khi mặc (không chỉ đổi màu). */
  style: CostumeStyle;
}

const list: CostumeDef[] = [
  // Mũ
  { id: 'khong_mu', slot: 'hat', name: 'Không đội mũ', price: 0, color: 0, style: 'khong_mu' },
  { id: 'non_la', slot: 'hat', name: 'Nón lá', price: 0, color: 0xe8d08a, style: 'non_la' },
  { id: 'mu_luoi_trai_do', slot: 'hat', name: 'Mũ lưỡi trai đỏ', price: K(300), color: 0xc8452c, style: 'mu_luoi_trai' },
  { id: 'mu_luoi_trai_xanh', slot: 'hat', name: 'Mũ lưỡi trai xanh', price: K(300), color: 0x2f6db5, style: 'mu_luoi_trai' },
  { id: 'mu_len_do', slot: 'hat', name: 'Mũ len có quả bông', price: K(300), color: 0xd23b2a, style: 'mu_len' },
  { id: 'mu_tai_beo', slot: 'hat', name: 'Mũ tai bèo', price: K(400), color: 0x7a8a4a, style: 'mu_tai_beo' },
  { id: 'mu_coi', slot: 'hat', name: 'Mũ cói rộng vành', price: K(600), color: 0xe6cf8f, style: 'mu_coi' },
  { id: 'mu_bao_hiem_vang', slot: 'hat', name: 'Mũ bảo hiểm vàng', price: K(800), color: 0xf2c14e, style: 'mu_bao_hiem' },
  { id: 'mu_dau_bep', slot: 'hat', name: 'Mũ đầu bếp', price: K(1500), color: 0xffffff, style: 'mu_dau_bep' },
  { id: 'mu_phot', slot: 'hat', name: 'Mũ phớt', price: K(3000), color: 0x3b2a20, style: 'mu_phot' },
  // Tóc
  { id: 'toc_ngan_den', slot: 'hair', name: 'Tóc ngắn đen', price: 0, color: 0x2b2118, style: 'toc_ngan' },
  { id: 'toc_ngan_nau', slot: 'hair', name: 'Tóc ngắn nâu', price: K(200), color: 0x6b4226, style: 'toc_ngan' },
  { id: 'toc_dai_den', slot: 'hair', name: 'Tóc dài đen', price: K(400), color: 0x2b2118, style: 'toc_dai' },
  { id: 'toc_dai_vang', slot: 'hair', name: 'Tóc dài nhuộm vàng', price: K(800), color: 0xd9a84a, style: 'toc_dai' },
  { id: 'toc_duoi_ngua', slot: 'hair', name: 'Tóc buộc đuôi ngựa', price: K(400), color: 0x3a2618, style: 'toc_duoi_ngua' },
  { id: 'toc_bui', slot: 'hair', name: 'Tóc búi', price: K(500), color: 0x2b2118, style: 'toc_bui' },
  { id: 'toc_hai_bim', slot: 'hair', name: 'Tóc tết hai bím', price: K(500), color: 0x4a2c1a, style: 'toc_hai_bim' },
  { id: 'toc_xoan', slot: 'hair', name: 'Tóc xoăn', price: K(600), color: 0x5a3a22, style: 'toc_xoan' },
  // Áo
  { id: 'ao_mac_dinh', slot: 'shirt', name: 'Áo phông màu riêng', price: 0, color: 0, style: 'ao_mau_rieng' },
  { id: 'ao_do', slot: 'shirt', name: 'Áo phông đỏ', price: K(200), color: 0xd23b2a, style: 'ao_phong' },
  { id: 'ao_den', slot: 'shirt', name: 'Áo phông đen', price: K(200), color: 0x2b2b2b, style: 'ao_phong' },
  { id: 'ao_vang', slot: 'shirt', name: 'Áo ba lỗ vàng', price: K(200), color: 0xf2c14e, style: 'ao_ba_lo' },
  { id: 'ao_trang', slot: 'shirt', name: 'Áo sơ mi trắng', price: K(300), color: 0xf4f1ea, style: 'so_mi' },
  { id: 'so_mi_xanh', slot: 'shirt', name: 'Áo sơ mi xanh', price: K(300), color: 0x7fb3d5, style: 'so_mi' },
  { id: 'ao_xanh_la', slot: 'shirt', name: 'Áo khoác có mũ xanh lá', price: K(800), color: 0x4f9a43, style: 'ao_khoac' },
  { id: 'ao_khoac_xam', slot: 'shirt', name: 'Áo khoác có mũ xám', price: K(800), color: 0x8a8f96, style: 'ao_khoac' },
  { id: 'ao_hong', slot: 'shirt', name: 'Váy liền hồng', price: K(1200), color: 0xf08fb0, style: 'vay_lien' },
  { id: 'vay_vang', slot: 'shirt', name: 'Váy liền vàng', price: K(1500), color: 0xf2c94e, style: 'vay_lien' },
  { id: 'ao_dai_do', slot: 'shirt', name: 'Áo dài đỏ', price: K(5000), color: 0xc0262d, style: 'ao_dai' },
  { id: 'ao_dai_xanh', slot: 'shirt', name: 'Áo dài xanh', price: K(5000), color: 0x2a7bc0, style: 'ao_dai' },
  { id: 'ao_dai_trang', slot: 'shirt', name: 'Áo dài trắng', price: K(5000), color: 0xf7f5ef, style: 'ao_dai' },
  // Quần / chân váy
  { id: 'quan_nau', slot: 'pants', name: 'Quần dài nâu', price: 0, color: 0x4a3b30, style: 'quan_dai' },
  { id: 'quan_den', slot: 'pants', name: 'Quần tây đen', price: K(200), color: 0x1f1f1f, style: 'quan_dai' },
  { id: 'quan_trang', slot: 'pants', name: 'Quần dài trắng', price: K(300), color: 0xf0ede4, style: 'quan_dai' },
  { id: 'quan_jean', slot: 'pants', name: 'Quần jean', price: K(300), color: 0x3a5a8c, style: 'quan_jean' },
  { id: 'quan_short_jean', slot: 'pants', name: 'Quần short jean', price: K(300), color: 0x4a6a9c, style: 'quan_short' },
  { id: 'quan_short_kaki', slot: 'pants', name: 'Quần short kaki', price: K(250), color: 0xc2a878, style: 'quan_short' },
  { id: 'chan_vay_do', slot: 'pants', name: 'Chân váy đỏ', price: K(500), color: 0xc8452c, style: 'chan_vay' },
  { id: 'chan_vay_den', slot: 'pants', name: 'Chân váy đen', price: K(500), color: 0x2b2b2b, style: 'chan_vay' },
  // Tạp dề
  { id: 'khong_tap_de', slot: 'apron', name: 'Không đeo tạp dề', price: 0, color: 0, style: 'khong' },
  { id: 'tap_de_trang', slot: 'apron', name: 'Tạp dề trắng', price: K(400), color: 0xf4f1ea, style: 'tap_de' },
  { id: 'tap_de_do', slot: 'apron', name: 'Tạp dề đỏ', price: K(500), color: 0xc8452c, style: 'tap_de' },
  { id: 'tap_de_caro', slot: 'apron', name: 'Tạp dề kẻ caro', price: K(1000), color: 0xc8452c, style: 'tap_de_caro' },
];

export const COSTUMES: Record<string, CostumeDef> = Object.fromEntries(list.map((c) => [c.id, c]));
export const COSTUME_LIST: readonly CostumeDef[] = list;
export const COSTUME_SLOTS: CostumeSlot[] = ['hat', 'hair', 'shirt', 'pants', 'apron'];

export type Outfit = Record<CostumeSlot, string>;
export const DEFAULT_OUTFIT: Outfit = { hat: 'non_la', hair: 'toc_ngan_den', shirt: 'ao_mac_dinh', pants: 'quan_nau', apron: 'khong_tap_de' };
