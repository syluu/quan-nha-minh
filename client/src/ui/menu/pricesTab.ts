import { formatK } from '@qnm/shared';
import type { Snapshot } from '@qnm/shared';
import type { GameConnection } from '../../net';
import type { MenuTab } from './menu';
import { priceView } from './views';

/** Tab Giá bán: −/+ 500đ, thanh trượt, về giá thị trường. */
export function pricesTab(conn: GameConnection, latest: () => Snapshot | null): MenuTab {
  return {
    id: 'prices',
    title: '🏷️ Giá bán',
    mount(body) {
      let key = '';
      let dragging = false;
      const render = () => {
        const s = latest();
        if (!s || dragging) return;
        const v = priceView(s);
        const k = JSON.stringify(v);
        if (k === key) return;
        key = k;
        body.innerHTML = `
          <h3>Giá bán từng món</h3>
          <p class="note">Khách thường chấp nhận khoảng 80–130% giá thị trường. Giá cao: lãi mỗi món nhiều hơn nhưng ít khách mua hơn.</p>
          <div class="prices">${v
            .map(
              (p) => `
            <div class="price-row" data-item="${p.item}">
              <div class="pname"><b>${p.name}</b><span class="muted">Thị trường ${p.market}</span></div>
              <button data-step="-500" aria-label="Giảm giá">−</button>
              <input type="range" min="${p.min}" max="${p.max}" step="500" value="${p.value}" aria-label="Giá ${p.name}" />
              <button data-step="500" aria-label="Tăng giá">+</button>
              <output>${p.current}</output>
              <button class="reset" data-reset>Về giá thị trường</button>
            </div>`,
            )
            .join('')}</div>`;
        body.querySelectorAll<HTMLElement>('.price-row').forEach((row) => {
          const item = row.dataset.item as never;
          const p = v.find((x) => x.item === item)!;
          const range = row.querySelector<HTMLInputElement>('input')!;
          const out = row.querySelector('output')!;
          range.oninput = () => {
            dragging = true;
            out.textContent = formatK(Number(range.value));
          };
          range.onchange = () => {
            dragging = false;
            conn.setPrice(item, Number(range.value));
          };
          row.querySelectorAll<HTMLButtonElement>('[data-step]').forEach((b) => {
            b.onclick = () => conn.setPrice(item, p.value + Number(b.dataset.step));
          });
          row.querySelector<HTMLButtonElement>('[data-reset]')!.onclick = () => conn.setPrice(item, p.base);
        });
      };
      render();
      const t = setInterval(render, 300);
      return () => clearInterval(t);
    },
  };
}
