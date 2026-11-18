import { EMOTES } from '@qnm/shared';
import type { GameConnection } from '../net';

const KEYS = ['wave', 'laugh', 'thumb', 'help', 'heart'] as const;

/**
 * Thanh biểu cảm ở dưới màn hình: 👋 😂 👍 🆘 ❤️ (phím 1–5) và 🙌 đập tay (phím H).
 * Đập tay: hai người đứng cạnh nhau cùng bấm trong 1,5 giây → cả hai được tăng tốc 10 giây.
 */
export function createEmoteBar(root: HTMLElement, conn: GameConnection) {
  const bar = document.createElement('div');
  bar.className = 'emote-bar';
  bar.innerHTML =
    KEYS.map((k, i) => `<button data-emote="${k}" title="${EMOTES[k].text} (phím ${i + 1})">${EMOTES[k].icon}</button>`).join('') +
    '<button data-five title="Đập tay với người nhà đứng cạnh (phím H): cả hai chạy nhanh hơn 10 giây">🙌</button>';
  root.append(bar);
  bar.querySelectorAll<HTMLButtonElement>('[data-emote]').forEach((b) => (b.onclick = () => conn.emote(b.dataset.emote!)));
  bar.querySelector<HTMLButtonElement>('[data-five]')!.onclick = () => conn.highFive();
  window.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement | null;
    if (t?.tagName === 'INPUT' || t?.tagName === 'TEXTAREA' || e.repeat) return;
    if (document.querySelector('.menu:not([hidden])')) return;
    const i = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].indexOf(e.code);
    if (i >= 0) conn.emote(KEYS[i]);
    else if (e.code === 'KeyH') conn.highFive();
  });
}
