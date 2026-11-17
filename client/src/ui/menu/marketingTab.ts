import type { Snapshot } from '@qnm/shared';
import type { GameConnection } from '../../net';
import type { MenuTab } from './menu';
import { marketingView, onlineView } from './views';

/** Tab Quảng cáo: 3 chiến dịch, đang chạy gì, lượng khách hiện được nhân bao nhiêu. */
export function marketingTab(conn: GameConnection, latest: () => Snapshot | null): MenuTab {
  return {
    id: 'marketing',
    title: '📣 Quảng cáo',
    mount(body) {
      let key = '';
      const render = () => {
        const s = latest();
        if (!s) return;
        const v = marketingView(s);
        const o = onlineView(s);
        const k = JSON.stringify([v, o]);
        if (k === key) return;
        key = k;
        body.innerHTML = `
          <h3>Chạy quảng cáo</h3>
          <div class="cards">${v.cards
            .map(
              (c) => `<div class="card"><b>${c.name}</b><div>${c.effect}</div><div class="muted">${c.days} · ${c.cost}</div>
              <button class="primary" data-run="${c.id}">Chạy (${c.cost})</button></div>`,
            )
            .join('')}</div>
          <h3>Đang chạy</h3>
          <p>${v.running.length ? v.running.map((r) => `${r.name}: còn <b>${r.daysLeft}</b> ngày`).join(' · ') : 'Chưa có chiến dịch nào.'}</p>
          <p>Lượng khách hiện tại: <b>${v.multiplier}</b> <span class="muted">(chạy chồng nhiều chiến dịch thì hiệu quả giảm dần)</span></p>
          <h3>🛵 Bán online qua app giao đồ ăn</h3>
          ${
            o.registered
              ? `<p>Trạng thái: <b>${o.status}</b> · Shipper: ${o.vehicle} · Đơn chờ: <b>${o.pending}</b></p>
                 <p>Hôm nay: <b>${o.ordersToday}</b> đơn xong, <b>${o.cancelledToday}</b> đơn huỷ · App thu hoa hồng ${o.commission}</p>
                 <button class="${o.paused ? 'primary' : ''}" data-pause="${!o.paused}">${o.paused ? 'Nhận đơn lại' : 'Tạm ngưng nhận đơn'}</button>
                 <p class="note">Shipper đứng ở mép phải quán, cạnh điểm giao. Bê món ra đặt lên điểm giao. Chờ quá lâu shipper sẽ bỏ đi và quán bị trừ sao.</p>`
              : `<p class="muted">${o.hint}</p>`
          }`;
        body.querySelectorAll<HTMLButtonElement>('[data-pause]').forEach((b) => (b.onclick = () => conn.setOnlinePaused(b.dataset.pause === 'true')));
        body.querySelectorAll<HTMLButtonElement>('[data-run]').forEach((b) => (b.onclick = () => conn.runCampaign(b.dataset.run as never)));
      };
      render();
      const t = setInterval(render, 300);
      return () => clearInterval(t);
    },
  };
}
