import type { Snapshot } from '@qnm/shared';
import type { GameConnection } from '../../net';
import type { MenuTab } from './menu';
import type { StaffDetail } from './views';
import { staffView } from './views';

/** Tab Nhân sự: 1 thu ngân + mỗi món đang bán 1 phụ bếp; thuê, nâng cấp từng người, cho nghỉ (có hỏi lại). */
export function staffTab(conn: GameConnection, latest: () => Snapshot | null): MenuTab {
  return {
    id: 'staff',
    title: '👥 Nhân sự',
    mount(body) {
      let key = '';
      let confirmId: string | null = null;
      const render = () => {
        const s = latest();
        if (!s) return;
        const v = staffView(s);
        const k = JSON.stringify(v) + confirmId;
        if (k === key) return;
        key = k;
        const info = (d: StaffDetail | null) =>
          d
            ? `<div class="muted">Cấp ${d.level} · đi ${d.speedPct}% · mang ${d.carry} · lương ${d.wage}/ngày · đang nợ ${d.owed}</div>`
            : '';
        const actions = (name: string | null, id: string | null, d: StaffDetail | null, hire: string) => {
          if (!name || !id) return `<button class="primary" data-hire="${hire}">Thuê</button>`;
          if (confirmId === id)
            return `<span class="confirm">Cho ${name} nghỉ? Trả ngay ${d?.payOnFire ?? '0K'} lương (cả hôm nay).
              <button class="primary" data-fire="${id}">Đồng ý</button><button data-cancel>Thôi</button></span>`;
          return `${d?.nextTrain ? `<button data-train="${id}">Nâng cấp (${d.nextTrain})</button>` : '<span class="muted">Cấp tối đa</span>'}
            <button data-ask="${id}">Cho nghỉ</button>`;
        };
        const row = (job: string, name: string | null, id: string | null, d: StaffDetail | null, hire: string) => `
          <tr><td>${job}</td><td>${name ? `<b>${name}</b>${info(d)}` : '<span class="muted">Chưa có</span>'}</td>
          <td class="act">${actions(name, id, d, hire)}</td></tr>`;
        if (v.farm) {
          body.innerHTML = `
            <h3>Người làm trang trại <span class="muted">(tối đa 2)</span></h3>
            <table class="staff"><tbody>
              ${v.farm.hands.map((h) => row('Làm trang trại — bê thùng hàng ra xe', h.name, h.staffId, h.detail, 'farmhand')).join('')}
              ${v.farm.canHire ? row('Làm trang trại — bê thùng hàng ra xe', null, null, null, 'farmhand') : ''}
            </tbody></table>
            <p class="note">Lương ${v.wagePerDay}/ngày, trả cuối tháng. Người làm tự nhặt thùng hàng ở các lô và bốc lên xe chở hàng vào kho tổng.</p>`;
        } else
        body.innerHTML = `
          <h3>Nhân viên <span class="muted">(${v.shopName})</span></h3>
          <table class="staff">
            <thead><tr><th>Việc</th><th>Người làm</th><th></th></tr></thead>
            <tbody>
              ${row('Thu ngân — đứng quầy tính tiền', v.cashier.name, v.cashier.staffId, v.cashier.detail, 'cashier')}
              ${v.courier ? row('Giao đơn — bê món ra cho shipper', v.courier.name, v.courier.staffId, v.courier.detail, 'courier') : ''}
              ${v.cleaner ? row('Dọn bàn — dọn chỗ khách ăn xong', v.cleaner.name, v.cleaner.staffId, v.cleaner.detail, 'cleaner') : ''}
              ${v.lines.map((l) => row(`Phụ bếp ${l.itemName} — bê từ máy ra kệ`, l.staffName, l.staffId, l.detail, `cook:${l.item}`)).join('')}
            </tbody>
          </table>
          <p class="note">Lương khởi điểm ${v.wagePerDay}/ngày, cộng dồn mỗi ngày và <b>trả cuối tháng</b> (7 ngày). Cho nghỉ thì trả ngay số ngày đã làm.
          Nâng cấp từng người: đi nhanh hơn, mang nhiều hơn, lương +30K/ngày mỗi cấp. Cho nghỉ là mất cấp.</p>`;
        body.querySelectorAll<HTMLButtonElement>('[data-hire]').forEach((b) => {
          b.onclick = () => {
            const [role, item] = b.dataset.hire!.split(':');
            conn.hire(role as 'cashier' | 'cook' | 'courier' | 'cleaner' | 'farmhand', (item as never) ?? null);
          };
        });
        body.querySelectorAll<HTMLButtonElement>('[data-train]').forEach((b) => (b.onclick = () => conn.upgradeStaff(b.dataset.train!)));
        body.querySelectorAll<HTMLButtonElement>('[data-ask]').forEach((b) => (b.onclick = () => ((confirmId = b.dataset.ask!), render())));
        body.querySelectorAll<HTMLButtonElement>('[data-cancel]').forEach((b) => (b.onclick = () => ((confirmId = null), render())));
        body.querySelectorAll<HTMLButtonElement>('[data-fire]').forEach((b) => {
          b.onclick = () => {
            conn.fire(b.dataset.fire!);
            confirmId = null;
            render();
          };
        });
      };
      render();
      const t = setInterval(render, 300);
      return () => clearInterval(t);
    },
  };
}
