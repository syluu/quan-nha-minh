import { BALANCE, SHOPS, getStationDef } from '../content';
import type { ShopId } from '../content';
import type { ActionResult } from './actions';
import { maxLoan, stationValue } from './bank';
import { formatK } from '../money';
import type { SimEvent } from './events';
import { addLog, playerName } from './log';
import { clearOnline, dropUnsellableOrders } from './online';
import { createWorld } from './world';
import type { Loan, Settlement, WorldState } from './world';

const MONTHS_KEPT = 12;

function owedWages(world: WorldState): number {
  let n = 0;
  for (const id of Object.keys(world.shops) as ShopId[]) for (const s of world.shops[id].staff) n += s.wageOwed;
  return n;
}

/** Góp nợ ngân hàng đến hạn tháng này (Kế hoạch 3 — ngân hàng điền vào). */
export function loanInstallmentsDue(world: WorldState): number {
  return world.loans.filter((l) => isDue(world, l)).reduce((n, l) => n + Math.min(l.installment, l.totalDue - l.paid), 0);
}

function isDue(world: WorldState, l: Loan): boolean {
  return (l.firstDueMonth ?? 0) <= world.month;
}

/** Lập bảng kết toán: số liệu 7 ngày gần nhất + lương còn nợ + góp nợ đến hạn. */
export function buildSettlement(world: WorldState): Settlement {
  const days = world.history.slice(-BALANCE.MONTH_DAYS);
  const sum = (k: 'revenue' | 'ingredientCost' | 'marketing' | 'commission') => days.reduce((n, d) => n + (d[k] ?? 0), 0);
  const wages = owedWages(world);
  const rent = 0;
  const loanDue = loanInstallmentsDue(world);
  return {
    month: world.month,
    revenue: sum('revenue'),
    ingredientCost: sum('ingredientCost'),
    marketing: sum('marketing'),
    commission: sum('commission'),
    wages,
    rent,
    loanDue,
    totalDue: wages + rent + loanDue,
  };
}

const pendingEvents = new WeakMap<WorldState, SimEvent[]>();

/** Lấy (và xoá) các sự kiện kết toán sinh ra từ thao tác của người chơi (vay, bán máy…). */
export function drainSettleEvents(world: WorldState): SimEvent[] {
  const ev = pendingEvents.get(world) ?? [];
  pendingEvents.delete(world);
  return ev;
}

/** Thử kết toán sau một thao tác của người chơi: sự kiện được giữ lại để máy chủ phát cho mọi người. */
export function trySettleAfterAction(world: WorldState): void {
  const ev = trySettle(world);
  if (ev.length) pendingEvents.set(world, [...(pendingEvents.get(world) ?? []), ...ev]);
}

/** Đang kết toán và đủ tiền → trả hết, đóng kết toán, sang tháng mới. */
export function trySettle(world: WorldState): SimEvent[] {
  const st = world.settlement;
  if (!st) return [];
  // Số phải trả có thể đổi (vừa vay thêm / trả sớm) → tính lại phần nợ.
  st.loanDue = loanInstallmentsDue(world);
  st.wages = owedWages(world);
  st.totalDue = st.wages + st.rent + st.loanDue;
  if (world.money < st.totalDue) {
    // Hết đường xoay: không vay thêm được, không còn máy để bán → phá sản.
    const anySellable = (Object.keys(world.shops) as ShopId[]).some((id) => sellableStations(world, id).length > 0);
    // Hạn mức còn dưới mức vay tối thiểu thì coi như không vay được nữa.
    if (maxLoan(world) < BALANCE.LOAN_MIN && !anySellable) {
      bankrupt(world);
      return [{ type: 'bankrupt' }];
    }
    return [];
  }

  world.money -= st.totalDue;
  for (const id of Object.keys(world.shops) as ShopId[]) for (const s of world.shops[id].staff) s.wageOwed = 0;
  payInstallments(world);
  world.months.push({ ...st });
  while (world.months.length > MONTHS_KEPT) world.months.shift();
  addLog(world, `Đã kết toán tháng ${st.month}: trả ${formatK(st.totalDue)}`);
  world.settlement = null;
  world.month += 1;
  return [{ type: 'monthClosed', month: st.month }];
}

/** Trả góp mỗi khoản vay 1 kỳ; khoản trả hết thì xoá. */
function payInstallments(world: WorldState): void {
  for (const l of world.loans) {
    if (!isDue(world, l)) continue;
    l.paid += Math.min(l.installment, l.totalDue - l.paid);
    l.monthsLeft = Math.max(0, l.monthsLeft - 1);
  }
  world.loans = world.loans.filter((l) => l.paid < l.totalDue);
}

/** Máy bán được: đã mở, không phải bộ khởi đầu, không có máy đang mở nào cần nó. */
export function sellableStations(world: WorldState, shopId: ShopId): { instanceId: string; refund: number }[] {
  const shop = world.shops[shopId];
  const layout = SHOPS[shopId];
  // Kệ và máy làm món của một dây chuyền đang có phụ bếp: không bán (phụ bếp sẽ mất việc mà vẫn ăn lương).
  const staffedLines = new Set(shop.staff.filter((s) => s.role === 'cook' && s.item).map((s) => s.item));
  const hasCourier = shop.staff.some((s) => s.role === 'courier');
  const busy = (def: ReturnType<typeof getStationDef>) =>
    (def.kind === 'display' && staffedLines.has(def.item)) ||
    ((def.kind === 'producer' || def.kind === 'assembler') && staffedLines.has(def.output)) ||
    (def.kind === 'pickup' && hasCourier);
  return layout.stations
    .filter((p) => p.unlockCost > 0 && shop.stations[p.instanceId].unlocked && !busy(getStationDef(p.def)))
    .filter((p) => !layout.stations.some((o) => shop.stations[o.instanceId].unlocked && o.requires.includes(p.instanceId)))
    .map((p) => ({ instanceId: p.instanceId, refund: sellRefund(world, shopId, p.instanceId) }));
}

function sellRefund(world: WorldState, shopId: ShopId, instanceId: string): number {
  const st = world.shops[shopId].stations[instanceId];
  return Math.round(BALANCE.SELL_RATIO * (stationValue(shopId, instanceId) + st.upgradeSpent));
}

/** forMonth: nút trong bảng kết toán gửi kèm tháng; kết toán đã đóng / khác tháng → NO_SETTLEMENT (chống bấm 2 lần). */
export function settlementMismatch(world: WorldState, forMonth: unknown): boolean {
  return forMonth !== undefined && (!world.settlement || world.settlement.month !== forMonth);
}

export function sellStation(world: WorldState, shopId: ShopId, instanceId: unknown, byPlayerId: string, forMonth?: unknown): ActionResult {
  if (settlementMismatch(world, forMonth)) return { ok: false, error: 'NO_SETTLEMENT' };
  if (typeof instanceId !== 'string' || !sellableStations(world, shopId).some((x) => x.instanceId === instanceId))
    return { ok: false, error: 'NOT_SELLABLE' };
  const refund = sellRefund(world, shopId, instanceId);
  const st = world.shops[shopId].stations[instanceId];
  Object.assign(st, {
    unlocked: false, paid: 0, level: 0, upgradeSpent: 0, outputCount: 0, inputs: {}, stock: 0,
    progress: 0, running: false, blocked: null, tileOccupant: null,
  });
  world.money += refund;
  const placed = SHOPS[shopId].stations.find((p) => p.instanceId === instanceId)!;
  if (getStationDef(placed.def).kind === 'pickup') clearOnline(world, shopId);
  else dropUnsellableOrders(world, shopId);
  addLog(world, `${playerName(world, byPlayerId)} đã bán ${getStationDef(placed.def).name}, thu ${formatK(refund)}`);
  trySettleAfterAction(world);
  return { ok: true };
}

/** Phá sản: quán về như lúc mới mở; giữ mã quán và mọi nhân vật (tên, màu), mất nâng cấp. */
export function bankrupt(world: WorldState): void {
  const fresh = createWorld(world.code, world.rngState);
  const players = world.players;
  const entrance = SHOPS.banh_mi.entrance;
  for (const p of Object.values(players)) {
    Object.assign(p, {
      x: entrance.x, z: entrance.z, carry: [], carryLevel: 0, speedLevel: 0,
      carryCap: BALANCE.PLAYER_CARRY_CAPS[0], speed: BALANCE.PLAYER_SPEED,
      dropCd: 0, pickTimer: 0, pickAt: null, inMenu: false, input: { mx: 0, mz: 0 },
    });
  }
  Object.assign(world, fresh, { players });
  addLog(world, 'Quán phá sản — bắt đầu lại từ xe bánh mì');
}
