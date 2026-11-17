import type { Snapshot } from '@qnm/shared';
import type { GameConnection } from '../../net';
import type { MenuTab } from './menu';
import { costumeView } from './views';

/** Tab Trang phục: mua bằng ví chung (của riêng mình), mặc lại miễn phí. Phá sản vẫn giữ đồ đã mua. */
export function costumeTab(conn: GameConnection, latest: () => Snapshot | null, myId: string): MenuTab {
  return {
    id: 'costume',
    title: '👕 Trang phục',
    mount(body) {
      let key = '';
      const render = () => {
        const s = latest();
        if (!s) return;
        const v = costumeView(s, myId);
        const k = JSON.stringify(v);
        if (k === key) return;
        key = k;
        body.innerHTML = `
          ${v
            .map(
              (slot) => `<h3>${slot.title}</h3><div class="costumes">${slot.items
                .map(
                  (c) => `<div class="costume ${c.state}">
                    <span class="swatch" style="background:${c.swatch}"></span>
                    <b>${c.name}</b><span class="muted">${c.state === 'buy' ? c.price : c.state === 'wearing' ? 'Đang mặc' : 'Đã có'}</span>
                    ${
                      c.state === 'wearing'
                        ? ''
                        : c.state === 'owned'
                          ? `<button data-wear="${c.id}">Mặc</button>`
                          : `<button class="primary" data-buy="${c.id}" ${c.affordable ? '' : 'disabled'}>Mua & mặc</button>`
                    }</div>`,
                )
                .join('')}</div>`,
            )
            .join('')}
          <p class="note">Tiền lấy từ ví chung, đồ thuộc về người mua. Đồ đã mua đổi mặc lại miễn phí và vẫn giữ khi quán phá sản.</p>`;
        body.querySelectorAll<HTMLButtonElement>('[data-buy]').forEach((b) => (b.onclick = () => conn.buyCostume(b.dataset.buy!)));
        body.querySelectorAll<HTMLButtonElement>('[data-wear]').forEach((b) => (b.onclick = () => conn.wearCostume(b.dataset.wear!)));
      };
      render();
      const t = setInterval(render, 300);
      return () => clearInterval(t);
    },
  };
}
