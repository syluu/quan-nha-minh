import { formatK } from '@qnm/shared';
import type { Report } from '@qnm/shared';
import type { GameConnection } from '../../net';
import type { MenuTab } from './menu';
import { REPORT_COLUMNS, chartBars, reportRows, soldList } from './format';

function chartSvg(r: Report): string {
  const bars = chartBars(r);
  const W = 560;
  const H = 160;
  const mid = H * 0.62;
  const slot = W / Math.max(bars.length, 1);
  const bw = Math.min(14, slot * 0.32);
  const scaleUp = mid - 14;
  const scaleDown = H - mid - 14;
  const rects = bars
    .map((b, i) => {
      const x = i * slot + slot / 2;
      const hr = Math.max(0, b.hRevenue) * scaleUp;
      const hp = b.hProfit * (b.hProfit >= 0 ? scaleUp : scaleDown);
      const py = b.hProfit >= 0 ? mid - hp : mid;
      return `
        <rect x="${x - bw - 1}" y="${mid - hr}" width="${bw}" height="${hr}" rx="2" class="bar-rev"><title>Ngày ${b.day}: doanh thu ${formatK(b.revenue)}</title></rect>
        <rect x="${x + 1}" y="${py}" width="${bw}" height="${Math.abs(hp)}" rx="2" class="${b.profit >= 0 ? 'bar-profit' : 'bar-loss'}"><title>Ngày ${b.day}: lãi ${formatK(b.profit)}</title></rect>
        <text x="${x}" y="${H - 2}" class="bar-label">${b.day}</text>`;
    })
    .join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Biểu đồ doanh thu và lãi 14 ngày">
    <line x1="0" x2="${W}" y1="${mid}" y2="${mid}" class="axis"/>${rects}</svg>
    <div class="legend"><span class="sw rev"></span>Doanh thu <span class="sw profit"></span>Lãi hoạt động <span class="sw loss"></span>Lỗ</div>`;
}

function render(body: HTMLElement, r: Report) {
  // Bảng rộng (cuộn ngang trên màn hẹp): vẽ lại 2 giây/lần không được kéo người xem về cột đầu.
  const left = body.querySelector('.table-wrap')?.scrollLeft ?? 0;
  const rows = reportRows(r);
  const sold = soldList(r.today);
  body.innerHTML = `
    <h3>Doanh thu & lãi 14 ngày</h3>
    ${chartSvg(r)}
    <h3>Báo cáo từng ngày</h3>
    <div class="table-wrap"><table class="report">
      <thead><tr><th>Ngày</th>${REPORT_COLUMNS.map((c) => `<th>${c}</th>`).join('')}</tr></thead>
      <tbody>${rows
        .map((row, i) => `<tr class="${i === 0 ? 'today' : ''}"><td>${row.day}</td>${row.cells.map((c) => `<td>${c}</td>`).join('')}</tr>`)
        .join('')}</tbody>
    </table></div>
    <p class="note">Lãi hoạt động = doanh thu − nguyên liệu − lương. "Hôm nay" tính lương dự kiến cho số nhân viên hiện có.</p>
    <h3>Hôm nay đã bán</h3>
    <p>${sold.length ? sold.map((s) => `${s.name}: <b>${s.count}</b>`).join(' · ') : 'Chưa bán được món nào.'}</p>`;
  const wrap = body.querySelector('.table-wrap');
  if (wrap) wrap.scrollLeft = left;
}

export function reportTab(conn: GameConnection): MenuTab {
  return {
    id: 'report',
    title: '📊 Báo cáo',
    mount(body) {
      body.innerHTML = '<p class="note">Đang tải báo cáo…</p>';
      let last = '';
      const off = conn.onReport((r) => {
        // Báo cáo không đổi thì không vẽ lại (đỡ giật, giữ chỗ đang xem).
        const k = JSON.stringify(r);
        if (k === last) return;
        last = k;
        render(body, r);
      });
      conn.requestReport();
      const timer = setInterval(() => conn.requestReport(), 2000);
      return () => {
        off();
        clearInterval(timer);
      };
    },
  };
}
