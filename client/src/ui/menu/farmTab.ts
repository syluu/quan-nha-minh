import type { Snapshot } from '@qnm/shared';
import type { GameConnection } from '../../net';
import type { MenuTab } from './menu';
import { farmView } from './views';

/** Tab Trang trại: mở rộng thêm đất (4 lô mỗi lần) và chọn trồng / nuôi gì ở từng lô. Dùng được ở mọi nơi. */
export function farmTab(conn: GameConnection, latest: () => Snapshot | null): MenuTab {
  return {
    id: 'farm',
    title: '🌾 Trang trại',
    mount(body) {
      let key = '';
      const render = () => {
        const s = latest();
        if (!s) return;
        const v = farmView(s);
        const k = JSON.stringify(v);
        if (k === key) return;
        key = k;
        if (!v.owned) {
          body.innerHTML = '<p class="note">Chưa thuê trang trại. Vào <b>🗺️ Bản đồ → Trang trại → Thuê</b> (cọc 5.000K) để tự trồng nguyên liệu rẻ cho các quán.</p>';
          return;
        }
        body.innerHTML = `
          <div class="farm-head">
            <div><b>${v.slots} lô</b> <span class="muted">· đã mở rộng ${v.level}/${v.max} lần</span></div>
            ${
              v.nextCost
                ? `<button class="primary" data-expand ${v.canExpand ? '' : 'disabled'}>Mở rộng thêm 4 lô (${v.nextCost})</button>`
                : '<span class="pos">Đã mở rộng tối đa</span>'
            }
          </div>
          <p class="note">Mỗi lô trồng / nuôi được bất kỳ loại nào. Lô mới là đất trống: chọn giống là bắt đầu. Đổi giống thì lô làm xong mẻ đang trồng, bạn lấy hết thùng rồi mới đổi (không mất phí). Mỗi lô mở thêm cộng 150K/tháng tiền thuê.</p>
          ${v.groups
            .map(
              (g) => `<h3>${g.title}</h3><div class="plots">${g.plots
                .map(
                  (p) => `<div class="plot-card${p.unlocked ? '' : ' locked'}">
                    <div class="plot-top"><span class="plot-icon">${p.icon}</span><div><b>${p.label} · ${p.crop}</b><div class="muted">${p.status}</div></div></div>
                    ${
                      p.unlocked
                        ? `<div class="crop-pick">${v.crops
                            .map(
                              (c) => `<button title="${c.name}: ${c.detail}" data-plot="${p.instanceId}" data-crop="${c.id}"
                                 class="${c.id === p.current ? 'cur' : ''}${c.id === p.pending ? ' next' : ''}">${c.icon}</button>`,
                            )
                            .join('')}</div>`
                        : ''
                    }</div>`,
                )
                .join('')}</div>`,
            )
            .join('')}
          <h3>Các giống</h3>
          <table class="staff"><tbody>${v.crops.map((c) => `<tr><td>${c.icon} <b>${c.name}</b></td><td class="muted">${c.detail}</td></tr>`).join('')}</tbody></table>`;
        body.querySelector<HTMLButtonElement>('[data-expand]')?.addEventListener('click', () => conn.buyFarmExpansion());
        body.querySelectorAll<HTMLButtonElement>('[data-plot]').forEach((b) => {
          b.onclick = () => conn.setPlotCrop(b.dataset.plot!, b.dataset.crop!);
        });
      };
      render();
      const t = setInterval(render, 300);
      return () => clearInterval(t);
    },
  };
}
