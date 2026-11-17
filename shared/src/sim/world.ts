import { BALANCE, SHOPS } from '../content';
import type { ItemId, ShopId } from '../content';

export interface StationState {
  instanceId: string;
  unlocked: boolean;
  /** Số đồng đã trả qua ô trả tiền. */
  paid: number;
  outputCount: number;
  inputs: Partial<Record<ItemId, number>>;
  /** Số món đang bày (chỉ kệ). */
  stock: number;
  progress: number;
  running: boolean;
  /** Cấp nâng cấp máy (0 = chưa nâng). */
  level: number;
  /** Tổng tiền đã nâng cấp máy này (tính tài sản, hoàn tiền khi bán). */
  upgradeSpent: number;
  blocked: null | 'no_money' | 'no_input' | 'full' | 'off';
  /** Công tắc tự sản xuất (máy/bàn ghép). Tắt giữa mẻ → làm xong mẻ rồi dừng. */
  enabled: boolean;
  /** Chỗ ngồi (chỉ bàn ăn). */
  seats: SeatState[];
  tileOccupant: null | { playerId: string; sec: number };
}

export type SeatState = 'free' | 'taken' | 'dirty';

export interface Customer {
  id: number;
  x: number;
  z: number;
  dir: number;
  state: 'toShelf' | 'atShelf' | 'toQueue' | 'inQueue' | 'paying' | 'toTable' | 'eating' | 'leaving';
  wants: ItemId[];
  bill: number;
  waited: number;
  payTimer: number;
  holding: ItemId[];
  scored: boolean;
  /** Bàn + chỗ đang ngồi (ăn tại chỗ). */
  table: string | null;
  seat: number;
  eatTimer: number;
}

export type StaffRole = 'cashier' | 'cook' | 'courier' | 'cleaner';

export interface StaffTask {
  from: string;
  to: string;
  item: ItemId;
  phase: 'toSource' | 'picking' | 'toTarget' | 'dropping';
}

export interface StaffState {
  id: string;
  name: string;
  role: StaffRole;
  /** Món phụ trách (phụ bếp); null với thu ngân. */
  item: ItemId | null;
  x: number;
  z: number;
  dir: number;
  carry: ItemId[];
  task: StaffTask | null;
  timer: number;
  hiredDay: number;
  /** Cấp 1–4 (xem BALANCE.STAFF_LEVELS). */
  level: number;
  /** Lương đã làm nhưng chưa trả (trả cuối tháng hoặc khi cho nghỉ). */
  wageOwed: number;
}

export type CampaignId = 'to_roi' | 'mxh' | 'review';

/** Đơn online: món cần giao và món đã đưa cho shipper. */
export interface Order {
  id: number;
  items: ItemId[];
  delivered: ItemId[];
  /** Tổng tiền món theo giá bán (chưa trừ hoa hồng). */
  total: number;
  /** secOfDay lúc có đơn (để xe ô tô biết đơn đã chờ bao lâu). */
  createdSec: number;
}

export interface Shipper {
  vehicle: 'bike' | 'car';
  x: number;
  z: number;
  dir: number;
  state: 'arriving' | 'waiting' | 'leaving';
  orderIds: number[];
  waited: number;
}

export interface Loan {
  id: string;
  principal: number;
  totalDue: number;
  paid: number;
  installment: number;
  monthsLeft: number;
  takenDay: number;
  /** Tháng đầu tiên phải góp (vay lúc đang kết toán thì góp từ tháng sau). */
  firstDueMonth: number;
}

/** Bảng kết toán cuối tháng; khác null nghĩa là game đang dừng chờ trả. */
export interface Settlement {
  month: number;
  revenue: number;
  ingredientCost: number;
  marketing: number;
  /** Hoa hồng app giao đồ ăn trong tháng (đã trừ khi nhận tiền). */
  commission: number;
  wages: number;
  rent: number;
  loanDue: number;
  totalDue: number;
}

export interface ShopState {
  id: ShopId;
  /** Đã thuê (bánh mì luôn true). Quán chưa thuê không chạy. */
  owned: boolean;
  stations: Record<string, StationState>;
  customers: Customer[];
  prices: Partial<Record<ItemId, number>>;
  ratings: number[];
  nextCustomerIn: number;
  nextCustomerId: number;
  staff: StaffState[];
  nextStaffId: number;
  /** Số người bị cho nghỉ hôm nay (vẫn phải trả lương ngày đó). */
  firedToday: number;
  campaigns: { id: CampaignId; daysLeft: number }[];
  orders: Order[];
  nextOrderId: number;
  nextOrderIn: number;
  shipper: Shipper | null;
  onlinePaused: boolean;
}

export interface PlayerState {
  id: string;
  name: string;
  color: number;
  x: number;
  z: number;
  dir: number;
  carry: ItemId[];
  carryCap: number;
  speed: number;
  online: boolean;
  input: { mx: number; mz: number };
  /** Thời gian chờ trước lần đặt/bỏ món tiếp theo. */
  dropCd: number;
  /** Thời gian đã đứng nhặt ở trạm `pickAt`. */
  pickTimer: number;
  pickAt: string | null;
  /** Đang mở menu: không mua ô trả tiền, không bỏ rác (dù đứng yên). Không lưu ý nghĩa giữa các lần vào. */
  inMenu: boolean;
  carryLevel: number;
  speedLevel: number;
  /** Quán người chơi đang đứng. */
  location: ShopId;
}

export interface DayStats {
  revenue: number;
  ingredientCost: number;
  unlockSpend: number;
  served: number;
  lost: number;
  wages: number;
  /** Giá trị nguyên liệu của món bị bỏ vào thùng rác. */
  wasted: number;
  sold: Partial<Record<ItemId, number>>;
  marketing: number;
  /** Hoa hồng app giao đồ ăn (đã trừ khỏi tiền nhận). */
  commission: number;
  onlineOrders: number;
  onlineCancelled: number;
}

export interface DaySummary extends DayStats {
  day: number;
  operatingProfit: number;
  stars: number;
}

export interface LogEntry {
  day: number;
  clock: string;
  text: string;
}

export interface WorldState {
  schemaVersion: 5;
  code: string;
  money: number;
  day: number;
  secOfDay: number;
  rngState: number;
  shops: Record<ShopId, ShopState>;
  players: Record<string, PlayerState>;
  log: LogEntry[];
  dayStats: DayStats;
  /** Tổng kết các ngày đã qua (tối đa BALANCE.HISTORY_DAYS). */
  history: DaySummary[];
  loans: Loan[];
  nextLoanId: number;
  settlement: Settlement | null;
  /** Tháng hiện tại (bắt đầu 1). */
  month: number;
  /** Các kỳ kết toán đã xong (tối đa 12). */
  months: Settlement[];
  /** Lương còn nợ của nhân viên ở mặt bằng đã trả (vào kết toán tháng). */
  extraWagesOwed: number;
}

export function emptyDayStats(): DayStats {
  return { revenue: 0, ingredientCost: 0, unlockSpend: 0, served: 0, lost: 0, wages: 0, wasted: 0, sold: {}, marketing: 0, commission: 0, onlineOrders: 0, onlineCancelled: 0 };
}

export function createStationState(instanceId: string, unlocked: boolean, seats: number): StationState {
  return {
    instanceId,
    unlocked,
    paid: 0,
    outputCount: 0,
    inputs: {},
    stock: 0,
    progress: 0,
    running: false,
    blocked: null,
    enabled: true,
    seats: Array.from({ length: seats }, () => 'free' as SeatState),
    tileOccupant: null,
    level: 0,
    upgradeSpent: 0,
  };
}

export function createShop(id: ShopId, owned: boolean): ShopState {
  const layout = SHOPS[id];
  const stations: Record<string, StationState> = {};
  for (const p of layout.stations) stations[p.instanceId] = createStationState(p.instanceId, p.unlockCost === 0, p.seatPoints?.length ?? 0);
  return {
    id, owned, stations, customers: [], prices: {}, ratings: [], nextCustomerIn: 1, nextCustomerId: 1,
    staff: [], nextStaffId: 1, firedToday: 0, campaigns: [],
    orders: [], nextOrderId: 1, nextOrderIn: 5, shipper: null, onlinePaused: false,
  };
}

export function createWorld(code: string, seed: number): WorldState {
  return {
    schemaVersion: 5,
    code,
    money: BALANCE.START_MONEY,
    day: 1,
    secOfDay: 0,
    rngState: seed >>> 0,
    shops: { banh_mi: createShop('banh_mi', true), com_tam: createShop('com_tam', false), pho_cafe: createShop('pho_cafe', false) },
    players: {},
    log: [],
    dayStats: emptyDayStats(),
    history: [],
    loans: [],
    nextLoanId: 1,
    settlement: null,
    month: 1,
    months: [],
    extraWagesOwed: 0,
  };
}

/** mulberry32 trên world.rngState → số trong [0, 1). */
export function nextRandom(world: WorldState): number {
  world.rngState = (world.rngState + 0x6d2b79f5) >>> 0;
  let t = world.rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
