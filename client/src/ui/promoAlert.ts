import type { Snapshot } from '@qnm/shared';
import { KOL_VISIT, REVIEW_VISIT, visitPhase, visitUntil } from '../game/promoSchedule';

export interface PromoAlert {
  key: string;
  text: string;
  /** Có nút 👀 Xem: lướt khung nhìn tới điểm này. */
  look?: { x: number; z: number };
}

/** Thông báo khách mời đang ở quán (KOL quay video, người review / phóng viên ăn thử). */
export function promoAlertsView(s: Snapshot): PromoAlert[] {
  const ids = new Set(s.campaigns.map((c) => c.id));
  const out: PromoAlert[] = [];
  const kol = ids.has('kol') ? visitPhase(KOL_VISIT, s.secOfDay) : null;
  if (kol)
    out.push({
      key: 'kol',
      text:
        kol.state === 'leave'
          ? '🌟 KOL quay xong, đang chào khán giả ra về'
          : `🌟 KOL ${kol.state === 'enter' ? 'vừa tới quán' : 'đang quay video'} tới khoảng ${visitUntil(KOL_VISIT)} — khách kéo tới đông!`,
    });
  for (const [id, who] of [['review', 'Người review'], ['bao_chi', 'Phóng viên ẩm thực']] as const) {
    const ph = ids.has(id) ? visitPhase(REVIEW_VISIT, s.secOfDay) : null;
    if (ph) out.push({ key: id, text: `${id === 'review' ? '⭐' : '📰'} ${who} ${ph.state === 'leave' ? 'đang ra về' : `đang ăn thử tới khoảng ${visitUntil(REVIEW_VISIT)}`}` });
  }
  if (ids.has('livestream')) out.push({ key: 'live', text: '🔴 Đang livestream bán hàng — đơn online tăng' });
  if (s.fun?.tourBus)
    out.push({ key: 'tour', text: '🚌 Đoàn khách du lịch đỗ xe trước quán — mua nhiều, boa hậu!', look: s.fun.busSpot });
  const it = s.intruder;
  if (it && it.state !== 'caught')
    out.push({
      key: 'intruder',
      text: `🚨 <b>${it.kind === 'thief' ? 'Có trộm' : 'Có người say xỉn'}</b> trong quán! Chạy tới chạm vào để bắt${it.stolen.length ? ` — đã lấy ${it.stolen.length}/8 món` : ''}`,
      look: { x: it.x, z: it.z },
    });
  if (s.fun?.cat === 'stray') out.push({ key: 'cat', text: '🐱 Có mèo hoang ghé quán (vỉa hè bên trái) — cầm món ăn đứng cạnh để cho mèo ăn' });
  if ((s.fun?.combo ?? 0) >= 3) out.push({ key: 'combo', text: `🔥 Combo phục vụ nhanh ×${s.fun.combo}` });
  return out;
}

/** Hộp thông báo bên trái (dưới bảng shipper). */
export function createPromoAlert(root: HTMLElement, onLook?: (x: number, z: number) => void) {
  const box = document.createElement('div');
  box.className = 'visit-alert';
  box.hidden = true;
  root.append(box);
  let key = '';
  return {
    update(s: Snapshot) {
      const v = promoAlertsView(s);
      const k = v.map((a) => a.text).join('|');
      if (k === key) return;
      const fresh = v.some((a) => !key.includes(a.key));
      key = k;
      box.hidden = v.length === 0;
      box.innerHTML = v
        .map((a) => `<div data-k="${a.key}">${a.text}${a.look ? ` <button class="look" data-x="${a.look.x}" data-z="${a.look.z}">👀 Xem</button>` : ''}</div>`)
        .join('');
      box.querySelectorAll<HTMLButtonElement>('button.look').forEach((b) => {
        b.onclick = () => onLook?.(Number(b.dataset.x), Number(b.dataset.z));
      });
      if (fresh) {
        box.classList.remove('pop');
        void box.offsetWidth;
        box.classList.add('pop');
      }
    },
  };
}
