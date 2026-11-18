import { festivalOfDay, formatK } from '@qnm/shared';
import type { DaySummary } from '@qnm/shared';
import { formatStars } from './hud';

export function summaryRows(d: DaySummary): [string, string][] {
  return [
    ['Doanh thu', formatK(d.revenue)],
    ['Tiền nguyên liệu', formatK(-d.ingredientCost)],
    ['Lương nhân viên', formatK(-d.wages)],
    ['Hoa hồng app', formatK(-(d.commission ?? 0))],
    ['Lãi hoạt động', formatK(d.operatingProfit)],
    ['Hàng bỏ thùng rác', formatK(-d.wasted)],
    ['Chi mở rộng', formatK(-d.unlockSpend)],
    ['Khách đã phục vụ', String(d.served)],
    ['Đơn online (huỷ)', `${d.onlineOrders ?? 0} (${d.onlineCancelled ?? 0})`],
    ['Khách bỏ về', String(d.lost)],
    ['Tiền boa', formatK(d.tips ?? 0)],
    ['Đánh giá', formatStars(d.stars)],
  ];
}

/** Tờ báo cuối ngày: tít chính theo điều nổi bật nhất trong ngày, vài tin phụ, bảng vinh danh người nhà. */
export function newspaper(d: DaySummary) {
  const fest = festivalOfDay(d.day);
  const headline =
    fest ? `${fest.icon} ${fest.name}: phố ẩm thực đông nghịt, quán nhà mình bán ${d.served} phần!`
    : d.lost === 0 && d.served >= 20 ? `Không một khách nào phải về tay không suốt ngày ${d.day}!`
    : (d.bestCombo ?? 0) >= 10 ? `Tay nhanh như chớp: ${d.bestCombo} khách được phục vụ liền một mạch!`
    : d.stars >= 4.5 ? `Quán nhà mình được khen hết lời: ${formatStars(d.stars)}!`
    : d.weather === 'rain' ? `Mưa tầm tã vẫn có ${d.served} khách ghé quán`
    : (d.tips ?? 0) >= 50_000 ? `Khách thương, boa tới ${formatK(d.tips)}!`
    : d.operatingProfit < 0 ? 'Một ngày khó khăn — cả nhà quyết tâm ngày mai bán đắt hơn!'
    : `Một ngày bận rộn: ${d.served} khách ghé quán`;
  const sub: string[] = [];
  if (d.operatingProfit > 0) sub.push(`Lãi ${formatK(d.operatingProfit)} trong ngày`);
  if ((d.tips ?? 0) > 0) sub.push(`Khách boa ${formatK(d.tips)}`);
  if ((d.bestCombo ?? 0) >= 5) sub.push(`Combo dài nhất ×${d.bestCombo}`);
  if ((d.onlineOrders ?? 0) > 0) sub.push(`${d.onlineOrders} đơn online đã giao`);
  if (d.lost > 0) sub.push(`${d.lost} khách bỏ về vì chờ lâu`);
  const players = d.players ?? [];
  const awards: { title: string; name: string; value: string }[] = [];
  const award = (title: string, key: 'placed' | 'served' | 'cleaned' | 'crates', unit: string) => {
    const best = [...players].sort((a, b) => b[key] - a[key])[0];
    if (best && best[key] > 0) awards.push({ title, name: best.name, value: `${best[key]} ${unit}` });
  };
  award('🥖 Vua bê hàng', 'placed', 'món');
  award('💵 Thu ngân thần tốc', 'served', 'khách');
  award('🧽 Dọn bàn chăm nhất', 'cleaned', 'chỗ');
  award('🚜 Nông dân giỏi', 'crates', 'thùng');
  return { headline, sub, awards };
}

/** Báo cuối ngày; game vẫn chạy, đóng khi bấm hoặc sau 12 giây. */
export function showDaySummary(root: HTMLElement, d: DaySummary): void {
  root.querySelector('.summary')?.remove();
  const n = newspaper(d);
  const box = document.createElement('div');
  box.className = 'summary paper';
  box.innerHTML = `
    <div class="paper-mast"><span>BÁO PHỐ ẨM THỰC</span><span>Số ra ngày ${d.day}${d.weather === 'rain' ? ' · 🌧️' : ' · ☀️'}</span></div>
    <h2 class="paper-head">${n.headline}</h2>
    ${n.sub.length ? `<p class="paper-sub">${n.sub.join(' · ')}</p>` : ''}
    ${
      n.awards.length
        ? `<div class="paper-awards">${n.awards.map((a) => `<div><b>${a.title}</b><span>${a.name} · ${a.value}</span></div>`).join('')}</div>`
        : ''
    }
    <details><summary>Sổ sách trong ngày</summary><table>${summaryRows(d)
      .map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`)
      .join('')}</table></details>
    <p class="muted">Bấm ra ngoài để đóng</p>`;
  const close = () => box.remove();
  box.onclick = (e) => {
    if ((e.target as HTMLElement).closest('details')) return;
    close();
  };
  setTimeout(close, 12000);
  root.append(box);
}
