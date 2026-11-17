import type { Snapshot } from '@qnm/shared';
import type { GameConnection } from '../../net';
import type { MenuTab } from './menu';
import { mapView } from './views';

/** Tab Bản đồ: đi tới quán đang có, thuê mặt bằng mới và chọn loại hình (cơm tấm / phở & cà phê). */
export function mapTab(conn: GameConnection, latest: () => Snapshot | null, close: () => void): MenuTab {
  return {
    id: 'map',
    title: '🗺️ Bản đồ',
    mount(body) {
      let key = '';
      let confirmRent: string | null = null;
      const render = () => {
        const s = latest();
        if (!s) return;
        const v = mapView(s);
        const k = JSON.stringify(v) + confirmRent;
        if (k === key) return;
        key = k;
        body.innerHTML = `
          <h3>Quán đang có <span class="muted">(bạn đang ở ${v.here})</span></h3>
          <table class="staff"><tbody>
            ${v.owned
              .map(
                (o) => `<tr><td><b>${o.name}</b><div class="muted">${o.status} · ${o.rent}</div></td>
                <td class="act">${o.here ? '<span class="muted">Đang ở đây</span>' : `<button class="primary" data-go="${o.id}">Đi tới</button>`}</td></tr>`,
              )
              .join('')}
          </tbody></table>
          <h3>Mặt bằng còn trống</h3>
          ${v.free.length ? '' : '<p class="muted">Đã thuê hết các loại hình hiện có.</p>'}
          <table class="staff"><tbody>
            ${v.free
              .map((f) => {
                const act =
                  confirmRent === f.id
                    ? `<span class="confirm">Thuê ${f.name}: cọc ${f.deposit}, tiền thuê ${f.rent}?
                       <button class="primary" data-rent-yes="${f.id}">Đồng ý</button><button data-rent-no>Thôi</button></span>`
                    : `<button class="primary" data-rent="${f.id}" ${f.canRent ? '' : 'disabled'}>Thuê (cọc ${f.deposit})</button>`;
                return `<tr><td><b>${f.name}</b><div class="muted">${f.farm ? 'Lô' : 'Bán'}: ${f.menu}</div>
                  <div class="muted">Thuê ${f.rent}${f.farm ? ' · nguyên liệu rẻ cho mọi quán, thuê được ngay' : ' · có bàn ghế'}</div></td>
                  <td class="act">${act}</td></tr>`;
              })
              .join('')}
          </tbody></table>
          ${v.hint ? `<p class="note">${v.hint}</p>` : ''}
          <h3>Kho tổng</h3>
          <p>${v.warehouse || '<span class="muted">Trống — thu hoạch ở trang trại rồi bê thùng lên xe chở hàng.</span>'}</p>
          <p class="note">Máy ở các quán lấy nguyên liệu trong kho trước, thiếu mới mua chợ. Mỗi sáng xe chở hàng tới từng quán (${'50K'}/quán).</p>
          <p class="note">Mọi quán vẫn chạy khi không có ai đứng ở đó (nhân viên làm thay). Tiền thuê trả cuối tháng cùng lương. Đồ đang cầm mang theo khi đi.</p>`;
        body.querySelectorAll<HTMLButtonElement>('[data-go]').forEach((b) => {
          b.onclick = () => {
            conn.travel(b.dataset.go as Snapshot['shopId']);
            close();
          };
        });
        body.querySelectorAll<HTMLButtonElement>('[data-rent]').forEach((b) => (b.onclick = () => ((confirmRent = b.dataset.rent!), render())));
        body.querySelectorAll<HTMLButtonElement>('[data-rent-no]').forEach((b) => (b.onclick = () => ((confirmRent = null), render())));
        body.querySelectorAll<HTMLButtonElement>('[data-rent-yes]').forEach((b) => {
          b.onclick = () => {
            conn.rentShop(b.dataset.rentYes as Snapshot['shopId']);
            confirmRent = null;
            close();
          };
        });
      };
      render();
      const t = setInterval(render, 300);
      return () => clearInterval(t);
    },
  };
}
