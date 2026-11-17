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

  /** Lương mỗi nhân viên mỗi ngày. */
  WAGE: K(300),
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
