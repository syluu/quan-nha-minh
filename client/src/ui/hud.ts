import { formatClock, formatK } from '@qnm/shared';
import type { Snapshot } from '@qnm/shared';

export function formatStars(s: number): string {
  return `★ ${s.toFixed(1).replace('.', ',')}`;
}

export function hudText(s: Snapshot): { money: string; clock: string; stars: string; online: string } {
  return {
    money: `💰 ${formatK(s.money)}`,
    clock: `Ngày ${s.day} · ${formatClock(s.secOfDay)}`,
    stars: formatStars(s.stars),
    online: s.players.filter((p) => p.online).map((p) => p.name).join(', '),
  };
}

/** Thanh trên cùng: tiền, ngày giờ, sao, ai đang online + dòng trạng thái kết nối. */
export function createHud(root: HTMLElement) {
  const bar = document.createElement('div');
  bar.className = 'hud';
  bar.innerHTML = `
    <span class="pill" data-k="money"></span>
    <span class="pill" data-k="clock"></span>
    <span class="pill stars" data-k="stars"></span>
    <span class="pill online" data-k="online"></span>
    <span class="pill code" data-k="code"></span>`;
  const status = document.createElement('div');
  status.className = 'conn';
  status.hidden = true;
  const hint = document.createElement('div');
  hint.className = 'hint';
  hint.textContent = 'WASD / phím mũi tên để đi · lăn chuột để phóng to/nhỏ · đứng gần máy/kệ để tự nhặt/đặt';
  root.append(bar, status, hint);
  const el = (k: string) => bar.querySelector<HTMLElement>(`[data-k="${k}"]`)!;
  let last = '';
  return {
    setCode(code: string) {
      el('code').textContent = `Mã quán: ${code}`;
    },
    update(s: Snapshot) {
      const t = hudText(s);
      const key = Object.values(t).join('|');
      if (key === last) return;
      last = key;
      el('money').textContent = t.money;
      el('clock').textContent = t.clock;
      el('stars').textContent = t.stars;
      el('online').textContent = `👥 ${t.online}`;
    },
    setStatus(text: string | null) {
      status.hidden = !text;
      status.textContent = text ?? '';
    },
  };
}
