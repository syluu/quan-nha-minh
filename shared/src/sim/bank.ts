import { BALANCE, SHOP_META, SHOPS } from '../content';
import type { ShopId } from '../content';
import { formatK } from '../money';
import type { ActionResult } from './actions';
import { addLog, playerName } from './log';
import { settlementMismatch, trySettleAfterAction } from './settlement';
import type { WorldState } from './world';

/** Giá trị một máy: giá mở khoá, riêng bộ khởi đầu dùng STARTER_VALUES. */
export function stationValue(shopId: ShopId, instanceId: string): number {
  const p = SHOPS[shopId].stations.find((s) => s.instanceId === instanceId);
  if (!p) return 0;
  return p.unlockCost > 0 ? p.unlockCost : BALANCE.STARTER_VALUES[instanceId] ?? 0;
}

/**
 * Giá trị một quán đang có: máy đã mở + tiền nâng cấp. Mặt bằng thuê thì bộ khởi đầu đã nằm trong
 * tiền cọc → tính cọc thay cho giá trị bộ khởi đầu.
 */
export function shopAssetValue(world: WorldState, shopId: ShopId): number {
  const shop = world.shops[shopId];
  if (!shop.owned) return 0;
  const deposit = SHOP_META[shopId].deposit;
  let n = deposit;
  for (const p of SHOPS[shopId].stations) {
    const st = shop.stations[p.instanceId];
    if (!st.unlocked) continue;
    n += st.upgradeSpent + (deposit > 0 && p.unlockCost === 0 ? 0 : stationValue(shopId, p.instanceId));
  }
  return n;
}

/** Tổng giá trị tài sản các quán đang có. */
export function assetValue(world: WorldState): number {
  return (Object.keys(world.shops) as ShopId[]).reduce((n, id) => n + shopAssetValue(world, id), 0);
}

export function debtRemaining(world: WorldState): number {
  return world.loans.reduce((n, l) => n + (l.totalDue - l.paid), 0);
}

/** Hạn mức còn vay được, làm tròn xuống bội số LOAN_STEP. */
export function maxLoan(world: WorldState): number {
  const cap = Math.max(BALANCE.LOAN_MIN_CAP, BALANCE.LOAN_ASSET_RATIO * assetValue(world)) - debtRemaining(world);
  return Math.max(0, Math.floor(cap / BALANCE.LOAN_STEP) * BALANCE.LOAN_STEP);
}

export function loanTerms(amount: number, months: number): { totalDue: number; installment: number } {
  const totalDue = Math.round(amount * (1 + BALANCE.LOAN_TERMS[months]));
  return { totalDue, installment: Math.ceil(totalDue / months / 1000) * 1000 };
}

export function takeLoan(world: WorldState, amount: unknown, months: unknown, byPlayerId: string, forMonth?: unknown): ActionResult {
  if (settlementMismatch(world, forMonth)) return { ok: false, error: 'NO_SETTLEMENT' };
  const bad = { ok: false, error: 'BAD_AMOUNT' } as const;
  if (typeof amount !== 'number' || !Number.isFinite(amount) || typeof months !== 'number') return bad;
  if (!(months in BALANCE.LOAN_TERMS)) return bad;
  if (amount < BALANCE.LOAN_MIN || amount % BALANCE.LOAN_STEP !== 0 || amount > maxLoan(world)) return bad;
  const { totalDue, installment } = loanTerms(amount, months);
  world.loans.push({
    id: `L${world.nextLoanId++}`,
    principal: amount,
    totalDue,
    paid: 0,
    installment,
    monthsLeft: months,
    takenDay: world.day,
    firstDueMonth: world.settlement ? world.month + 1 : world.month,
  });
  world.money += amount;
  addLog(world, `${playerName(world, byPlayerId)} vay ${formatK(amount)}, kỳ ${months} tháng (tổng trả ${formatK(totalDue)})`);
  trySettleAfterAction(world);
  return { ok: true };
}

/** Trả hết một khoản vay trước hạn, không phạt. */
export function repayLoan(world: WorldState, loanId: unknown, byPlayerId: string): ActionResult {
  const l = world.loans.find((x) => x.id === loanId);
  if (!l) return { ok: false, error: 'NOT_FOUND' };
  const remaining = l.totalDue - l.paid;
  if (world.money < remaining) return { ok: false, error: 'NO_MONEY' };
  world.money -= remaining;
  world.loans = world.loans.filter((x) => x !== l);
  addLog(world, `${playerName(world, byPlayerId)} trả hết khoản vay ${formatK(l.principal)} (${formatK(remaining)})`);
  trySettleAfterAction(world);
  return { ok: true };
}
