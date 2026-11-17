import type { Snapshot } from '@qnm/shared';
import type { GameConnection } from '../../net';
import type { MenuTab } from './menu';
import { upgradeView } from './views';

const bar = (level: number, max: number) => '●'.repeat(level) + '○'.repeat(Math.max(0, max - level));

/** Tab Nâng cấp: bản thân (mang nhiều hơn, đi nhanh hơn) và từng máy làm món. Nhân viên nâng trong tab Nhân sự. */
export function upgradesTab(conn: GameConnection, latest: () => Snapshot | null, myId: string): MenuTab {
  return {
    id: 'upgrades',
    title: '⬆️ Nâng cấp',
    mount(body) {
      let key = '';
      const render = () => {
        const s = latest();
        if (!s) return;
        const v = upgradeView(s, myId);
        const k = JSON.stringify(v) + s.money;
        if (k === key) return;
        key = k;
        const row = (label: string, lv: string, now: string, next: string | null, cost: string | null, data: string) => `
          <tr><td><b>${label}</b><div class="muted">${lv}</div></td><td>${now}${next ? ` → <b>${next}</b>` : ''}</td>
          <td class="act">${cost ? `<button class="primary" ${data}>Nâng (${cost})</button>` : '<span class="muted">Tối đa</span>'}</td></tr>`;
        body.innerHTML = `
          <h3>Bản thân <span class="muted">(chỉ nhân vật của bạn)</span></h3>
          <table class="staff"><tbody>
            ${row('Sức mang', bar(v.me.carry.level, v.me.carry.max), v.me.carry.now, v.me.carry.next, v.me.carry.cost, 'data-me="carry"')}
            ${row('Tốc độ đi', bar(v.me.speed.level, v.me.speed.max), v.me.speed.now, v.me.speed.next, v.me.speed.cost, 'data-me="speed"')}
          </tbody></table>
          <h3>Máy</h3>
          <table class="staff"><tbody>
            ${v.machines
              .map((m) => row(m.name, bar(m.level, m.max), `${m.cycle} · ${m.cap}`, null, m.cost, `data-machine="${m.instanceId}"`))
              .join('')}
          </tbody></table>
          <p class="note">Mỗi cấp máy làm nhanh hơn 15% và chứa thêm 50% món. Nhân viên nâng cấp trong tab Nhân sự. Tiền lấy từ ví chung của quán.</p>`;
        body.querySelectorAll<HTMLButtonElement>('[data-me]').forEach((b) => (b.onclick = () => conn.upgradePlayer(b.dataset.me as 'carry' | 'speed')));
        body.querySelectorAll<HTMLButtonElement>('[data-machine]').forEach((b) => (b.onclick = () => conn.upgradeMachine(b.dataset.machine!)));
      };
      render();
      const t = setInterval(render, 300);
      return () => clearInterval(t);
    },
  };
}
