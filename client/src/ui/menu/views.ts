import {
  BALANCE, COSTUMES, LIFE, COSTUME_LIST, PLOT_CROPS, STATIONS, COSTUME_SLOTS, DEFAULT_OUTFIT, INGREDIENTS, ITEMS, SHOP_META, SHOPS, effectiveCycle, isFarm, effectiveOutputCap, formatK, getStationDef, loanTerms, machineUpgradeCost,
  marketingMultiplier, onlineMarketingMultiplier, priceRange, warehouseSellPrice,
} from '@qnm/shared';
import type { Outfit } from '@qnm/shared';
import type { AdId, CampaignId, IngredientId, ItemId, ShopState, Snapshot, StationState } from '@qnm/shared';

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
  /** Sức 0–100 và tâm trạng (khoẻ / mệt / kiệt sức / hăng hái sau ly trà đá). */
  energy: number;
  mood: string;
  cheer: boolean;
}

/** Tâm trạng nhân viên theo sức. */
export function staffMood(x: { energy: number; cheer: boolean }): string {
  if (x.cheer) return '🧋 Hăng hái';
  if (x.energy < LIFE.EXHAUSTED) return '🥵 Kiệt sức';
  if (x.energy < LIFE.TIRED) return '😓 Mệt';
  if (x.energy < 70) return '🙂 Hơi đuối';
  return '💪 Khoẻ re';
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
    energy: x.energy ?? 100,
    mood: staffMood({ energy: x.energy ?? 100, cheer: !!x.cheer }),
    cheer: !!x.cheer,
  };
}

export function staffView(s: Snapshot): {
  cashier: { name: string | null; staffId: string | null; canHire: boolean; detail: StaffDetail | null };
  courier: { name: string | null; staffId: string | null; canHire: boolean; detail: StaffDetail | null } | null;
  /** Chỉ có khi quán đã mở bàn ăn. */
  cleaner: { name: string | null; staffId: string | null; canHire: boolean; detail: StaffDetail | null } | null;
  /** Chỉ ở trang trại: người đang làm + còn thuê thêm được không. */
  farm: { hands: { name: string; staffId: string; detail: StaffDetail | null }[]; canHire: boolean } | null;
  /** Phụ bếp đa năng: tự bày mọi kệ và tiếp liệu bàn ghép; tối đa bằng số kệ đang mở. */
  cooks: { list: { name: string; staffId: string; detail: StaffDetail | null }[]; max: number; canHire: boolean };
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
    cooks: (() => {
      const list = s.staff.filter((x) => x.role === 'cook').map((c) => ({ name: c.name, staffId: c.id, detail: staffDetail(c) }));
      const max = Math.max(1, openItems(s).length);
      return { list, max, canHire: list.length < max };
    })(),
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
  NAME_TAKEN: 'Tên này đã có người trong nhà dùng — chọn tên khác',
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
    .map((p) => {
      const st = s.stations.find((x) => x.instanceId === p.instanceId);
      // Lô trang trại: theo giống đang trồng (đất trống thì không nâng cấp được).
      const def = st?.crop !== undefined ? (st.crop ? STATIONS[st.crop] : null) : getStationDef(p.def);
      return { p, def: def!, st };
    })
    .filter(({ def, st }) => !!def && (def.kind === 'producer' || def.kind === 'assembler' || def.kind === 'plot') && st?.unlocked)
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

const pct = (n: number) => `+${Math.round(n * 100)}%`;
const oneDec = (n: number) => String(n).replace('.', ',');

/** Mô tả hiệu quả: "+50% khách · +30% đơn online · +0,3 sao". */
function effectText(c: { boost: number; onlineBoost: number; starBonus: number }): string {
  const parts: string[] = [];
  if (c.boost) parts.push(`${pct(c.boost)} khách`);
  if (c.onlineBoost) parts.push(`${pct(c.onlineBoost)} đơn online`);
  if (c.starBonus) parts.push(`+${oneDec(c.starBonus)} sao`);
  return parts.join(' · ');
}

/** Tab Quảng cáo: chiến dịch ngắn ngày (chạy / gia hạn) + đầu tư lâu dài (mua một lần) + hệ số hiện tại. */
export function marketingView(s: Snapshot) {
  const ads = s.ads ?? [];
  const cards = (Object.entries(BALANCE.CAMPAIGNS) as [CampaignId, (typeof BALANCE.CAMPAIGNS)[CampaignId]][]).map(([id, c]) => {
    const running = s.campaigns.find((x) => x.id === id);
    return {
      id,
      icon: c.icon,
      name: c.name,
      desc: c.desc,
      cost: formatK(c.cost),
      effect: effectText(c),
      days: `${c.days} ngày`,
      running: running ? running.daysLeft : 0,
      affordable: s.money >= c.cost && !s.settlement,
    };
  });
  const perm = (Object.entries(BALANCE.ADS) as [AdId, (typeof BALANCE.ADS)[AdId]][]).map(([id, a]) => ({
    id,
    icon: a.icon,
    name: a.name,
    desc: a.desc,
    cost: formatK(a.cost),
    effect: `${effectText(a)} (lâu dài)`,
    owned: ads.includes(id),
    affordable: s.money >= a.cost && !s.settlement,
  }));
  const shop = { campaigns: s.campaigns, ads } as Pick<ShopState, 'campaigns' | 'ads'>;
  const fmt = (n: number) => `×${(Math.round(n * 100) / 100).toString().replace('.', ',')}`;
  return {
    cards,
    perm,
    running: s.campaigns.map((c) => ({ name: BALANCE.CAMPAIGNS[c.id]?.name ?? c.id, daysLeft: c.daysLeft })),
    multiplier: fmt(marketingMultiplier(shop)),
    onlineMultiplier: fmt(onlineMarketingMultiplier(shop)),
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
    /** Kho tổng: từng nguyên liệu còn hàng, giá bán ra chợ (bằng giá chợ). */
    stock: (Object.entries(s.warehouse) as [IngredientId, number][])
      .filter(([, n]) => n > 0)
      .map(([id, n]) => ({
        id,
        name: INGREDIENTS[id].name,
        qty: n,
        unit: formatK(warehouseSellPrice(id)),
        all: formatK(warehouseSellPrice(id) * n),
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
    if (p.farmExpansion) continue;
    const def = getStationDef(p.def);
    if (def.kind === 'display') items.push(ITEMS[def.item].name);
    if (def.kind === 'plot') items.push(def.name);
  }
  return [...new Set(items)].join(', ');
}

/** Tên một mục trong danh sách bán ở bảng kết toán. */
export function sellableName(x: { shopId: Snapshot['shopId']; instanceId: string }): string {
  const shop = SHOP_META[x.shopId].name;
  if (x.instanceId === 'mat_bang') return `Trả mặt bằng ${shop}`;
  const p = SHOPS[x.shopId].stations.find((st) => st.instanceId === x.instanceId);
  return `${p ? getStationDef(p.def).name : x.instanceId} (${shop})`;
}

const SLOT_NAMES = { hat: 'Mũ', hair: 'Tóc', shirt: 'Áo & váy liền', pants: 'Quần & chân váy', apron: 'Tạp dề' } as const;

const STYLE_ICON: Record<string, string> = {
  khong_mu: '🚫', non_la: '🎋', mu_luoi_trai: '🧢', mu_bao_hiem: '⛑️', mu_dau_bep: '👨‍🍳', mu_phot: '🎩', mu_len: '🧶', mu_coi: '👒', mu_tai_beo: '🪖',
  toc_ngan: '💇', toc_dai: '💇‍♀️', toc_duoi_ngua: '🎀', toc_bui: '🍡', toc_hai_bim: '🎀', toc_xoan: '🌀',
  ao_mau_rieng: '👕', ao_phong: '👕', ao_ba_lo: '🎽', so_mi: '👔', ao_khoac: '🧥', ao_dai: '👘', vay_lien: '👗',
  quan_dai: '👖', quan_jean: '👖', quan_short: '🩳', chan_vay: '👗',
  khong: '🚫', tap_de: '🧑‍🍳', tap_de_caro: '🧑‍🍳',
};

/** Tab Trang phục: từng ô (mũ, áo, quần, tạp dề), món đang mặc / đã có / mua được. */
export function costumeView(s: Snapshot, myId: string, trial?: Outfit) {
  const me = s.players.find((p) => p.id === myId);
  const hex = (c: number, fallback: number) => `#${(c || fallback).toString(16).padStart(6, '0')}`;
  return COSTUME_SLOTS.map((slot) => ({
    slot,
    title: SLOT_NAMES[slot],
    items: COSTUME_LIST.filter((c) => c.slot === slot).map((c) => {
      const owned = c.price === 0 || !!me?.wardrobe?.includes(c.id);
      const wearing = (me?.outfit?.[slot] ?? DEFAULT_OUTFIT[slot]) === c.id;
      return {
        id: c.id,
        name: c.name,
        icon: STYLE_ICON[c.style] ?? '👕',
        // Áo màu riêng: màu nhân vật; "không đeo tạp dề": ô trống.
        swatch: c.style === 'khong' ? 'transparent' : hex(c.color, me?.color ?? 0x888888),
        price: c.price ? formatK(c.price) : 'Miễn phí',
        state: wearing ? ('wearing' as const) : owned ? ('owned' as const) : ('buy' as const),
        /** Đang mặc thử trong khung xem trước. */
        trying: !!trial && trial[slot] === c.id,
        affordable: owned || (s.money >= c.price && !s.settlement),
      };
    }),
  }));
}

/** Bộ đang mặc thử: món nào khác đồ đang mặc, món nào phải mua, tổng tiền, đủ tiền không. */
export function tryOnSummary(s: Snapshot, myId: string, trial: Outfit) {
  const me = s.players.find((p) => p.id === myId);
  const current = me?.outfit ?? DEFAULT_OUTFIT;
  const changes = COSTUME_SLOTS.filter((slot) => trial[slot] !== (current[slot] ?? DEFAULT_OUTFIT[slot])).map((slot) => {
    const c = COSTUMES[trial[slot]];
    const owned = c.price === 0 || !!me?.wardrobe?.includes(c.id);
    return { slot, id: c.id, name: c.name, owned, price: owned ? 0 : c.price };
  });
  const total = changes.reduce((n, c) => n + c.price, 0);
  return {
    changed: changes.length > 0,
    changes: changes.map((c) => ({ ...c, label: `${c.name}${c.owned ? ' (đã có)' : ` — ${formatK(c.price)}`}` })),
    total,
    totalText: formatK(total),
    canBuy: changes.length > 0 && (total === 0 || (s.money >= total && !s.settlement)),
    reason: total > 0 && s.settlement ? 'Đang kết toán cuối tháng' : total > s.money ? 'Không đủ tiền' : '',
  };
}

export const CROP_ICON: Record<string, string> = {
  ruong_rau: '🥬', ruong_lua_mi: '🌾', ruong_lua: '🍚', chuong_ga: '🐔', chuong_lon: '🐖', chuong_bo: '🐄',
};

/** Tab Trang trại: mở rộng đất, từng lô đang trồng gì, chọn / đổi giống. */
export function farmView(s: Snapshot) {
  const f = s.farm ?? { owned: false, level: 0, plots: [] };
  const max = BALANCE.FARM_EXPANSION_COSTS.length;
  const nextCost = f.level < max ? BALANCE.FARM_EXPANSION_COSTS[f.level] : null;
  const crops = PLOT_CROPS.map((id) => {
    const d = STATIONS[id] as Extract<(typeof STATIONS)[string], { kind: 'plot' }>;
    const bundle = ITEMS[d.output].bundle ?? [];
    return {
      id,
      icon: CROP_ICON[id],
      name: d.name,
      detail: `${formatK(d.seedCost)}/mẻ · ${d.cycleSec} giây → ${bundle.map((b) => `${b.qty} ${INGREDIENTS[b.id].name.toLowerCase()}`).join(' + ')}`,
    };
  });
  const groups = [0, 1, 2, 3]
    .filter((lv) => lv <= f.level)
    .map((lv) => ({
      title: lv === 0 ? 'Đất ban đầu' : `Đất mở rộng lần ${lv}`,
      plots: f.plots
        .filter((p) => p.expansion === lv)
        .map((p) => {
          const idx = f.plots.indexOf(p) + 1;
          const cur = p.crop ? STATIONS[p.crop] : null;
          const next = p.nextCrop ? STATIONS[p.nextCrop] : null;
          const status = !p.unlocked
            ? 'Chưa mở — đứng trên ô trả tiền ở trang trại để mở'
            : !cur
              ? 'Đất trống — chọn giống để bắt đầu'
              : next
                ? `Sẽ đổi sang ${next.name.toLowerCase()} khi xong mẻ và lấy hết thùng${p.outputCount ? ` (còn ${p.outputCount} thùng)` : ''}`
                : !p.enabled
                  ? 'Đang tắt'
                  : p.outputCount
                    ? `Có ${p.outputCount} thùng chờ lấy${p.running ? ' · đang trồng tiếp' : ''}`
                    : p.running
                      ? 'Đang trồng'
                      : 'Chờ';
          return {
            instanceId: p.instanceId,
            label: `Lô ${idx}`,
            icon: p.crop ? CROP_ICON[p.crop] : '🟫',
            crop: cur?.name ?? 'Đất trống',
            current: p.crop,
            pending: p.nextCrop,
            unlocked: p.unlocked,
            status,
          };
        }),
    }));
  return {
    owned: f.owned,
    level: f.level,
    max,
    slots: f.plots.filter((p) => p.unlocked).length,
    nextCost: nextCost === null ? null : formatK(nextCost),
    canExpand: nextCost !== null && s.money >= nextCost && !s.settlement,
    crops,
    groups,
  };
}
