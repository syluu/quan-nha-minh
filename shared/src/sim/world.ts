import { BALANCE, SHOPS } from '../content';
import type { IngredientId, ItemId, Outfit, ShopId } from '../content';

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
  /** Lô trang trại: giống đang trồng (id lô mẫu, vd 'chuong_bo'); null = đất trống chưa chọn; không có = giống mặc định. */
  crop?: string | null;
  /** Đổi giống chờ áp dụng (sau khi xong mẻ và lấy hết thùng). */
  nextCrop?: string | null;
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
  /** Khách đoàn du lịch: chịu giá cao hơn, boa nhiều hơn. */
  tourist?: boolean;
  /** Cảm xúc sau khi tính tiền / bỏ về (bong bóng trên đầu). */
  face?: string;
  /** Bàn + chỗ đang ngồi (ăn tại chỗ). */
  table: string | null;
  seat: number;
  eatTimer: number;
  /** Khách quen (id trong REGULARS). */
  regular?: string;
}

export type StaffRole = 'cashier' | 'cook' | 'courier' | 'cleaner' | 'farmhand';

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
  /** Nhân viên dọn bàn: bàn đang tới dọn và các điểm đi qua (vòng qua khe giữa các kệ). */
  target?: string | null;
  path?: { x: number; z: number }[];
  /** Sức 0–100 (thiếu = đầy): làm liên tục thì tụt, rảnh thì hồi; mệt thì đi chậm. */
  energy?: number;
  /** Còn bao nhiêu giây hăng hái sau khi được mời trà đá. */
  cheer?: number;
  /** Hết sức: còn bao nhiêu giây nghỉ (đứng nghỉ, không làm). */
  rest?: number;
}

/** Khách quen của một quán: món ruột, tình cảm, giờ ghé hôm nay. */
export interface Regular {
  id: string;
  shopId: ShopId;
  fav: ItemId;
  /** 0–100. */
  love: number;
  /** Giây trong ngày sẽ ghé hôm nay; ngày đã ghé. */
  visitAt: number;
  visitedDay: number;
  /** Số lần đã ghé. */
  visits: number;
}

/** Đơn đặt tiệc: giao đủ số món trước giờ hẹn qua điểm giao hàng. */
export interface Party {
  kind: string;
  shopId: ShopId;
  item: ItemId;
  qty: number;
  delivered: number;
  /** Giây trong ngày: hạn nhận đơn, hạn giao. */
  offerUntil: number;
  dueSec: number;
  /** Tiền thưởng khi giao đủ (đã gồm giá món). */
  reward: number;
  state: 'offer' | 'active' | 'done' | 'failed' | 'declined';
  /** Giây trong ngày lúc giao xong / trễ hẹn (để bảng kết quả hiện thêm một lúc rồi ẩn). */
  endSec?: number;
}

export type CampaignId = keyof typeof BALANCE.CAMPAIGNS;
export type AdId = keyof typeof BALANCE.ADS;

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
  /** Ngày bắt đầu thuê (tính tiền thuê tháng đầu theo số ngày). */
  rentedDay: number;
  /** Trang trại: đã mở rộng mấy lần (0–3). */
  farmLevel: number;
  /** Chuỗi khách được phục vụ nhanh liên tiếp. */
  combo?: number;
  /** Mèo: 'stray' = mèo hoang đang ghé xin ăn, 'pet' = mèo của quán (đã cho ăn). */
  cat?: 'none' | 'stray' | 'pet';
  /** Đoàn khách du lịch: còn bao nhiêu khách sắp xuống xe; xe đỗ tới giây nào trong ngày. */
  tourLeft?: number;
  tourBusUntil?: number;
  /** Tổng doanh thu cộng dồn của quán (để lên đời: quán cóc → nhà hàng). */
  earned?: number;
  /** Trộm / người say đang trong quán (không lưu qua lần tải lại). */
  intruder?: Intruder | null;
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
  /** Quảng cáo lâu dài đã mua (biển LED, đèn lồng…). */
  ads: AdId[];
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
  /** Biểu cảm đang hiện (còn bao nhiêu giây). */
  emote?: string | null;
  emoteLeft?: number;
  /** Vừa bấm đập tay (cửa sổ chờ người kia, giây) và thời gian còn tăng tốc sau khi đập tay. */
  hiFive?: number;
  boost?: number;
  /** Trang phục đang mặc (id trong COSTUMES) và các món đã mua (giữ cả khi phá sản). */
  outfit: Outfit;
  wardrobe: string[];
  /** Đang đứng trên ô lối đi sang `to` được bao lâu (tạm thời, không cần lưu). */
  portal?: { to: ShopId; sec: number } | null;
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
  /** Tiền khách boa thêm (đã tính vào doanh thu). */
  tips: number;
  /** Số chỗ ngồi đã dọn. */
  cleaned: number;
  /** Combo phục vụ nhanh dài nhất trong ngày. */
  bestCombo: number;
}

/** Thành tích từng người trong ngày (bảng vinh danh cuối ngày). */
export interface PlayerDayStats {
  name: string;
  /** Món đặt lên kệ / bàn ghép / điểm giao. */
  placed: number;
  /** Khách tính tiền khi mình đứng thu ngân. */
  served: number;
  cleaned: number;
  /** Thùng hàng bốc lên xe ở trang trại. */
  crates: number;
}

export interface DaySummary extends DayStats {
  /** Bảng vinh danh: thành tích từng người trong ngày. */
  players?: PlayerDayStats[];
  weather?: 'sun' | 'rain';
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
  schemaVersion: 11;
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
  /** Kho tổng: nguyên liệu từ trang trại, dùng chung mọi quán (máy lấy kho trước, thiếu mới mua chợ). */
  warehouse: Partial<Record<IngredientId, number>>;
  /** Các quán hôm nay đã lấy hàng từ kho tổng (tính phí chở cuối ngày). */
  deliveredTo: ShopId[];
  /** Thành tích từng người hôm nay. */
  dayPlayers: Record<string, PlayerDayStats>;
  /** Đoàn du lịch hôm nay: quán nào, tới lúc nào (giây trong ngày); null = không có. */
  tour: { shopId: ShopId; at: number; done: boolean } | null;
  /** Thời tiết hôm nay. */
  weather: 'sun' | 'rain';
  /** Nhiệm vụ hôm nay. */
  quests: Quest[];
  /** Huy hiệu đã đạt (giữ cả khi phá sản) và số liệu cộng dồn để xét huy hiệu. */
  badges: string[];
  lifetime: { served: number; sold: Partial<Record<ItemId, number>>; tips: number; online: number; bestCombo: number; fiveStarDays: number; perfectDays: number; quests: number; tours: number; parties?: number; caught?: number };
  /** Ngày đã chuẩn bị nội dung (thời tiết, đoàn khách, nhiệm vụ, mèo). */
  funDay: number;
  /** Khách quen của các quán. */
  regulars: Regular[];
  /** Đơn đặt tiệc hôm nay (null = không có). */
  party: Party | null;
  /** Giây trong ngày sẽ có trộm / người say ghé (null = hôm nay yên ổn hoặc đã xảy ra). */
  intruderAt?: number | null;
  intruderKind?: IntruderKind;
}

export type IntruderKind = 'thief' | 'drunk';

/** Trộm / người say xỉn đang trong quán: đi vòng các kệ lấy món, người chơi chạm vào là bắt được. */
export interface Intruder {
  kind: IntruderKind;
  x: number;
  z: number;
  dir: number;
  state: 'toShelf' | 'grabbing' | 'leaving' | 'caught';
  /** Kệ đang nhắm tới. */
  target: string | null;
  /** Món đã lấy và giá bán của chúng (tiền được trả lại khi bắt được). */
  stolen: ItemId[];
  value: number;
  /** Đã lấy bao nhiêu món ở kệ hiện tại; đếm giờ lấy món; thời gian đã ở trong quán. */
  grabbedHere: number;
  timer: number;
  life: number;
}

export interface Quest {
  id: string;
  kind: 'sell' | 'serve' | 'revenue' | 'tips' | 'online' | 'clean' | 'no_lost';
  item?: ItemId;
  target: number;
  reward: number;
  done: boolean;
  failed?: boolean;
}

export function emptyDayStats(): DayStats {
  return {
    revenue: 0, ingredientCost: 0, unlockSpend: 0, served: 0, lost: 0, wages: 0, wasted: 0, sold: {}, marketing: 0, commission: 0,
    onlineOrders: 0, onlineCancelled: 0, tips: 0, cleaned: 0, bestCombo: 0,
  };
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
  // Lô đất mở rộng chưa mua: chưa có (mua mở rộng mới mở).
  for (const p of layout.stations)
    stations[p.instanceId] = createStationState(p.instanceId, p.unlockCost === 0 && !p.farmExpansion, p.seatPoints?.length ?? 0);
  return {
    id, owned, rentedDay: 0, farmLevel: 0, stations, customers: [], prices: {}, ratings: [], nextCustomerIn: 1, nextCustomerId: 1,
    staff: [], nextStaffId: 1, firedToday: 0, campaigns: [], ads: [],
    orders: [], nextOrderId: 1, nextOrderIn: 5, shipper: null, onlinePaused: false,
  };
}

export function createWorld(code: string, seed: number): WorldState {
  return {
    schemaVersion: 11,
    code,
    money: BALANCE.START_MONEY,
    day: 1,
    secOfDay: 0,
    rngState: seed >>> 0,
    shops: { banh_mi: createShop('banh_mi', true), com_tam: createShop('com_tam', false), pho_cafe: createShop('pho_cafe', false), farm: createShop('farm', false) },
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
    warehouse: {},
    deliveredTo: [],
    dayPlayers: {},
    tour: null,
    weather: 'sun',
    quests: [],
    badges: [],
    lifetime: { served: 0, sold: {}, tips: 0, online: 0, bestCombo: 0, fiveStarDays: 0, perfectDays: 0, quests: 0, tours: 0 },
    funDay: 0,
    regulars: [],
    party: null,
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
