import type { Snapshot } from '@qnm/shared';
import { KOL_VISIT, REVIEW_VISIT, visitPhase, visitUntil } from '../game/promoSchedule';

export interface PromoAlert {
  key: string;
  text: string;
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
  return out;
}

/** Hộp thông báo bên trái (dưới bảng shipper). */
export function createPromoAlert(root: HTMLElement) {
  const box = document.createElement('div');
  box.className = 'promo-alert';
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
      box.innerHTML = v.map((a) => `<div data-k="${a.key}">${a.text}</div>`).join('');
      if (fresh) {
        box.classList.remove('pop');
        void box.offsetWidth;
        box.classList.add('pop');
      }
    },
  };
}
