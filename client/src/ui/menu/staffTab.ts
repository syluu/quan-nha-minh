import type { Snapshot } from '@qnm/shared';
import type { GameConnection } from '../../net';
import type { MenuTab } from './menu';
import { staffView } from './views';

/** Tab Nhân sự: 1 thu ngân + mỗi món đang bán 1 phụ bếp; thuê / cho nghỉ. */
export function staffTab(conn: GameConnection, latest: () => Snapshot | null): MenuTab {
  return {
    id: 'staff',
    title: '👥 Nhân sự',
    mount(body) {
      let key = '';
      const render = () => {
        const s = latest();
        if (!s) return;
        const v = staffView(s);
        const k = JSON.stringify(v);
        if (k === key) return;
        key = k;
        const row = (job: string, name: string | null, hire: string, fire: string | null) => `
          <tr><td>${job}</td><td>${name ? `<b>${name}</b>` : '<span class="muted">Chưa có</span>'}</td>
          <td class="act">${name ? `<button data-fire="${fire}">Cho nghỉ</button>` : `<button class="primary" data-hire="${hire}">Thuê</button>`}</td></tr>`;
        body.innerHTML = `
          <h3>Nhân viên</h3>
          <table class="staff">
            <thead><tr><th>Việc</th><th>Người làm</th><th></th></tr></thead>
            <tbody>
              ${row('Thu ngân — đứng quầy tính tiền', v.cashier.name, 'cashier', v.cashier.staffId)}
              ${v.lines.map((l) => row(`Phụ bếp ${l.itemName} — bê từ máy ra kệ`, l.staffName, `cook:${l.item}`, l.staffId)).join('')}
            </tbody>
          </table>
          <p class="note">Lương ${v.wagePerDay}/ngày/người, trả cuối ngày (thuê hay cho nghỉ giữa ngày vẫn tính cả ngày).
          Nhân viên đi chậm hơn bạn (≈70%) và cầm tối đa 3 món. Mở thêm kệ để có thêm chỗ phụ bếp.
          Cuối ngày không đủ tiền trả lương thì người chưa được trả sẽ nghỉ việc.</p>`;
        body.querySelectorAll<HTMLButtonElement>('[data-hire]').forEach((b) => {
          b.onclick = () => {
            const [role, item] = b.dataset.hire!.split(':');
            conn.hire(role as 'cashier' | 'cook', (item as never) ?? null);
          };
        });
        body.querySelectorAll<HTMLButtonElement>('[data-fire]').forEach((b) => {
          b.onclick = () => conn.fire(b.dataset.fire!);
        });
      };
      render();
      const t = setInterval(render, 300);
      return () => clearInterval(t);
    },
  };
}
