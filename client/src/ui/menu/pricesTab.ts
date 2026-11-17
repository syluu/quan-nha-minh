import { formatK, isFarm } from '@qnm/shared';
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
      // Giá vừa bấm nhưng máy chủ chưa xác nhận: bấm nhanh nhiều lần vẫn cộng dồn đúng.
      const pending = new Map<string, { value: number; at: number }>();
      const PENDING_MS = 1500;
      const render = () => {
        const s = latest();
        if (!s || dragging) return;
        if (isFarm(s.shopId)) {
          if (key !== 'farm') body.innerHTML = '<p class="note">Không áp dụng ở trang trại — đi tới một quán (Bản đồ) để chỉnh.</p>';
          key = 'farm';
          return;
        }
        const v = priceView(s);
        for (const p of v) {
          const pend = pending.get(p.item);
          if (pend && (pend.value === p.value || Date.now() - pend.at > PENDING_MS)) pending.delete(p.item);
        }
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
            send(Number(range.value));
          };
          const send = (value: number) => {
            const next = Math.min(p.max, Math.max(p.min, value));
            pending.set(p.item, { value: next, at: Date.now() });
            range.value = String(next);
            out.textContent = formatK(next);
            conn.setPrice(item, next);
          };
          row.querySelectorAll<HTMLButtonElement>('[data-step]').forEach((b) => {
            b.onclick = () => send((pending.get(p.item)?.value ?? p.value) + Number(b.dataset.step));
          });
          row.querySelector<HTMLButtonElement>('[data-reset]')!.onclick = () => send(p.base);
        });
      };
      render();
      const t = setInterval(render, 300);
      return () => clearInterval(t);
    },
  };
}
