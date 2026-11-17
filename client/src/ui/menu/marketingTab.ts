import type { Snapshot } from '@qnm/shared';
import type { GameConnection } from '../../net';
import type { MenuTab } from './menu';
import { marketingView } from './views';

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
        const k = JSON.stringify(v);
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
          <p>Lượng khách hiện tại: <b>${v.multiplier}</b> <span class="muted">(chạy chồng nhiều chiến dịch thì hiệu quả giảm dần)</span></p>`;
        body.querySelectorAll<HTMLButtonElement>('[data-run]').forEach((b) => (b.onclick = () => conn.runCampaign(b.dataset.run as never)));
      };
      render();
      const t = setInterval(render, 300);
      return () => clearInterval(t);
    },
  };
}
