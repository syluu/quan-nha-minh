import {
  BALANCE, ITEMS, SHOPS, effectiveCycle, effectiveOutputCap, formatK, getStationDef, loanTerms, machineUpgradeCost,
  marketingMultiplier, priceRange,
} from '@qnm/shared';
import type { CampaignId, ItemId, ShopState, Snapshot, StationState } from '@qnm/shared';

/** Các món có kệ đang mở, theo thứ tự trong bố cục quán. */
function openItems(s: Snapshot): ItemId[] {
  const unlocked = new Set(s.stations.filter((st) => st.unlocked).map((st) => st.instanceId));
  const items: ItemId[] = [];
  for (const p of SHOPS.banh_mi.stations) {
    const def = getStationDef(p.def);
    if (def.kind === 'display' && unlocked.has(p.instanceId)) items.push(def.item);
  }
  return items;
}

export interface StaffDetail {
  level: number;
  speedPct: number;
  carry: number;
  wage: string;
  owed: string;
  /** Cho nghỉ phải trả ngay: lương còn nợ + hôm nay. */
  payOnFire: string;
  nextTrain: string | null;
}

function staffDetail(x: Snapshot['staff'][number] | undefined): StaffDetail | null {
  if (!x) return null;
  const lv = BALANCE.STAFF_LEVELS[x.level - 1];
  const next = BALANCE.STAFF_LEVELS[x.level];
  return {
    level: x.level,
    speedPct: Math.round((lv.speed / BALANCE.PLAYER_SPEED) * 100),
    carry: lv.carry,
    wage: formatK(lv.wage),
    owed: formatK(x.wageOwed),
    payOnFire: formatK(x.wageOwed + lv.wage),
    nextTrain: next ? formatK(next.train) : null,
  };
}

export function staffView(s: Snapshot): {
  cashier: { name: string | null; staffId: string | null; canHire: boolean; detail: StaffDetail | null };
  lines: { item: ItemId; itemName: string; staffName: string | null; staffId: string | null; detail: StaffDetail | null }[];
  wagePerDay: string;
} {
  const cashier = s.staff.find((x) => x.role === 'cashier');
  return {
    cashier: { name: cashier?.name ?? null, staffId: cashier?.id ?? null, canHire: !cashier, detail: staffDetail(cashier) },
    lines: openItems(s).map((item) => {
      const cook = s.staff.find((x) => x.role === 'cook' && x.item === item);
      return { item, itemName: ITEMS[item].name, staffName: cook?.name ?? null, staffId: cook?.id ?? null, detail: staffDetail(cook) };
    }),
    wagePerDay: formatK(BALANCE.STAFF_LEVELS[0].wage),
  };
}

export function priceView(s: Snapshot): { item: ItemId; name: string; current: string; market: string; base: number; min: number; max: number; value: number }[] {
  return openItems(s).map((item) => {
    const r = priceRange(item);
    const value = s.prices[item] ?? r.base;
    return { item, name: ITEMS[item].name, current: formatK(value), market: formatK(r.base), base: r.base, min: r.min, max: r.max, value };
  });
}

const ERRORS: Record<string, string> = {
  NO_SLOT: 'Đã đủ người cho việc này',
  LINE_TAKEN: 'Món này đã có người phụ trách',
  BAD_ITEM: 'Món này chưa bán',
  NOT_FOUND: 'Không tìm thấy',
  NO_MONEY: 'Không đủ tiền',
  MAXED: 'Đã đạt cấp tối đa',
  BAD_AMOUNT: 'Số tiền hoặc kỳ hạn không hợp lệ',
  NOT_SELLABLE: 'Máy này không bán được (máy khởi đầu hoặc máy khác đang cần nó)',
  BAD_ROLE: 'Thao tác không hợp lệ',
  PAUSED: 'Đang kết toán cuối tháng — trả xong rồi mới mua được',
  NO_SETTLEMENT: 'Tháng này đã kết toán xong',
};

export function actionErrorText(e: string): string {
  return ERRORS[e] ?? 'Không thực hiện được';
}

const oneDecimal = (n: number) => (Math.round(n * 10) / 10).toFixed(1).replace('.', ',').replace(',0', '');

/** Tab Nâng cấp: nâng cấp của chính mình + các máy làm món đang mở. */
export function upgradeView(s: Snapshot, myId: string) {
  const me = s.players.find((p) => p.id === myId);
  const carryLevel = me?.carryLevel ?? 0;
  const speedLevel = me?.speedLevel ?? 0;
  const carryMax = BALANCE.PLAYER_CARRY_COSTS.length;
  const speedMax = BALANCE.PLAYER_SPEED_COSTS.length;
  const machines = SHOPS.banh_mi.stations
    .map((p) => ({ p, def: getStationDef(p.def), st: s.stations.find((x) => x.instanceId === p.instanceId) }))
    .filter(({ def, st }) => (def.kind === 'producer' || def.kind === 'assembler') && st?.unlocked)
    .map(({ p, def, st }) => {
      const level = st!.level;
      const lv = { level } as Pick<StationState, 'level'>;
      return {
        instanceId: p.instanceId,
        name: def.name,
        level,
        max: BALANCE.MACHINE_MAX_LEVEL,
        cycle: `${oneDecimal(effectiveCycle(def, lv))} giây/món`,
        cap: `chứa ${effectiveOutputCap(def, lv)}`,
        cost: level < BALANCE.MACHINE_MAX_LEVEL ? formatK(machineUpgradeCost('banh_mi', p.instanceId, level + 1)) : null,
      };
    });
  return {
    me: {
      carry: {
        level: carryLevel,
        max: carryMax,
        now: `${BALANCE.PLAYER_CARRY_CAPS[carryLevel]} món`,
        next: carryLevel < carryMax ? `${BALANCE.PLAYER_CARRY_CAPS[carryLevel + 1]} món` : null,
        cost: carryLevel < carryMax ? formatK(BALANCE.PLAYER_CARRY_COSTS[carryLevel]) : null,
      },
      speed: {
        level: speedLevel,
        max: speedMax,
        now: `${Math.round((1 + BALANCE.PLAYER_SPEED_STEP * speedLevel) * 100)}%`,
        next: speedLevel < speedMax ? `${Math.round((1 + BALANCE.PLAYER_SPEED_STEP * (speedLevel + 1)) * 100)}%` : null,
        cost: speedLevel < speedMax ? formatK(BALANCE.PLAYER_SPEED_COSTS[speedLevel]) : null,
      },
    },
    machines,
  };
}

/** Tổng phải trả và góp mỗi tháng cho một khoản vay (cùng công thức với máy chủ). */
export function loanPreview(amount: number, months: number): { total: number; installment: number } {
  const t = loanTerms(amount, months);
  return { total: t.totalDue, installment: t.installment };
}

export function marketingView(s: Snapshot) {
  const cards = (Object.entries(BALANCE.CAMPAIGNS) as [CampaignId, (typeof BALANCE.CAMPAIGNS)[CampaignId]][]).map(([id, c]) => ({
    id,
    name: c.name,
    cost: formatK(c.cost),
    effect: `+${Math.round(c.boost * 100)}% khách${c.starBonus ? `, +${String(c.starBonus).replace('.', ',')} sao` : ''}`,
    days: `${c.days} ngày`,
  }));
  const mult = marketingMultiplier({ campaigns: s.campaigns } as ShopState);
  return {
    cards,
    running: s.campaigns.map((c) => ({ name: BALANCE.CAMPAIGNS[c.id].name, daysLeft: c.daysLeft })),
    multiplier: `×${(Math.round(mult * 100) / 100).toString().replace('.', ',')}`,
  };
}

export function bankView(s: Snapshot) {
  return {
    loans: s.loans.map((l) => ({
      id: l.id, principal: formatK(l.principal), remaining: formatK(l.remaining), installment: formatK(l.installment), monthsLeft: l.monthsLeft,
    })),
    maxLoan: formatK(s.maxLoan),
    maxLoanValue: s.maxLoan,
    daysToMonthEnd: s.daysToMonthEnd,
  };
}
