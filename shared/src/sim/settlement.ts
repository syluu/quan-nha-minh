import { BALANCE } from '../content';
import type { ShopId } from '../content';
import { formatK } from '../money';
import type { SimEvent } from './events';
import { addLog } from './log';
import type { Settlement, WorldState } from './world';

const MONTHS_KEPT = 12;

function owedWages(world: WorldState): number {
  let n = 0;
  for (const id of Object.keys(world.shops) as ShopId[]) for (const s of world.shops[id].staff) n += s.wageOwed;
  return n;
}

/** Góp nợ ngân hàng đến hạn tháng này (Kế hoạch 3 — ngân hàng điền vào). */
export function loanInstallmentsDue(world: WorldState): number {
  return world.loans.reduce((n, l) => n + Math.min(l.installment, l.totalDue - l.paid), 0);
}

/** Lập bảng kết toán: số liệu 7 ngày gần nhất + lương còn nợ + góp nợ đến hạn. */
export function buildSettlement(world: WorldState): Settlement {
  const days = world.history.slice(-BALANCE.MONTH_DAYS);
  const sum = (k: 'revenue' | 'ingredientCost' | 'marketing') => days.reduce((n, d) => n + (d[k] ?? 0), 0);
  const wages = owedWages(world);
  const rent = 0;
  const loanDue = loanInstallmentsDue(world);
  return {
    month: world.month,
    revenue: sum('revenue'),
    ingredientCost: sum('ingredientCost'),
    marketing: sum('marketing'),
    wages,
    rent,
    loanDue,
    totalDue: wages + rent + loanDue,
  };
}

/** Đang kết toán và đủ tiền → trả hết, đóng kết toán, sang tháng mới. */
export function trySettle(world: WorldState): SimEvent[] {
  const st = world.settlement;
  if (!st) return [];
  // Số phải trả có thể đổi (vừa vay thêm / trả sớm) → tính lại phần nợ.
  st.loanDue = loanInstallmentsDue(world);
  st.wages = owedWages(world);
  st.totalDue = st.wages + st.rent + st.loanDue;
  if (world.money < st.totalDue) return [];

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
    l.paid += Math.min(l.installment, l.totalDue - l.paid);
    l.monthsLeft = Math.max(0, l.monthsLeft - 1);
  }
  world.loans = world.loans.filter((l) => l.paid < l.totalDue);
}
