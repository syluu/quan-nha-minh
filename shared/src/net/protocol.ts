import type { ItemId } from '../content';
import type { CampaignId, DaySummary, LogEntry, Settlement, StaffRole, StationState } from '../sim/world';

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
} as const;

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
}
export interface RepayLoanMsg {
  loanId: string;
}
export interface SellStationMsg {
  instanceId: string;
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
  /** Máy bán được (chỉ có khi đang kết toán). */
  sellable: { instanceId: string; refund: number }[];
  prices: Partial<Record<ItemId, number>>;
  customers: { id: number; x: number; z: number; dir: number; holding: ItemId[] }[];
  stations: {
    instanceId: string;
    unlocked: boolean;
    outputCount: number;
    stock: number;
    inputs: Partial<Record<ItemId, number>>;
    blocked: StationState['blocked'];
    level: number;
  }[];
  tiles: { instanceId: string; cost: number; paid: number; occupantSec: number }[];
  log: LogEntry[];
}
