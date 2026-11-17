import { K } from '../money';

/** Mọi hằng số cân bằng gameplay. Chỉnh ở đây sau khi chơi thử. */
export const BALANCE = {
  START_MONEY: K(5000),
  DAY_REAL_SEC: 360,
  OPEN_HOUR: 6,
  CLOSE_HOUR: 22,
  LAST_SPAWN_HOUR: 21.5,

  PLAYER_SPEED: 3.2,
  PLAYER_RADIUS: 0.3,
  PLAYER_CARRY: 4,
  INTERACT_DIST: 0.6,
  /** Vùng đứng thu ngân rộng hơn để dễ đứng trúng (có ô vàng vẽ trên sàn). */
  CASHIER_DIST: 1.0,
  /** Nhặt từ máy: 0,45 s/món để lấy đúng số món mong muốn. */
  PICK_INTERVAL: 0.45,
  /** Đặt lên kệ/bàn ghép hoặc bỏ thùng rác: 0,2 s/món. */
  DROP_INTERVAL: 0.2,
  /** Độ dài input dưới ngưỡng này coi là đứng yên. */
  STILL_INPUT: 0.05,

  CUSTOMER_SPEED: 2.0,
  MAX_CUSTOMERS: 20,
  WTP_MIN: 0.8,
  WTP_MAX: 1.3,
  ITEMS_PER_CUSTOMER_WEIGHTS: [0.6, 0.3, 0.1],
  PATIENCE_SEC: 40,
  CASHIER_SERVICE_SEC: 1.0,
  QUEUE_SPACING: 0.8,

  /** Nhân viên mới xuất hiện ở giữa lối bếp. */
  STAFF_DOOR: { x: 0, z: -1.85 },
  STAFF_NAMES: ['Lan', 'Hùng', 'Mai', 'Tuấn', 'Hoa', 'Nam', 'Thảo', 'Dũng'],
  /** Cấp nhân viên 1–4: tốc độ (người chơi chưa nâng = 3.2), mang tối đa, lương/ngày, phí đào tạo để lên cấp này. */
  STAFF_LEVELS: [
    { speed: 2.24, carry: 3, wage: K(120), train: 0 },
    { speed: 2.56, carry: 4, wage: K(150), train: K(500) },
    { speed: 2.88, carry: 5, wage: K(180), train: K(800) },
    { speed: 3.2, carry: 6, wage: K(210), train: K(1300) },
  ],
  /** 1 tháng trong game = 7 ngày (≈ 42 phút chơi). Cuối tháng kết toán lương, nợ, mặt bằng. */
  MONTH_DAYS: 7,

  PLAYER_CARRY_CAPS: [4, 6, 8, 10, 12],
  PLAYER_CARRY_COSTS: [K(300), K(500), K(800), K(1300)],
  /** Mỗi cấp tốc độ +10% (5 cấp). */
  PLAYER_SPEED_STEP: 0.1,
  PLAYER_SPEED_COSTS: [K(200), K(320), K(500), K(800), K(1300)],

  MACHINE_MAX_LEVEL: 3,
  MACHINE_CYCLE_FACTOR: 0.85,
  MACHINE_CAP_BONUS: 0.5,
  /** Giá trị máy có sẵn từ đầu (để tính tài sản, giá nâng cấp). */
  STARTER_VALUES: { lo_banh_mi: K(3000), ke_banh_mi: K(500), thu_ngan: K(500), thung_rac: 0 } as Record<string, number>,

  CAMPAIGNS: {
    to_roi: { name: 'Phát tờ rơi', cost: K(200), boost: 0.2, days: 1, starBonus: 0 },
    mxh: { name: 'Quảng cáo mạng xã hội', cost: K(1000), boost: 0.5, days: 3, starBonus: 0 },
    review: { name: 'Mời người review đồ ăn', cost: K(5000), boost: 1.0, days: 2, starBonus: 0.3 },
  },

  /** Kỳ hạn (tháng) → tổng lãi. */
  LOAN_TERMS: { 1: 0.05, 2: 0.09, 4: 0.15 } as Record<number, number>,
  LOAN_MIN_CAP: K(2000),
  LOAN_ASSET_RATIO: 0.5,
  LOAN_STEP: K(100),
  LOAN_MIN: K(500),
  /** Bán online qua app giao đồ ăn. */
  ONLINE: {
    commission: 0.2,
    baseIntervalSec: 20,
    maxPending: 6,
    lastOrderHour: 21.5,
    bike: { patience: 60, batch: 1, speed: 4 },
    car: { patience: 90, batchMin: 2, batchMax: 5, waitOldest: 30, speed: 5 },
    carUpgradeCost: K(5000),
  },

  /** Bán máy thu về 50% (giá trị + tiền đã nâng cấp). */
  SELL_RATIO: 0.5,
  /** Số ngày giữ trong báo cáo. */
  HISTORY_DAYS: 30,

  RATING_WINDOW: 50,
  DEFAULT_STARS: 3,
  STAR_MULT: [
    [1, 0.5],
    [2, 0.75],
    [3, 1.0],
    [4, 1.35],
    [5, 1.8],
  ] as [number, number][],
  SCORE_FAST_SEC: 10,
  SCORE_OK_SEC: 20,
  SCORE_PRICEY: 3,
  SCORE_ABANDON: 1,

  PAY_TILE_DELAY_SEC: 2,
  PAY_TILE_DRAIN_SEC: 1.5,
  PAY_TILE_RADIUS: 0.7,

  TICK_HZ: 20,
  SNAPSHOT_HZ: 10,
  MAX_TICK_DT: 1.0,
  SUBSTEP_DT: 0.05,
  AUTOSAVE_SEC: 30,
  RECONNECT_SEC: 20,
  MAX_PLAYERS: 4,
} as const;
