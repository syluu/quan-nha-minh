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
  STARTER_VALUES: {
    lo_banh_mi: K(3000), ke_banh_mi: K(500), thu_ngan: K(500), thung_rac: 0,
    noi_com: K(2000), lo_suon: K(2000), ban_com_tam_suon: K(2000), ke_com_tam_suon: K(500),
    noi_nuoc_dung: K(2500), may_banh_pho: K(2000), thot_bo: K(2000), ban_pho: K(2500), ke_pho: K(500),
    ruong_rau: K(1000), xe_cho_hang: K(2000),
  } as Record<string, number>,

  /**
   * Quảng cáo ngắn ngày (theo quán): boost = tăng khách tại quán, onlineBoost = tăng đơn app giao đồ ăn,
   * starBonus = cộng sao hiển thị trong thời gian chạy. Chạy lại khi đang chạy = gia hạn thêm ngày.
   */
  CAMPAIGNS: {
    to_roi: { icon: '📄', name: 'Phát tờ rơi', cost: K(200), boost: 0.2, onlineBoost: 0, days: 1, starBonus: 0, desc: 'Phát tờ rơi ở ngã tư, chợ gần quán.' },
    bang_ron: { icon: '🎌', name: 'Treo băng rôn khuyến mãi', cost: K(400), boost: 0.3, onlineBoost: 0, days: 3, starBonus: 0, desc: 'Băng rôn "Khai trương — giảm giá" trước cửa.' },
    xe_loa: { icon: '📢', name: 'Thuê xe loa chạy quanh phố', cost: K(600), boost: 0.45, onlineBoost: 0, days: 1, starBonus: 0, desc: 'Xe loa đọc quảng cáo khắp phường cả ngày.' },
    an_thu: { icon: '🍽️', name: 'Mời ăn thử miễn phí', cost: K(800), boost: 0.35, onlineBoost: 0, days: 2, starBonus: 0.2, desc: 'Bàn ăn thử trước cửa, khách quen kéo khách mới.' },
    mxh: { icon: '📱', name: 'Quảng cáo mạng xã hội', cost: K(1000), boost: 0.5, onlineBoost: 0.3, days: 3, starBonus: 0, desc: 'Chạy quảng cáo trên mạng xã hội quanh khu vực.' },
    app_top: { icon: '🛵', name: 'Đẩy quán lên đầu app giao đồ ăn', cost: K(1500), boost: 0, onlineBoost: 1.0, days: 3, starBonus: 0, desc: 'Quán hiện đầu danh sách trên app — đơn online tăng mạnh.' },
    livestream: { icon: '🎥', name: 'Livestream bán hàng', cost: K(2000), boost: 0.4, onlineBoost: 0.8, days: 1, starBonus: 0, desc: 'Phát trực tiếp cảnh làm món, chốt đơn ngay trên live.' },
    review: { icon: '⭐', name: 'Mời người review đồ ăn', cost: K(5000), boost: 1.0, onlineBoost: 0.3, days: 2, starBonus: 0.3, desc: 'Một người review ẩm thực tới ăn và đăng bài.' },
    bao_chi: { icon: '📰', name: 'Lên báo ẩm thực', cost: K(8000), boost: 0.8, onlineBoost: 0.3, days: 5, starBonus: 0.3, desc: 'Bài viết giới thiệu quán trên trang ẩm thực.' },
    kol: { icon: '🌟', name: 'Thuê KOL / TikToker nổi tiếng review', cost: K(15000), boost: 2.0, onlineBoost: 1.0, days: 3, starBonus: 0.5, desc: 'Người nổi tiếng quay video ăn tại quán — khách xếp hàng dài.' },
  },
  /** Đầu tư quảng cáo lâu dài (theo quán): mua một lần, tác dụng mãi (mất khi trả mặt bằng / phá sản). */
  ADS: {
    ghim_ban_do: { icon: '📍', name: 'Ghim quán lên bản đồ online + ảnh đẹp', cost: K(500), boost: 0.08, onlineBoost: 0.1, starBonus: 0, desc: 'Khách tìm "quán ăn gần đây" là thấy quán.' },
    den_long: { icon: '🏮', name: 'Đèn lồng, trang trí mặt tiền', cost: K(1200), boost: 0.08, onlineBoost: 0, starBonus: 0, desc: 'Mặt tiền rực rỡ, người đi đường dễ để ý.' },
    the_tich_diem: { icon: '💳', name: 'Thẻ tích điểm khách quen', cost: K(2000), boost: 0.1, onlineBoost: 0, starBonus: 0.1, desc: 'Ăn đủ 10 lần tặng 1 phần — khách quay lại nhiều hơn.' },
    bien_led: { icon: '💡', name: 'Biển quảng cáo LED chữ chạy', cost: K(3000), boost: 0.15, onlineBoost: 0, starBonus: 0, desc: 'Biển LED sáng rực trước quán, chạy chữ tên món và khuyến mãi.' },
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

  /** Bán nguyên liệu dư trong kho tổng ra chợ: đúng bằng giá chợ (giá mình mua nguyên liệu ở chợ). */
  WAREHOUSE_SELL_RATIO: 1,
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

  /** Bàn ăn (quán có bàn): tỉ lệ khách muốn ngồi, thời gian ăn, dọn 1 chỗ; mang về vì hết chỗ → tối đa 4 sao. */
  DINE_IN_CHANCE: 0.6,
  EAT_SEC: 20,
  CLEAN_SEC: 0.5,
  TAKEAWAY_MAX_SCORE: 4,
  /** Phí chở hàng từ kho tổng tới mỗi quán, mỗi sáng (khi có trang trại và kho còn hàng). */
  DELIVERY_FEE_PER_SHOP: K(50),
  /** Mở rộng trang trại: giá từng lần (mỗi lần thêm 4 lô đất trống). */
  FARM_EXPANSION_COSTS: [K(3000), K(5000), K(8000)],
  FARMHANDS_MAX: 2,

  PAY_TILE_DELAY_SEC: 2,
  PAY_TILE_DRAIN_SEC: 1.5,
  PAY_TILE_RADIUS: 0.7,

  /** Lối đi sang quán khác / trang trại: đứng yên trên ô bao lâu thì sang, bán kính ô, khoảng cách giữa các ô. */
  PORTAL_SEC: 1,
  PORTAL_RADIUS: 0.6,
  PORTAL_SPACING: 1.5,

  TICK_HZ: 20,
  SNAPSHOT_HZ: 10,
  MAX_TICK_DT: 1.0,
  SUBSTEP_DT: 0.05,
  AUTOSAVE_SEC: 30,
  RECONNECT_SEC: 20,
  MAX_PLAYERS: 4,
} as const;
