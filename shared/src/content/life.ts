import { K } from '../money';

/** Hằng số "quán có hồn": sức nhân viên, khách quen, đơn đặt tiệc, quán lên đời. */
export const LIFE = {
  /** Sức nhân viên 0–100: làm liên tục thì tụt, rảnh thì hồi. */
  ENERGY_MAX: 100,
  /** Mỗi giây làm việc mất bấy nhiêu sức (≈ 2,5 phút làm liền tay là đuối). */
  ENERGY_DRAIN: 0.6,
  /** Mỗi giây đứng rảnh hồi bấy nhiêu sức. */
  ENERGY_RECOVER: 2,
  /** Dưới mức này là mệt (đi chậm), dưới nữa là kiệt sức (rất chậm). */
  TIRED: 35,
  EXHAUSTED: 12,
  TIRED_SPEED: 0.8,
  EXHAUSTED_SPEED: 0.6,
  /** Mời trà đá: hồi đầy sức + hăng hái một lúc (đi nhanh hơn). */
  TEA_COST: K(10),
  CHEER_SEC: 30,
  CHEER_SPEED: 1.2,

  /** Khách quen: mỗi quán tối đa 3 người, cứ 2 ngày có thêm một người. */
  REGULARS_PER_SHOP: 3,
  REGULAR_EVERY_DAYS: 2,
  /** Tình cảm (0–100): +khi được phục vụ món ruột, +thêm khi nhanh; −khi phải bỏ về hoặc giá quá cao. */
  LOVE_SERVED: 5,
  LOVE_FAST: 4,
  LOVE_LOST: -12,
  LOVE_PRICEY: -6,
  /** Mốc: khách quen (dẫn bạn tới), khách ruột (boa gấp đôi, tặng quà). */
  LOVE_QUEN: 30,
  LOVE_RUOT: 70,
  FRIEND_CHANCE: 0.5,
  GIFT_CHANCE: 0.35,
  GIFT_RATINGS: 3,

  /** Đơn đặt tiệc: có từ ngày 3, quán phải mở điểm giao; trả 150% giá bán nếu giao đủ trước giờ hẹn. */
  PARTY_FROM_DAY: 3,
  PARTY_CHANCE: 0.45,
  PARTY_BONUS: 1.5,
  /** Phải nhận đơn trong bấy nhiêu giây kể từ lúc có đơn (≈ 2 tiếng trong game). */
  PARTY_OFFER_SEC: 45,
  /** Giờ hẹn giao (giờ trong game). */
  PARTY_DUE_HOURS: [11, 12, 14, 15, 17] as readonly number[],
  PARTY_QTY: [12, 16, 20, 24] as readonly number[],

  /** Quán lên đời: mỗi cấp thêm 5% khách đi bộ. */
  TIER_TRAFFIC: 0.05,
} as const;

export interface RegularDef {
  id: string;
  name: string;
  /** Câu chào khi tới quán. */
  hi: string;
  /** Màu áo (để nhận ra người quen). */
  color: number;
}

export const REGULARS: RegularDef[] = [
  { id: 'co_ba', name: 'Cô Ba vé số', hi: 'Như mọi khi nha con!', color: 0xc0392b },
  { id: 'anh_tu', name: 'Anh Tư xe ôm', hi: 'Cho anh phần quen nha!', color: 0x27ae60 },
  { id: 'be_na', name: 'Bé Na', hi: 'Con chào cô chú ạ!', color: 0xff7ac8 },
  { id: 'ong_sau', name: 'Ông Sáu', hi: 'Ông lấy món cũ nhé.', color: 0x8e6e53 },
  { id: 'chi_hai', name: 'Chị Hai văn phòng', hi: 'Nhanh giúp chị nha, sắp trễ làm!', color: 0x2f6db5 },
  { id: 'chu_bay', name: 'Chú Bảy bảo vệ', hi: 'Hôm nay đông dữ ha!', color: 0x34495e },
  { id: 'ut', name: 'Út sinh viên', hi: 'Cuối tháng rồi, ủng hộ quán nè 😅', color: 0xf39c12 },
  { id: 'ba_nam', name: 'Bà Năm', hi: 'Bà ghé ủng hộ nè!', color: 0x8e44ad },
  { id: 'anh_long', name: 'Anh Long shipper', hi: 'Ăn lẹ còn chạy đơn!', color: 0x16a085 },
];

export const GIFTS = ['giỏ trái cây', 'chục trứng gà quê', 'bó hoa', 'hộp bánh pía', 'chai mắm nhà làm', 'túi xoài cát'];

export interface PartyDef {
  id: string;
  name: string;
  icon: string;
}

export const PARTIES: PartyDef[] = [
  { id: 'cuoi', name: 'Tiệc cưới nhà bên', icon: '💒' },
  { id: 'sinh_nhat', name: 'Sinh nhật bé Bin', icon: '🎂' },
  { id: 'cong_ty', name: 'Công ty đặt liên hoan', icon: '🏢' },
  { id: 'tan_gia', name: 'Tiệc tân gia', icon: '🏡' },
  { id: 'hop_lop', name: 'Họp lớp cũ', icon: '🎓' },
  { id: 'dam_gio', name: 'Đám giỗ ông nội', icon: '🪷' },
];

export interface ShopTier {
  name: string;
  icon: string;
  /** Tổng doanh thu cộng dồn của quán để lên cấp này. */
  min: number;
}

export const SHOP_TIERS: ShopTier[] = [
  { name: 'Quán cóc', icon: '🪑', min: 0 },
  { name: 'Quán khang trang', icon: '🏠', min: K(3000) },
  { name: 'Quán nổi tiếng', icon: '⭐', min: K(15000) },
  { name: 'Nhà hàng', icon: '🏮', min: K(50000) },
];

export function tierOf(earned: number): number {
  let t = 0;
  for (let i = 0; i < SHOP_TIERS.length; i++) if (earned >= SHOP_TIERS[i].min) t = i;
  return t;
}
