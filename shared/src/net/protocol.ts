import type { IngredientId, ItemId, Outfit, ShopId } from '../content';
import type { AdId, CampaignId, DaySummary, LogEntry, SeatState, Settlement, StaffRole, StationState } from '../sim/world';

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
  buyCostume: 'buyCostume',
  buyAd: 'buyAd',
  buyFarmExpansion: 'buyFarmExpansion',
  emote: 'emote',
  highFive: 'highFive',
  setPlotCrop: 'setPlotCrop',
  sellWarehouse: 'sellWarehouse',
  wearCostume: 'wearCostume',
  treatStaff: 'treatStaff',
  acceptParty: 'acceptParty',
  declineParty: 'declineParty',
} as const;

export interface TreatStaffMsg {
  staffId: string;
}

export interface EmoteMsg {
  kind: string;
}
export interface SetPlotCropMsg {
  instanceId: string;
  crop: string;
}
export interface BuyAdMsg {
  ad: AdId;
}
export interface SellWarehouseMsg {
  ingredient: IngredientId;
  qty: number | 'all';
}
export interface CostumeMsg {
  id: string;
}

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
  /** Trang trại: số lần đã mở rộng và từng lô đang trồng gì (xem/chọn được ở mọi nơi). */
  farm: {
    owned: boolean;
    level: number;
    plots: { instanceId: string; unlocked: boolean; crop: string | null; nextCrop: string | null; outputCount: number; running: boolean; enabled: boolean; expansion: number }[];
  };
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
    outfit: Outfit;
    wardrobe: string[];
    /** Biểu cảm đang hiện (id trong EMOTES, hoặc 'hifive' / 'hifive_ok'). */
    emote: string | null;
    /** Đang được tăng tốc sau khi đập tay. */
    boost: boolean;
  }[];
  /** Phần vui nhộn của quán đang đứng + của cả thế giới. */
  fun: {
    combo: number;
    cat: 'none' | 'stray' | 'pet';
    catSpot: { x: number; z: number };
    tourBus: boolean;
    /** Chỗ xe du lịch đỗ (sát lề đường trước quán). */
    busSpot: { x: number; z: number };
    weather: 'sun' | 'rain';
    festival: { id: string; icon: string; name: string } | null;
    quests: { text: string; progress: number; target: number; reward: number; done: boolean; failed: boolean; kind: string }[];
    badges: string[];
    /** Thành tích hôm nay từng người (bảng vinh danh). */
    today: { name: string; placed: number; served: number; cleaned: number; crates: number }[];
  };
  staff: {
    id: string; name: string; role: StaffRole; item: ItemId | null; x: number; z: number; dir: number; carry: ItemId[];
    level: number;
    wageOwed: number;
    /** Sức 0–100 (mệt thì đi chậm) và đang hăng hái sau ly trà đá. */
    energy: number;
    cheer: boolean;
    /** Hết sức, đang nghỉ: còn bao nhiêu giây (0 = không nghỉ). */
    rest: number;
    /** Thu ngân: không biết mệt. */
    tireless: boolean;
  }[];
  /** Trộm / người say xỉn đang trong quán (null = không có). */
  intruder: {
    kind: 'thief' | 'drunk'; name: string; x: number; z: number; dir: number; state: 'toShelf' | 'grabbing' | 'leaving' | 'caught';
    stolen: ItemId[]; value: number;
  } | null;
  /** Quán có hồn: cấp quán, khách quen, đơn đặt tiệc. */
  life: {
    tier: number;
    earned: number;
    /** Doanh thu cộng dồn cần để lên cấp sau (null = cấp cao nhất). */
    nextTierAt: number | null;
    regulars: { id: string; shopId: ShopId; fav: ItemId; love: number; visits: number }[];
    party: {
      kind: string; shopId: ShopId; item: ItemId; qty: number; delivered: number; dueSec: number; offerUntil: number; reward: number;
      state: 'offer' | 'active' | 'done' | 'failed' | 'declined';
      endSec?: number;
    } | null;
  };
  month: number;
  daysToMonthEnd: number;
  campaigns: { id: CampaignId; daysLeft: number }[];
  /** Quảng cáo lâu dài của quán đang đứng. */
  ads: AdId[];
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
  customers: {
    id: number; x: number; z: number; dir: number; holding: ItemId[]; sitting: boolean; mood: string | null; tourist: boolean;
    /** Khách quen (id trong REGULARS). */
    regular: string | null;
    /** Đang ăn: đã ăn được bao nhiêu (0..1). */
    eat: number;
  }[];
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
    /** Lô trang trại: giống đang trồng (null = đất trống). */
    crop?: string | null;
    /** Máy đang làm (khói / lửa). */
    running?: boolean;
  }[];
  tiles: { instanceId: string; cost: number; paid: number; occupantSec: number }[];
  /** Ô lối đi trong quán đang xem: mỗi nơi đang có (trừ quán này) một ô; sec = người đứng lâu nhất trên ô. */
  portals: { to: ShopId; name: string; kind: 'shop' | 'farm'; x: number; z: number; sec: number }[];
  log: LogEntry[];
}
