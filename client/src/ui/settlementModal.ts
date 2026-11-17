import { BALANCE, SHOPS, formatK, getStationDef } from '@qnm/shared';
import type { Settlement, SimEvent, Snapshot } from '@qnm/shared';
import type { GameConnection } from '../net';
import { loanForm } from './menu/bankTab';

export function settlementRows(st: Settlement): [string, string][] {
  return [
    ['Doanh thu', formatK(st.revenue)],
    ['Nguyên liệu (đã chi)', formatK(-st.ingredientCost)],
    ['Quảng cáo (đã chi)', formatK(-st.marketing)],
    ['Lương nhân viên', formatK(-st.wages)],
    ['Thuê mặt bằng', formatK(-st.rent)],
    ['Góp nợ ngân hàng', formatK(-st.loanDue)],
    ['Tổng phải trả', formatK(st.totalDue)],
  ];
}

export function shortfall(money: number, st: Settlement): number {
  return Math.max(0, st.totalDue - money);
}

/** Gợi ý số tiền vay: làm tròn lên bội số 100K, ít nhất mức vay tối thiểu. */
export function suggestedLoan(short: number): number {
  return Math.max(BALANCE.LOAN_MIN, Math.ceil(short / BALANCE.LOAN_STEP) * BALANCE.LOAN_STEP);
}

const stationName = (id: string) => {
  const p = SHOPS.banh_mi.stations.find((s) => s.instanceId === id);
  return p ? getStationDef(p.def).name : id;
};

function table(st: Settlement): string {
  return `<table>${settlementRows(st)
    .map(([k, v], i, a) => `<tr class="${i === a.length - 1 ? 'total' : ''}"><td>${k}</td><td>${v}</td></tr>`)
    .join('')}</table>`;
}

/**
 * Bảng kết toán cuối tháng cho cả nhà. Thiếu tiền: không đóng được, game dừng; vay hoặc bán máy ngay trong bảng.
 * Đủ tiền (tự trả) hoặc vừa trả xong: hiện thông báo có nút Đóng.
 */
export function createSettlementModal(root: HTMLElement, conn: GameConnection, setBlocked: (blocked: boolean) => void) {
  const box = document.createElement('div');
  box.className = 'settle';
  box.hidden = true;
  root.append(box);
  let blocking = false;
  let key = '';
  let lastOpened: Settlement | null = null;
  let confirmSell: string | null = null;

  function close() {
    box.hidden = true;
    blocking = false;
    key = '';
    confirmSell = null;
    setBlocked(false);
  }

  function showInfo(title: string, body: string) {
    blocking = false;
    key = '';
    box.hidden = false;
    box.innerHTML = `<h2>${title}</h2>${body}<button class="primary close">Đóng</button>`;
    box.querySelector<HTMLButtonElement>('.close')!.onclick = close;
  }

  function render(s: Snapshot) {
    const st = s.settlement;
    if (!st) {
      if (blocking) close();
      return;
    }
    lastOpened = st;
    const k = JSON.stringify([st, s.money, s.sellable, s.maxLoan, confirmSell]);
    if (blocking && k === key) return;
    key = k;
    blocking = true;
    box.hidden = false;
    setBlocked(true);
    const short = shortfall(s.money, st);
    box.innerHTML = `
      <h2>Kết toán tháng ${st.month}</h2>
      ${table(st)}
      <p class="have">Tiền đang có: <b>${formatK(s.money)}</b> · Còn thiếu: <b class="neg">${formatK(short)}</b></p>
      <p class="note">Cả quán tạm dừng cho tới khi trả đủ. Ai trong nhà cũng có thể vay hoặc bán máy.</p>
      <h3>Vay ngân hàng</h3><div class="loan-slot"></div>
      <h3>Bán máy (thu về 50%)</h3>
      <div class="sell">${
        s.sellable.length
          ? s.sellable
              .map((x) =>
                confirmSell === x.instanceId
                  ? `<span class="confirm">Bán ${stationName(x.instanceId)}, thu ${formatK(x.refund)}?
                     <button class="primary" data-sell-yes="${x.instanceId}">Đồng ý</button><button data-sell-no>Thôi</button></span>`
                  : `<button data-sell="${x.instanceId}">${stationName(x.instanceId)} (+${formatK(x.refund)})</button>`,
              )
              .join('')
          : '<span class="muted">Không còn máy nào bán được (máy của dây chuyền có phụ bếp phải cho phụ bếp nghỉ trước).</span>'
      }</div>`;
    box.querySelector('.loan-slot')!.append(loanForm(conn, s.maxLoan, suggestedLoan(short), st.month));
    box.querySelectorAll<HTMLButtonElement>('[data-sell]').forEach((b) => {
      b.onclick = () => {
        confirmSell = b.dataset.sell!;
        render(s);
      };
    });
    box.querySelectorAll<HTMLButtonElement>('[data-sell-no]').forEach((b) => {
      b.onclick = () => {
        confirmSell = null;
        render(s);
      };
    });
    box.querySelectorAll<HTMLButtonElement>('[data-sell-yes]').forEach((b) => {
      b.onclick = () => {
        if (b.disabled) return;
        b.disabled = true;
        conn.sellStation(b.dataset.sellYes!, st.month);
        confirmSell = null;
      };
    });
  }

  conn.onSnapshot((s: Snapshot) => {
    render(s);
  });

  conn.onEvent((e: SimEvent) => {
    if (e.type === 'monthEnd') lastOpened = e.settlement;
    else if (e.type === 'monthClosed') {
      const st = lastOpened;
      showInfo(`Đã trả xong tháng ${e.month}`, st ? table(st) : '');
      setBlocked(false); // thông báo không khoá di chuyển
    } else if (e.type === 'bankrupt') {
      showInfo('Quán phá sản 😢', '<p>Không còn tiền, không vay thêm được và không còn máy để bán. Quán bắt đầu lại từ xe bánh mì với 5.000K. Tên nhân vật và mã quán vẫn giữ nguyên.</p>');
      setBlocked(false);
    }
  });
}
