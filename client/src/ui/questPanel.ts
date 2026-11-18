import { formatK } from '@qnm/shared';
import type { Snapshot } from '@qnm/shared';

/** Nội dung bảng nhiệm vụ: chữ, tiến độ %, trạng thái. */
export function questView(s: Snapshot) {
  return (s.fun?.quests ?? []).map((q) => ({
    text: q.text,
    pct: q.kind === 'no_lost' ? (q.done ? 100 : q.failed ? 0 : Math.round((q.progress / q.target) * 100)) : Math.round((q.progress / q.target) * 100),
    progress: q.kind === 'revenue' || q.kind === 'tips' ? `${formatK(q.progress)}/${formatK(q.target)}` : q.kind === 'no_lost' ? '' : `${q.progress}/${q.target}`,
    reward: `+${formatK(q.reward)}`,
    state: q.done ? 'done' : q.failed ? 'failed' : 'open',
  }));
}

/** Bảng "Nhiệm vụ hôm nay" ở cột trái; bấm tiêu đề để thu gọn / mở. */
export function createQuestPanel(root: HTMLElement) {
  const box = document.createElement('div');
  box.className = 'quest-panel';
  root.append(box);
  let collapsed = false;
  try {
    collapsed = localStorage.getItem('qnm.questsCollapsed') === '1';
  } catch {
    /* bỏ qua */
  }
  let key = '';
  box.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('.quest-head')) return;
    collapsed = !collapsed;
    try {
      localStorage.setItem('qnm.questsCollapsed', collapsed ? '1' : '0');
    } catch {
      /* bỏ qua */
    }
    key = '';
  });
  return {
    update(s: Snapshot) {
      const v = questView(s);
      const k = JSON.stringify(v) + collapsed;
      if (k === key) return;
      key = k;
      box.hidden = v.length === 0;
      const done = v.filter((q) => q.state === 'done').length;
      box.innerHTML = `<div class="quest-head">📋 Nhiệm vụ hôm nay <span class="muted">${done}/${v.length}</span> <span class="muted">${collapsed ? '▸' : '▾'}</span></div>
        ${
          collapsed
            ? ''
            : v
                .map(
                  (q) => `<div class="quest ${q.state}">
                    <div class="quest-row"><span>${q.state === 'done' ? '✅' : q.state === 'failed' ? '❌' : '⬜'} ${q.text}</span><b>${q.reward}</b></div>
                    ${q.state === 'open' && q.progress ? `<div class="quest-bar"><i style="width:${Math.min(100, q.pct)}%"></i></div><span class="muted">${q.progress}</span>` : ''}
                  </div>`,
                )
                .join('')
        }`;
    },
  };
}
