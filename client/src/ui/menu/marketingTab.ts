import { isFarm } from '@qnm/shared';
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
        if (isFarm(s.shopId)) {
          if (key !== 'farm') body.innerHTML = '<p class="note">Không áp dụng ở trang trại — đi tới một quán (Bản đồ) để chỉnh.</p>';
          key = 'farm';
          return;
        }
        const v = marketingView(s);
        const o = onlineView(s);
        const k = JSON.stringify([v, o]);
        if (k === key) return;
        key = k;
        body.innerHTML = `
          <p class="mk-sum">Lượng khách tại quán: <b>${v.multiplier}</b> · Đơn online: <b>${v.onlineMultiplier}</b>
            <span class="muted">(chạy chồng nhiều chiến dịch thì hiệu quả giảm dần)</span></p>
          <h3>Quảng cáo ngắn ngày</h3>
          <div class="cards">${v.cards
            .map(
              (c) => `<div class="card mk-card${c.running ? ' on' : ''}">
                <div class="mk-head"><span class="mk-icon">${c.icon}</span><b>${c.name}</b></div>
                <div class="muted">${c.desc}</div>
                <div class="mk-eff">${c.effect}</div>
                <div class="muted">${c.days} · ${c.cost}${c.running ? ` · <b class="pos">đang chạy, còn ${c.running} ngày</b>` : ''}</div>
                <button class="primary" data-run="${c.id}" ${c.affordable ? '' : 'disabled'}>${c.running ? 'Gia hạn' : 'Chạy'} (${c.cost})</button></div>`,
            )
            .join('')}</div>
          <h3>Đầu tư lâu dài <span class="muted">(mua một lần, tác dụng mãi cho quán này)</span></h3>
          <div class="cards">${v.perm
            .map(
              (a) => `<div class="card mk-card${a.owned ? ' on' : ''}">
                <div class="mk-head"><span class="mk-icon">${a.icon}</span><b>${a.name}</b></div>
                <div class="muted">${a.desc}</div>
                <div class="mk-eff">${a.effect}</div>
                ${a.owned ? '<b class="pos">✓ Đã có</b>' : `<button class="primary" data-perm="${a.id}" ${a.affordable ? '' : 'disabled'}>Lắp đặt (${a.cost})</button>`}</div>`,
            )
            .join('')}</div>
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
        body.querySelectorAll<HTMLButtonElement>('[data-perm]').forEach((b) => (b.onclick = () => conn.buyAd(b.dataset.perm as never)));
      };
      render();
      const t = setInterval(render, 300);
      return () => clearInterval(t);
    },
  };
}
