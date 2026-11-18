import { BALANCE, ITEMS, LIFE, SHOP_META, SHOPS, formatK, getStationDef, partyDef } from '@qnm/shared';
import type { Snapshot } from '@qnm/shared';

/** Giây thật → "m:ss". */
function mmss(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Giây trong ngày → giờ game "HH:MM". */
function clockAt(sec: number): string {
  const total = Math.floor(BALANCE.OPEN_HOUR * 60 + (sec / BALANCE.DAY_REAL_SEC) * (BALANCE.CLOSE_HOUR - BALANCE.OPEN_HOUR) * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export interface PartyView {
  state: 'offer' | 'active' | 'done' | 'failed';
  title: string;
  lines: string[];
  pct: number;
  urgent: boolean;
  /** Điểm giao để lướt khung nhìn tới (chỉ khi đang ở đúng quán). */
  look: { x: number; z: number } | null;
}

/** Bảng đơn đặt tiệc bên trái: mời nhận, tiến độ giao, kết quả. */
export function partyView(s: Snapshot): PartyView | null {
  const p = s.life?.party;
  if (!p || p.state === 'declined') return null;
  const d = partyDef(p.kind);
  const item = ITEMS[p.item].name.toLowerCase();
  const shop = SHOP_META[p.shopId].name;
  const title = `${d.icon} ${d.name}`;
  const here = s.shopId === p.shopId;
  const pickup = SHOPS[p.shopId].stations.find((x) => getStationDef(x.def).kind === 'pickup');
  const look = here && pickup ? { x: pickup.x, z: pickup.z } : null;
  if (p.state === 'offer')
    return {
      state: 'offer', title, pct: 0, urgent: false, look: null,
      lines: [
        `Đặt ${p.qty} ${item} ở ${shop}, giao trước ${clockAt(p.dueSec)}`,
        `Thưởng ${formatK(p.reward)} (gấp rưỡi giá bán) · trả lời trong ${mmss(p.offerUntil - s.secOfDay)}`,
      ],
    };
  if (p.state === 'active') {
    const left = p.dueSec - s.secOfDay;
    return {
      state: 'active', title, pct: Math.round((p.delivered / p.qty) * 100), urgent: left < 30, look,
      lines: [
        `Mang ${item} tới <b>điểm giao</b> ${here ? '' : `ở ${shop} `}— đã giao <b>${p.delivered}/${p.qty}</b>`,
        `Hẹn ${clockAt(p.dueSec)} · còn <b class="secs">${mmss(left)}</b> · thưởng ${formatK(p.reward)}`,
      ],
    };
  }
  // Kết quả hiện thêm 20 giây rồi ẩn.
  if (s.secOfDay > (p.endSec ?? p.dueSec) + 20) return null;
  return {
    state: p.state, title, pct: Math.round((p.delivered / p.qty) * 100), urgent: false, look: null,
    lines: [p.state === 'done' ? `🎉 Giao đủ ${p.qty} ${item} — nhận ${formatK(p.reward)}!` : `😢 Trễ hẹn, mới giao ${p.delivered}/${p.qty}`],
  };
}

export function createPartyAlert(root: HTMLElement, conn: { acceptParty(): void; declineParty(): void }, onLook?: (x: number, z: number) => void) {
  const box = document.createElement('div');
  box.className = 'party-alert';
  box.hidden = true;
  root.prepend(box);
  let key = '';
  let lastState = '';
  return {
    update(s: Snapshot) {
      const v = partyView(s);
      const k = v ? JSON.stringify(v) : '';
      if (k === key) return;
      key = k;
      box.hidden = !v;
      if (!v) return;
      box.classList.toggle('urgent', v.urgent);
      box.classList.toggle('done', v.state === 'done');
      box.innerHTML = `
        <div class="party-title">${v.title}${v.state === 'offer' ? ' <span class="tag">Đơn mới!</span>' : ''}</div>
        ${v.lines.map((l) => `<div>${l}</div>`).join('')}
        ${v.state === 'active' ? `<div class="quest-bar"><i style="width:${v.pct}%"></i></div>` : ''}
        ${v.state === 'offer' ? '<div class="party-btns"><button class="primary" data-ok>🤝 Nhận đơn</button><button data-no>Từ chối</button></div>' : ''}
        ${v.look ? `<div><button class="look" data-x="${v.look.x}" data-z="${v.look.z}">👀 Xem điểm giao</button></div>` : ''}`;
      box.querySelector<HTMLButtonElement>('[data-ok]')?.addEventListener('click', () => conn.acceptParty());
      box.querySelector<HTMLButtonElement>('[data-no]')?.addEventListener('click', () => conn.declineParty());
      box.querySelector<HTMLButtonElement>('button.look')?.addEventListener('click', (e) => {
        const b = e.currentTarget as HTMLButtonElement;
        onLook?.(Number(b.dataset.x), Number(b.dataset.z));
      });
      if (v.state !== lastState) {
        lastState = v.state;
        box.classList.remove('pop');
        void box.offsetWidth;
        box.classList.add('pop');
      }
    },
  };
}

/** Nhân viên đứng gần mình đang đuối sức (chưa uống trà đá) → gợi ý mời trà đá. */
export function teaPromptView(s: Snapshot, myId: string): { staffId: string; name: string; energy: number; resting: boolean } | null {
  const me = s.players.find((p) => p.id === myId);
  if (!me) return null;
  let best: { staffId: string; name: string; energy: number; resting: boolean; d: number } | null = null;
  for (const st of s.staff) {
    if (st.tireless || st.cheer || (st.energy >= 70 && !st.rest)) continue;
    const d = Math.hypot(st.x - me.x, st.z - me.z);
    if (d > 1.8 || (best && d >= best.d)) continue;
    best = { staffId: st.id, name: st.name, energy: st.energy, resting: st.rest > 0, d };
  }
  return best && { staffId: best.staffId, name: best.name, energy: best.energy, resting: best.resting };
}

/** Nút "🧋 Mời trà đá" nổi phía trên thanh biểu cảm khi đứng cạnh nhân viên đang mệt (phím T). */
export function createTeaPrompt(root: HTMLElement, conn: { treatStaff(id: string): void }, myId: string) {
  const btn = document.createElement('button');
  btn.className = 'tea-prompt';
  btn.hidden = true;
  root.append(btn);
  let target: string | null = null;
  const treat = () => {
    if (target) conn.treatStaff(target);
  };
  btn.onclick = treat;
  window.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement | null;
    if (t?.tagName === 'INPUT' || t?.tagName === 'TEXTAREA' || e.repeat) return;
    if (document.querySelector('.menu:not([hidden])')) return;
    if (e.code === 'KeyT') treat();
  });
  let key = '';
  return {
    update(s: Snapshot) {
      const v = teaPromptView(s, myId);
      target = v?.staffId ?? null;
      const k = v ? `${v.staffId}|${v.name}|${v.energy < LIFE.TIRED}|${v.resting}` : '';
      if (k === key) return;
      key = k;
      btn.hidden = !v;
      if (v) btn.innerHTML = `🧋 Mời <b>${v.name}</b> ly trà đá (${formatK(LIFE.TEA_COST)}) <span class="key">T</span>${v.resting ? ' — đang nghỉ vì hết sức!' : v.energy < LIFE.TIRED ? ' — đang mệt!' : ''}`;
    },
  };
}
