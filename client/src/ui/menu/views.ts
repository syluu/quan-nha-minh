import {
  BALANCE, INGREDIENTS, ITEMS, SHOP_META, SHOPS, effectiveCycle, isFarm, effectiveOutputCap, formatK, getStationDef, loanTerms, machineUpgradeCost,
  marketingMultiplier, priceRange,
} from '@qnm/shared';
import type { CampaignId, ItemId, ShopState, Snapshot, StationState } from '@qnm/shared';

/** Các món có kệ đang mở, theo thứ tự trong bố cục quán. */
function openItems(s: Snapshot): ItemId[] {
  const unlocked = new Set(s.stations.filter((st) => st.unlocked).map((st) => st.instanceId));
  const items: ItemId[] = [];
  for (const p of SHOPS[s.shopId].stations) {
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
  courier: { name: string | null; staffId: string | null; canHire: boolean; detail: StaffDetail | null } | null;
  /** Chỉ có khi quán đã mở bàn ăn. */
  cleaner: { name: string | null; staffId: string | null; canHire: boolean; detail: StaffDetail | null } | null;
  /** Chỉ ở trang trại: người đang làm + còn thuê thêm được không. */
  farm: { hands: { name: string; staffId: string; detail: StaffDetail | null }[]; canHire: boolean } | null;
  lines: { item: ItemId; itemName: string; staffName: string | null; staffId: string | null; detail: StaffDetail | null }[];
  wagePerDay: string;
  shopName: string;
} {
  const cashier = s.staff.find((x) => x.role === 'cashier');
  return {
    cashier: { name: cashier?.name ?? null, staffId: cashier?.id ?? null, canHire: !cashier, detail: staffDetail(cashier) },
    courier: s.online.registered
      ? (() => {
          const c = s.staff.find((x) => x.role === 'courier');
          return { name: c?.name ?? null, staffId: c?.id ?? null, canHire: !c, detail: staffDetail(c) };
        })()
      : null,
    cleaner: s.stations.some((st) => st.unlocked && st.seats.length > 0) || s.staff.some((x) => x.role === 'cleaner')
      ? (() => {
          const c = s.staff.find((x) => x.role === 'cleaner');
          return { name: c?.name ?? null, staffId: c?.id ?? null, canHire: !c, detail: staffDetail(c) };
        })()
      : null,
    lines: openItems(s).map((item) => {
      const cook = s.staff.find((x) => x.role === 'cook' && x.item === item);
      return { item, itemName: ITEMS[item].name, staffName: cook?.name ?? null, staffId: cook?.id ?? null, detail: staffDetail(cook) };
    }),
    wagePerDay: formatK(BALANCE.STAFF_LEVELS[0].wage),
    shopName: SHOP_META[s.shopId].name,
    farm: isFarm(s.shopId)
      ? (() => {
          const hands = s.staff.filter((x) => x.role === 'farmhand');
          return {
            hands: hands.map((h) => ({ name: h.name, staffId: h.id, detail: staffDetail(h) })),
            canHire: hands.length < BALANCE.FARMHANDS_MAX,
          };
        })()
      : null,
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
  WRONG_SHOP: 'Bạn vừa được chuyển sang quán khác — xem lại rồi thử lại',
  NOT_READY: 'Cần mở hết máy và kệ ở các quán đang có trước khi thuê mặt bằng mới',
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
  const machines = SHOPS[s.shopId].stations
    .map((p) => ({ p, def: getStationDef(p.def), st: s.stations.find((x) => x.instanceId === p.instanceId) }))
    .filter(({ def, st }) => (def.kind === 'producer' || def.kind === 'assembler' || def.kind === 'plot') && st?.unlocked)
    .map(({ p, def, st }) => {
      const level = st!.level;
      const lv = { level } as Pick<StationState, 'level'>;
      return {
        instanceId: p.instanceId,
        name: def.name,
        level,
        enabled: st!.enabled,
        max: BALANCE.MACHINE_MAX_LEVEL,
        cycle: `${oneDecimal(effectiveCycle(def, lv))} giây/món`,
        cap: `chứa ${effectiveOutputCap(def, lv)}`,
        cost: level < BALANCE.MACHINE_MAX_LEVEL ? formatK(machineUpgradeCost(s.shopId, p.instanceId, level + 1)) : null,
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
    pickup: s.online.registered
      ? {
          vehicle: s.online.vehicle === 'car' ? 'Ô tô' : 'Xe máy',
          cost: s.online.vehicle === 'car' ? null : formatK(BALANCE.ONLINE.carUpgradeCost),
        }
      : null,
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

/** Bong bóng trên đầu shipper: "Cần: 2 Bánh mì, 1 Trà đá". */
export function needsText(items: ItemId[]): string {
  if (!items.length) return 'Đủ rồi, cảm ơn!';
  const counts = new Map<ItemId, number>();
  for (const it of items) counts.set(it, (counts.get(it) ?? 0) + 1);
  return `Cần: ${[...counts].map(([it, n]) => `${n} ${ITEMS[it].name}`).join(', ')}`;
}

/** Mục "Bán online" trong tab Quảng cáo. */
export function onlineView(s: Snapshot) {
  const o = s.online;
  return {
    registered: o.registered,
    paused: o.paused,
    status: !o.registered ? 'Chưa đăng ký' : o.paused ? 'Đang tạm ngưng' : 'Đang nhận đơn',
    vehicle: o.vehicle === 'car' ? `Ô tô (gom ${BALANCE.ONLINE.car.batchMin}–${BALANCE.ONLINE.car.batchMax} đơn)` : 'Xe máy (1 đơn/lần)',
    pending: o.pending,
    ordersToday: o.ordersToday,
    cancelledToday: o.cancelledToday,
    commission: `${Math.round(BALANCE.ONLINE.commission * 100)}%`,
    hint: o.registered ? '' : 'Mở ô "Điểm giao hàng" (2.000K) ở cuối lối bếp bên phải để bắt đầu nhận đơn.',
  };
}

/** Nhãn trên đầu nhân viên: "Lan · thu ngân", "Mai · giao đơn", "Hùng · Bánh mì". */
export function staffLabel(st: { name: string; role: string; item: ItemId | null }): string {
  const job =
    st.role === 'cashier' ? 'thu ngân' : st.role === 'courier' ? 'giao đơn' : st.role === 'cleaner' ? 'dọn bàn' : st.role === 'farmhand' ? 'trang trại' : st.item ? ITEMS[st.item].name : 'phụ bếp';
  return `${st.name} · ${job}`;
}

/** Tab Bản đồ: quán đang có (đi tới) và mặt bằng còn trống (thuê). */
export function mapView(s: Snapshot) {
  const here = s.shopId;
  return {
    here: SHOP_META[here].name,
    owned: s.shops
      .filter((x) => x.owned)
      .map((x) => ({
        id: x.id,
        name: x.name,
        here: x.id === here,
        status: x.complete ? 'Đã mở hết' : 'Đang mở thêm',
        rent:
          x.rentPerMonth <= 0
            ? 'Xe nhà, không tốn tiền thuê'
            : `Thuê ${formatK(x.rentPerMonth)}/tháng${x.kind === 'farm' ? ` + ${formatK(SHOP_META.farm.plotRent)}/lô mở thêm` : ''}`,
      })),
    free: s.shops
      .filter((x) => !x.owned)
      .map((x) => ({
        id: x.id,
        name: x.name,
        deposit: formatK(x.deposit),
        rent: `${formatK(x.rentPerMonth)}/tháng`,
        menu: menuOf(x.id),
        farm: x.kind === 'farm',
        // Trang trại thuê lúc nào cũng được (đủ tiền); quán mới cần mở hết các quán đang có.
        canRent: (x.kind === 'farm' || s.canRent) && s.money >= x.deposit && !s.settlement,
      })),
    warehouse: (Object.entries(s.warehouse) as [keyof typeof INGREDIENTS, number][])
      .filter(([, n]) => n > 0)
      .map(([id, n]) => `${n} ${INGREDIENTS[id].name.toLowerCase()}`)
      .join(', '),
    hint: s.canRent ? '' : 'Mở hết máy và kệ ở các quán đang có thì mới thuê được mặt bằng mới.',
  };
}

/** Các món bán ở một loại quán (để chọn loại hình). */
export function menuOf(shopId: Snapshot['shopId']): string {
  const items: string[] = [];
  for (const p of SHOPS[shopId].stations) {
    const def = getStationDef(p.def);
    if (def.kind === 'display') items.push(ITEMS[def.item].name);
    if (def.kind === 'plot') items.push(def.name);
  }
  return items.join(', ');
}

/** Tên một mục trong danh sách bán ở bảng kết toán. */
export function sellableName(x: { shopId: Snapshot['shopId']; instanceId: string }): string {
  const shop = SHOP_META[x.shopId].name;
  if (x.instanceId === 'mat_bang') return `Trả mặt bằng ${shop}`;
  const p = SHOPS[x.shopId].stations.find((st) => st.instanceId === x.instanceId);
  return `${p ? getStationDef(p.def).name : x.instanceId} (${shop})`;
}
