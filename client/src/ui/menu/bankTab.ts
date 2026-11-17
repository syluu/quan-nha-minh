import { BALANCE, formatK } from '@qnm/shared';
import type { Snapshot } from '@qnm/shared';
import type { GameConnection } from '../../net';
import type { MenuTab } from './menu';
import { bankView, loanPreview } from './views';

/** Form vay dùng chung cho tab Ngân hàng và bảng kết toán. */
export function loanForm(conn: GameConnection, max: number, initial: number, forMonth?: number): HTMLElement {
  const el = document.createElement('div');
  el.className = 'loan-form';
  if (max < BALANCE.LOAN_MIN) {
    el.innerHTML = '<p class="muted">Đã hết hạn mức vay.</p>';
    return el;
  }
  const start = Math.min(max, Math.max(BALANCE.LOAN_MIN, initial));
  el.innerHTML = `
    <label>Số tiền <input type="range" min="${BALANCE.LOAN_MIN}" max="${max}" step="${BALANCE.LOAN_STEP}" value="${start}" /> <output></output></label>
    <label>Kỳ hạn <select>${Object.keys(BALANCE.LOAN_TERMS)
      .map((m) => `<option value="${m}">${m} tháng (lãi ${Math.round(BALANCE.LOAN_TERMS[Number(m)] * 100)}%)</option>`)
      .join('')}</select></label>
    <p class="preview"></p>
    <button class="primary">Vay</button>`;
  const range = el.querySelector('input')!;
  const sel = el.querySelector('select')!;
  const out = el.querySelector('output')!;
  const prev = el.querySelector('.preview')!;
  const update = () => {
    const amount = Number(range.value);
    const months = Number(sel.value);
    const p = loanPreview(amount, months);
    out.textContent = formatK(amount);
    prev.textContent = `Tổng phải trả ${formatK(p.total)} · góp ${formatK(p.installment)}/tháng trong ${months} tháng`;
  };
  range.oninput = update;
  sel.onchange = update;
  update();
  const btn = el.querySelector('button')!;
  btn.onclick = () => {
    if (btn.disabled) return;
    btn.disabled = true; // chống bấm 2 lần; bảng vẽ lại khi máy chủ trả lời
    conn.takeLoan(Number(range.value), Number(sel.value), forMonth);
  };
  return el;
}

/** Tab Ngân hàng: nợ đang có, trả sớm, hạn mức và form vay. */
export function bankTab(conn: GameConnection, latest: () => Snapshot | null): MenuTab {
  return {
    id: 'bank',
    title: '🏦 Ngân hàng',
    mount(body) {
      let key = '';
      const render = () => {
        const s = latest();
        if (!s) return;
        const v = bankView(s);
        const k = JSON.stringify(v);
        if (k === key) return;
        key = k;
        body.innerHTML = `
          <p>Còn <b>${v.daysToMonthEnd}</b> ngày tới kết toán cuối tháng (trả lương, góp nợ).</p>
          <h3>Khoản vay</h3>
          ${
            v.loans.length
              ? `<table class="staff"><thead><tr><th>Vay</th><th>Còn nợ</th><th>Góp/tháng</th><th>Còn</th><th></th></tr></thead><tbody>${v.loans
                  .map(
                    (l) => `<tr><td>${l.principal}</td><td>${l.remaining}</td><td>${l.installment}</td><td>${l.monthsLeft} tháng</td>
                    <td class="act"><button data-repay="${l.id}">Trả hết</button></td></tr>`,
                  )
                  .join('')}</tbody></table>`
              : '<p class="muted">Chưa vay khoản nào.</p>'
          }
          <h3>Vay thêm <span class="muted">(hạn mức còn ${v.maxLoan})</span></h3>
          <div class="loan-slot"></div>
          <p class="note">Hạn mức = 50% giá trị máy móc của quán (ít nhất 2.000K) trừ nợ còn lại. Trả sớm không bị phạt.</p>`;
        body.querySelector('.loan-slot')!.append(loanForm(conn, v.maxLoanValue, BALANCE.LOAN_MIN));
        body.querySelectorAll<HTMLButtonElement>('[data-repay]').forEach((b) => (b.onclick = () => conn.repayLoan(b.dataset.repay!)));
      };
      render();
      const t = setInterval(render, 500);
      return () => clearInterval(t);
    },
  };
}
