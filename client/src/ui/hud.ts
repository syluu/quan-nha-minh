import { SHOP_META, formatClock, formatK } from '@qnm/shared';
import type { Snapshot } from '@qnm/shared';

export function formatStars(s: number): string {
  return `★ ${s.toFixed(1).replace('.', ',')}`;
}

/** Nhãn số món đang cầm: "3/4"; rỗng khi tay trống. */
export function carryBadge(count: number, cap: number): { text: string; full: boolean } {
  if (count <= 0) return { text: '', full: false };
  return { text: `${count}/${cap}`, full: count >= cap };
}

export function hudText(
  s: Snapshot,
  myId = '',
): { shop: string; money: string; clock: string; stars: string; online: string; basket: string } {
  const me = s.players.find((p) => p.id === myId);
  return {
    shop: `🏠 ${SHOP_META[s.shopId].name}`,
    money: `💰 ${formatK(s.money)}`,
    clock: `Ngày ${s.day} · ${formatClock(s.secOfDay)}`,
    stars: SHOP_META[s.shopId].kind === 'farm' ? '★ —' : formatStars(s.stars),
    // Người ở quán khác ghi kèm tên quán.
    online: s.players
      .filter((p) => p.online)
      .map((p) => (p.location === s.shopId ? p.name : `${p.name} (${SHOP_META[p.location].name})`))
      .join(', '),
    basket: `🧺 ${me ? me.carry.length : 0}/${me ? me.cap : 0}`,
  };
}

/** Thanh trên cùng: tiền, ngày giờ, sao, ai đang online + dòng trạng thái kết nối. */
export function createHud(root: HTMLElement, myId: string) {
  const bar = document.createElement('div');
  bar.className = 'hud';
  bar.innerHTML = `
    <span class="pill" data-k="shop"></span>
    <span class="pill" data-k="money"></span>
    <span class="pill" data-k="clock"></span>
    <span class="pill stars" data-k="stars"></span>
    <span class="pill" data-k="basket"></span>
    <span class="pill online" data-k="online"></span>
    <span class="pill code" data-k="code"></span>`;
  const status = document.createElement('div');
  status.className = 'conn';
  status.hidden = true;
  const hint = document.createElement('div');
  hint.className = 'hint';
  hint.textContent = 'WASD / mũi tên hoặc giữ chuột trái kéo để đi · giữ chuột phải kéo để xem quanh · lăn chuột để phóng to/nhỏ';
  root.append(bar, status, hint);
  const el = (k: string) => bar.querySelector<HTMLElement>(`[data-k="${k}"]`)!;
  let last = '';
  return {
    setCode(code: string) {
      el('code').textContent = `Mã quán: ${code}`;
    },
    update(s: Snapshot) {
      const t = hudText(s, myId);
      const key = Object.values(t).join('|');
      if (key === last) return;
      last = key;
      el('shop').textContent = t.shop;
      el('money').textContent = t.money;
      el('clock').textContent = t.clock;
      el('stars').textContent = t.stars;
      el('online').textContent = `👥 ${t.online}`;
      el('basket').textContent = t.basket;
    },
    setStatus(text: string | null) {
      status.hidden = !text;
      status.textContent = text ?? '';
    },
  };
}
