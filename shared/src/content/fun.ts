import { K } from '../money';

/** Hằng số phần vui nhộn (tip, combo, đoàn khách, mèo, thời tiết, lễ, đập tay). */
export const FUN = {
  /** Phục vụ nhanh (≤ SCORE_FAST_SEC) thì khách boa: 10% hoá đơn; khách du lịch 25%. */
  TIP_RATE: 0.1,
  TOURIST_TIP_RATE: 0.25,
  /** Combo: mỗi mốc 5 khách nhanh liên tiếp thưởng 1K × độ dài combo (tối đa 30K). */
  COMBO_STEP: 5,
  COMBO_BONUS_PER: K(1),
  COMBO_BONUS_MAX: K(30),
  /** Đoàn khách du lịch: xác suất có trong ngày, số khách, cách nhau bao lâu xuống xe. */
  TOUR_CHANCE: 0.5,
  TOUR_SIZE: 10,
  TOUR_GAP_SEC: 0.7,
  /** Xe đỗ ít nhất bấy nhiêu giây; khách đầu tiên xuống sau khi xe dừng hẳn. */
  TOUR_BUS_SEC: 12,
  TOUR_FIRST_STEP_SEC: 3,
  TOURIST_WTP: 1.7,
  /** Mèo hoang ghé xin ăn (mỗi quán chưa có mèo), cho ăn = +3 lượt chấm 5 sao. */
  CAT_CHANCE: 0.35,
  CAT_FEED_DIST: 1.2,
  /** Trời mưa: khách đi bộ giảm, đơn online tăng. */
  RAIN_CHANCE: 0.25,
  RAIN_WALKIN: 0.7,
  RAIN_ONLINE: 1.5,
  /** Ngày lễ: khách tăng, tip gấp đôi. */
  FESTIVAL_EVERY_DAYS: 10,
  FESTIVAL_TRAFFIC: 1.5,
  FESTIVAL_TIP: 2,
  /** Đập tay: cửa sổ chờ người kia, khoảng cách, thời gian và mức tăng tốc. */
  HIFIVE_WINDOW: 1.5,
  HIFIVE_DIST: 1.5,
  HIFIVE_BOOST_SEC: 10,
  HIFIVE_SPEED: 1.25,
  EMOTE_SEC: 3,
  QUESTS_PER_DAY: 3,
} as const;

export const EMOTES: Record<string, { icon: string; text: string }> = {
  wave: { icon: '👋', text: 'Chào cả nhà!' },
  laugh: { icon: '😂', text: 'Haha!' },
  thumb: { icon: '👍', text: 'Tuyệt!' },
  help: { icon: '🆘', text: 'Giúp với!' },
  heart: { icon: '❤️', text: 'Yêu cả nhà!' },
};

export interface Festival {
  id: 'tet' | 'trung_thu' | 'noel' | 'quoc_khanh';
  icon: string;
  name: string;
  desc: string;
}

export const FESTIVALS: Festival[] = [
  { id: 'tet', icon: '🧧', name: 'Tết Nguyên Đán', desc: 'Câu đối đỏ, cây mai vàng, khách đi chơi Tết đông nghịt.' },
  { id: 'trung_thu', icon: '🏮', name: 'Tết Trung thu', desc: 'Lồng đèn ông sao, trẻ con rước đèn ghé quán.' },
  { id: 'noel', icon: '🎄', name: 'Giáng sinh', desc: 'Cây thông nhấp nháy, khách đi chơi đêm Noel.' },
  { id: 'quoc_khanh', icon: '🇻🇳', name: 'Quốc khánh 2/9', desc: 'Cờ đỏ sao vàng rợp phố, nghỉ lễ cả nhà đi ăn.' },
];

/** Lễ của một ngày trong game: cứ FESTIVAL_EVERY_DAYS ngày có một lễ, lần lượt theo danh sách. */
export function festivalOfDay(day: number): Festival | null {
  if (day <= 0 || day % FUN.FESTIVAL_EVERY_DAYS !== 0) return null;
  return FESTIVALS[(day / FUN.FESTIVAL_EVERY_DAYS - 1) % FESTIVALS.length];
}

export interface BadgeDef {
  id: string;
  icon: string;
  name: string;
  desc: string;
}

export const BADGES: BadgeDef[] = [
  { id: 'banh_mi_100', icon: '🥖', name: 'Trăm ổ bánh mì', desc: 'Bán tổng cộng 100 ổ bánh mì các loại' },
  { id: 'banh_mi_1000', icon: '🥇', name: 'Vua bánh mì', desc: 'Bán tổng cộng 1.000 ổ bánh mì các loại' },
  { id: 'khach_500', icon: '🧑‍🤝‍🧑', name: 'Quán quen của phố', desc: 'Phục vụ 500 khách' },
  { id: 'khach_5000', icon: '🏙️', name: 'Cả thành phố biết tiếng', desc: 'Phục vụ 5.000 khách' },
  { id: 'nam_sao', icon: '⭐', name: 'Ngày năm sao', desc: 'Kết thúc một ngày với 4,8 sao trở lên (từ 20 khách)' },
  { id: 'khong_ai_ve', icon: '🤝', name: 'Không ai phải về', desc: 'Một ngày từ 40 khách mà không khách nào bỏ về' },
  { id: 'combo_20', icon: '🔥', name: 'Tay nhanh như chớp', desc: 'Combo 20 khách phục vụ nhanh liên tiếp' },
  { id: 'tip_1m', icon: '💰', name: 'Khách thương', desc: 'Nhận tổng cộng 1.000K tiền boa' },
  { id: 'online_100', icon: '🛵', name: 'Shipper quen mặt', desc: 'Giao xong 100 đơn online' },
  { id: 'ba_quan', icon: '🏪', name: 'Chuỗi quán gia đình', desc: 'Có đủ 3 quán cùng lúc' },
  { id: 'chu_trang_trai', icon: '🚜', name: 'Chủ trang trại', desc: 'Mở rộng trang trại tối đa' },
  { id: 'trieu_phu', icon: '🤑', name: 'Đại gia phố ẩm thực', desc: 'Có 50.000K trong ví' },
  { id: 'meo_cung', icon: '🐱', name: 'Mèo cưng của quán', desc: 'Cho mèo hoang ăn để mèo ở lại quán' },
  { id: 'doan_khach', icon: '🚌', name: 'Điểm đến du lịch', desc: 'Đón một đoàn khách du lịch' },
  { id: 'kol', icon: '🌟', name: 'Lên sóng mạng xã hội', desc: 'Thuê KOL tới quay video ở quán' },
  { id: 'nhiem_vu_10', icon: '📋', name: 'Cả nhà chăm chỉ', desc: 'Hoàn thành 10 nhiệm vụ hằng ngày' },
];
