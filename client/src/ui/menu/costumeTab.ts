import { DEFAULT_OUTFIT } from '@qnm/shared';
import type { Outfit, Snapshot } from '@qnm/shared';
import type { GameConnection } from '../../net';
import { createOutfitPreview } from '../../render/outfitPreview';
import type { OutfitPreview } from '../../render/outfitPreview';
import type { MenuTab } from './menu';
import { costumeView, tryOnSummary } from './views';

/**
 * Tab Trang phục: bấm vào món để **mặc thử** (khung xem trước 3D bên trái, chưa mất tiền),
 * ưng thì "Mua & mặc cả bộ". Tiền từ ví chung, đồ thuộc về người mua, phá sản vẫn giữ.
 */
export function costumeTab(conn: GameConnection, latest: () => Snapshot | null, myId: string): MenuTab {
  return {
    id: 'costume',
    title: '👕 Trang phục',
    mount(body) {
      body.innerHTML = `
        <div class="costume-layout">
          <div class="try-col">
            <div class="try-3d"></div>
            <div class="try-info"></div>
          </div>
          <div class="costume-catalog"></div>
        </div>`;
      const host = body.querySelector<HTMLElement>('.try-3d')!;
      const info = body.querySelector<HTMLElement>('.try-info')!;
      const catalog = body.querySelector<HTMLElement>('.costume-catalog')!;
      let preview: OutfitPreview | null | undefined;
      let trial: Outfit | null = null;
      let key = '';

      const mine = (s: Snapshot) => s.players.find((p) => p.id === myId);

      const render = () => {
        const s = latest();
        if (!s) return;
        const me = mine(s);
        if (!trial) trial = { ...DEFAULT_OUTFIT, ...(me?.outfit ?? {}) };
        if (preview === undefined) {
          preview = createOutfitPreview(host, me?.color ?? 0x2f6db5);
          if (!preview) host.innerHTML = '<p class="muted">Máy này không xem trước 3D được — nhân vật sẽ mặc ngay khi mua.</p>';
        }
        preview?.setOutfit(trial);
        const v = costumeView(s, myId, trial);
        const t = tryOnSummary(s, myId, trial);
        const k = JSON.stringify([v, t]);
        if (k === key) return;
        key = k;

        info.innerHTML = t.changed
          ? `<b>Đang mặc thử</b>
             <ul>${t.changes.map((c) => `<li>${c.label}</li>`).join('')}</ul>
             <div>Cần trả: <b>${t.totalText}</b></div>
             <button class="primary" data-take ${t.canBuy ? '' : 'disabled'}>${t.total > 0 ? `Mua & mặc cả bộ (${t.totalText})` : 'Mặc bộ này'}</button>
             <button data-reset>Bỏ thử</button>
             ${t.reason ? `<div class="neg">${t.reason}</div>` : ''}`
          : '<b>Xem trước</b><div class="muted">Bấm vào món bên phải để mặc thử. Kéo khung để xoay nhân vật.</div>';

        catalog.innerHTML = v
          .map(
            (slot) => `<h3>${slot.title}</h3><div class="costumes">${slot.items
              .map(
                (c) => `<div class="costume ${c.state}${c.trying ? ' trying' : ''}" data-try="${c.id}" data-slot="${slot.slot}" title="Bấm để mặc thử">
                  <span class="swatch" style="background:${c.swatch}">${c.icon}</span>
                  <b>${c.name}</b><span class="muted">${c.state === 'buy' ? c.price : c.state === 'wearing' ? 'Đang mặc' : 'Đã có'}${c.trying && c.state !== 'wearing' ? ' · đang thử' : ''}</span>
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
          .join('');
      };

      // Bấm vào ô món = mặc thử; bấm nút trong ô = mua/mặc thật.
      catalog.addEventListener('click', (e) => {
        const el = e.target as HTMLElement;
        const btn = el.closest<HTMLButtonElement>('button');
        if (btn?.dataset.buy) return conn.buyCostume(btn.dataset.buy);
        if (btn?.dataset.wear) return conn.wearCostume(btn.dataset.wear);
        const card = el.closest<HTMLElement>('[data-try]');
        if (!card || !trial) return;
        trial = { ...trial, [card.dataset.slot as keyof Outfit]: card.dataset.try! };
        render();
      });
      info.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
        const s = latest();
        if (!btn || !s || !trial) return;
        if (btn.dataset.reset !== undefined) {
          trial = { ...DEFAULT_OUTFIT, ...(mine(s)?.outfit ?? {}) };
          render();
        } else if (btn.dataset.take !== undefined && !btn.disabled) {
          btn.disabled = true;
          for (const c of tryOnSummary(s, myId, trial).changes) (c.owned ? conn.wearCostume : conn.buyCostume)(c.id);
        }
      });

      render();
      const timer = setInterval(render, 300);
      return () => {
        clearInterval(timer);
        preview?.dispose();
      };
    },
  };
}
