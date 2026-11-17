import { formatClock } from '@qnm/shared';
import type { Snapshot } from '@qnm/shared';
import { needsText } from './menu/views';

export interface ShipperAlert {
  title: string;
  /** Giờ trong game lúc shipper tới điểm giao. */
  arrived: string | null;
  /** Số giây còn chờ (null khi đang chạy tới). */
  secondsLeft: number | null;
  needs: string;
  urgent: boolean;
}

/** Nội dung bảng báo shipper (null = không có shipper đang tới / đang chờ). */
export function shipperAlertView(s: Snapshot, arrivedSec: number | null): ShipperAlert | null {
  const sh = s.online.shipper;
  if (!sh || sh.state === 'leaving') return null;
  const who = sh.vehicle === 'car' ? '🚚 Ô tô giao hàng' : '🛵 Shipper';
  if (sh.state === 'arriving') return { title: `${who} đang tới lấy đơn`, arrived: null, secondsLeft: null, needs: needsText(sh.needs), urgent: false };
  const left = Math.max(0, Math.ceil(sh.patience - sh.waited));
  return {
    title: `${who} đang chờ ở điểm giao`,
    arrived: arrivedSec !== null ? formatClock(arrivedSec) : null,
    secondsLeft: left,
    needs: needsText(sh.needs),
    urgent: left <= 15,
  };
}

/** Bảng bên trái màn hình: shipper tới lúc mấy giờ, còn chờ bao nhiêu giây, cần món gì. */
export function createShipperAlert(root: HTMLElement) {
  const box = document.createElement('div');
  box.className = 'shipper-alert';
  box.hidden = true;
  root.append(box);
  let arrivedSec: number | null = null;
  let key = '';
  let shop = '';
  return {
    update(s: Snapshot) {
      const sh = s.online.shipper;
      if (s.shopId !== shop) {
        shop = s.shopId;
        arrivedSec = null;
      }
      // Giờ tới = lúc lần đầu thấy shipper đứng chờ, lùi lại số giây đã chờ (vào giữa chừng vẫn đúng).
      if (!sh || sh.state !== 'waiting') arrivedSec = null;
      else if (arrivedSec === null) arrivedSec = Math.max(0, s.secOfDay - sh.waited);
      const v = shipperAlertView(s, arrivedSec);
      const k = JSON.stringify(v);
      if (k === key) return;
      const isNew = !key.includes('đang chờ') && !!v?.secondsLeft;
      key = k;
      box.hidden = !v;
      if (!v) return;
      box.classList.toggle('urgent', v.urgent);
      box.innerHTML = `<b>${v.title}</b>
        ${v.arrived ? `<div>Tới lúc <b>${v.arrived}</b> · còn <b class="secs">${v.secondsLeft} giây</b></div>` : ''}
        <div class="muted">${v.needs}</div>`;
      if (isNew) {
        box.classList.remove('pop');
        void box.offsetWidth;
        box.classList.add('pop');
      }
    },
  };
}
