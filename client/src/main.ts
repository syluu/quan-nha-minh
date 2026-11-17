import './style.css';
import { formatK } from '@qnm/shared';
import { createKeyboardInput } from './input';
import { showLobby } from './lobby';
import type { GameConnection } from './net';

const root = document.getElementById('app')!;

function startGame(conn: GameConnection) {
  root.innerHTML = `<div class="status" id="status">Đã vào quán ${conn.code}</div>`;
  const status = document.getElementById('status')!;
  conn.onSnapshot((s) => {
    const online = s.players.filter((p) => p.online).length;
    status.textContent = `Đã vào quán ${conn.code} · ${online} người online · 💰 ${formatK(s.money)}`;
  });
  conn.onStatus((st) => {
    if (st === 'reconnecting') status.textContent = 'Đang kết nối lại…';
  });
  const input = createKeyboardInput();
  let last = { mx: 0, mz: 0 };
  setInterval(() => {
    const now = input.read();
    if (now.mx !== last.mx || now.mz !== last.mz || now.mx !== 0 || now.mz !== 0) conn.sendInput(now.mx, now.mz);
    last = now;
  }, 100);
}

showLobby(root, startGame);
