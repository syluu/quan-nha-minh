import type { IngredientId, ItemId, ShopId } from '../content';
import type { CampaignId, DaySummary, LogEntry, SeatState, Settlement, StaffRole, StationState } from '../sim/world';

export const MSG = {
  input: 'input',
  snapshot: 'snap',
  event: 'event',
  welcome: 'welcome',
  hire: 'hire',
  fire: 'fire',
  setPrice: 'setPrice',
  rename: 'rename',
  getReport: 'getReport',
  report: 'report',
  actionError: 'actionError',
  upgradePlayer: 'upgradePlayer',
  upgradeStaff: 'upgradeStaff',
  upgradeMachine: 'upgradeMachine',
  runCampaign: 'runCampaign',
  takeLoan: 'takeLoan',
  repayLoan: 'repayLoan',
  sellStation: 'sellStation',
  setOnlinePaused: 'setOnlinePaused',
  upgradePickup: 'upgradePickup',
  rentShop: 'rentShop',
  travel: 'travel',
  setMachineEnabled: 'setMachineEnabled',
} as const;

export interface RentShopMsg {
  shopId: ShopId;
}
export interface TravelMsg {
  to: ShopId;
}
export interface SetMachineEnabledMsg {
  instanceId: string;
  enabled: boolean;
}

export interface SetOnlinePausedMsg {
  paused: boolean;
}

export interface UpgradePlayerMsg {
  kind: 'carry' | 'speed';
}
export interface UpgradeStaffMsg {
  staffId: string;
}
export interface UpgradeMachineMsg {
  instanceId: string;
}
export interface RunCampaignMsg {
  campaign: CampaignId;
}
export interface TakeLoanMsg {
  amount: number;
  months: number;
  /** Có khi vay từ bảng kết toán: tháng đang kết toán. */
  forMonth?: number;
}
export interface RepayLoanMsg {
  loanId: string;
}
export interface SellStationMsg {
  /** Quán có máy cần bán (mặc định: quán đang đứng). */
  shopId?: ShopId;
  instanceId: string;
  forMonth?: number;
}

export interface HireMsg {
  role: StaffRole;
  item: ItemId | null;
}
export interface FireMsg {
  staffId: string;
}
export interface SetPriceMsg {
  item: ItemId;
  price: number;
}
export interface RenameMsg {
  name: string;
}
export interface ActionErrorMsg {
  error: string;
}
export interface Report {
  history: DaySummary[];
  /** Ngày đang chạy; lương = số nhân viên hiện có × lương ngày. */
  today: DaySummary;
  /** Các kỳ kết toán cuối tháng đã xong (mới nhất cuối). */
  months: Settlement[];
}

export interface JoinOptions {
  code: string;
  name: string;
  token: string;
}

export interface WelcomeMsg {
  playerId: string;
  code: string;
}

export interface InputMsg {
  mx: number;
  mz: number;
  /** true khi người chơi đang mở menu. */
  menu?: boolean;
}

export interface Snapshot {
  /** Quán người nhận đang đứng (mọi số liệu theo quán bên dưới là của quán này). */
  shopId: ShopId;
  /** Bản đồ: mọi quán/mặt bằng. */
  shops: { id: ShopId; name: string; kind: 'shop' | 'farm'; owned: boolean; complete: boolean; deposit: number; rentPerMonth: number }[];
  /** Kho tổng (nguyên liệu từ trang trại). */
  warehouse: Partial<Record<IngredientId, number>>;
  /** Mọi quán đang có đã mở hết → được thuê mặt bằng mới. */
  canRent: boolean;
  day: number;
  secOfDay: number;
  money: number;
  stars: number;
  players: {
    id: string; name: string; color: number; x: number; z: number; dir: number; carry: ItemId[]; online: boolean;
    cap: number;
    /** Tiến độ nhặt món tiếp theo, 0..1. */
    pick: number;
    pickAt: string | null;
    carryLevel: number;
    speedLevel: number;
    location: ShopId;
  }[];
  staff: {
    id: string; name: string; role: StaffRole; item: ItemId | null; x: number; z: number; dir: number; carry: ItemId[];
    level: number;
    wageOwed: number;
  }[];
  month: number;
  daysToMonthEnd: number;
  campaigns: { id: CampaignId; daysLeft: number }[];
  loans: { id: string; principal: number; remaining: number; installment: number; monthsLeft: number }[];
  maxLoan: number;
  settlement: Settlement | null;
  /** Máy bán được ở mọi quán đang có (chỉ có khi đang kết toán). instanceId 'mat_bang' = trả mặt bằng. */
  sellable: { shopId: ShopId; instanceId: string; refund: number }[];
  online: {
    registered: boolean;
    paused: boolean;
    vehicle: 'bike' | 'car';
    /** Đơn chưa có shipper nhận. */
    pending: number;
    shipper: {
      vehicle: 'bike' | 'car'; x: number; z: number; dir: number; state: 'arriving' | 'waiting' | 'leaving';
      needs: ItemId[]; waited: number; patience: number;
    } | null;
    ordersToday: number;
    cancelledToday: number;
  };
  prices: Partial<Record<ItemId, number>>;
  customers: { id: number; x: number; z: number; dir: number; holding: ItemId[]; sitting: boolean }[];
  stations: {
    instanceId: string;
    unlocked: boolean;
    outputCount: number;
    stock: number;
    inputs: Partial<Record<ItemId, number>>;
    blocked: StationState['blocked'];
    level: number;
    enabled: boolean;
    seats: SeatState[];
  }[];
  tiles: { instanceId: string; cost: number; paid: number; occupantSec: number }[];
  log: LogEntry[];
}
