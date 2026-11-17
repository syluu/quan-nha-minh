import { formatK } from '@qnm/shared';
import type { DaySummary } from '@qnm/shared';
import { formatStars } from './hud';

export function summaryRows(d: DaySummary): [string, string][] {
  return [
    ['Doanh thu', formatK(d.revenue)],
    ['Tiền nguyên liệu', formatK(-d.ingredientCost)],
    ['Lương nhân viên', formatK(-d.wages)],
    ['Lãi hoạt động', formatK(d.operatingProfit)],
    ['Hàng bỏ thùng rác', formatK(-d.wasted)],
    ['Chi mở rộng', formatK(-d.unlockSpend)],
    ['Khách đã phục vụ', String(d.served)],
    ['Khách bỏ về', String(d.lost)],
    ['Đánh giá', formatStars(d.stars)],
  ];
}

/** Bảng tổng kết cuối ngày; game vẫn chạy, đóng khi bấm hoặc sau 8 giây. */
export function showDaySummary(root: HTMLElement, d: DaySummary): void {
  root.querySelector('.summary')?.remove();
  const box = document.createElement('div');
  box.className = 'summary';
  box.innerHTML = `<h2>Tổng kết ngày ${d.day}</h2><table>${summaryRows(d)
    .map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`)
    .join('')}</table><p>Bấm để đóng</p>`;
  const close = () => box.remove();
  box.onclick = close;
  setTimeout(close, 8000);
  root.append(box);
}
