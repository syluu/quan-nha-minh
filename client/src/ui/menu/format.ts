import { ITEMS, formatK } from '@qnm/shared';
import type { DaySummary, ItemId, Report } from '@qnm/shared';
import { formatStars } from '../hud';

export const REPORT_COLUMNS = ['Doanh thu', 'Nguyên liệu', 'Lương', 'Bỏ đi', 'Hoa hồng', 'Lãi hoạt động', 'Mở rộng', 'Khách', 'Đơn online', 'Đơn huỷ', 'Bỏ về', 'Sao'];

function cells(d: DaySummary): string[] {
  return [
    formatK(d.revenue),
    formatK(-d.ingredientCost),
    formatK(-d.wages),
    formatK(-d.wasted),
    formatK(-(d.commission ?? 0)),
    formatK(d.operatingProfit),
    formatK(-d.unlockSpend),
    String(d.served),
    String(d.onlineOrders ?? 0),
    String(d.onlineCancelled ?? 0),
    String(d.lost),
    formatStars(d.stars),
  ];
}

/** Bảng báo cáo: hôm nay trước, rồi các ngày từ mới đến cũ. */
export function reportRows(r: Report): { day: string; cells: string[] }[] {
  return [
    { day: `Hôm nay (ngày ${r.today.day})`, cells: cells(r.today) },
    ...[...r.history].reverse().map((d) => ({ day: `Ngày ${d.day}`, cells: cells(d) })),
  ];
}

/** Cột biểu đồ doanh thu/lãi cho n ngày gần nhất (gồm hôm nay); chiều cao theo giá trị lớn nhất. */
export function chartBars(r: Report, n = 14): { day: number; revenue: number; profit: number; hRevenue: number; hProfit: number }[] {
  const days = [...r.history, r.today].slice(-n);
  const max = Math.max(1, ...days.flatMap((d) => [Math.abs(d.revenue), Math.abs(d.operatingProfit)]));
  return days.map((d) => ({
    day: d.day,
    revenue: d.revenue,
    profit: d.operatingProfit,
    hRevenue: d.revenue / max,
    hProfit: d.operatingProfit / max,
  }));
}

export function soldList(s: DaySummary): { name: string; count: number }[] {
  return (Object.entries(s.sold) as [ItemId, number][])
    .filter(([, n]) => n > 0)
    .map(([id, count]) => ({ name: ITEMS[id]?.name ?? id, count }))
    .sort((a, b) => b.count - a.count);
}
