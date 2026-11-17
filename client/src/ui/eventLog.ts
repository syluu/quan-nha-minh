import type { LogEntry } from '@qnm/shared';

/** 5 dòng nhật ký gần nhất ở góc phải (ai vừa mở máy nào…). */
export function createEventLog(root: HTMLElement) {
  const box = document.createElement('div');
  box.className = 'log';
  root.append(box);
  let last = '';
  return {
    update(log: LogEntry[]) {
      const key = log.map((l) => l.text + l.clock).join('|');
      if (key === last) return;
      last = key;
      box.replaceChildren(
        ...log.slice(-5).map((l) => {
          const div = document.createElement('div');
          div.textContent = `${l.clock} · ${l.text}`;
          return div;
        }),
      );
      box.hidden = log.length === 0;
    },
  };
}
