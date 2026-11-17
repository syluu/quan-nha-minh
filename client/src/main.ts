import './style.css';
import { formatK } from '@qnm/shared';
import { startGame } from './game/gameLoop';
import { showLobby } from './lobby';
import type { GameConnection } from './net';
import { showDaySummary } from './ui/daySummary';
import { createEventLog } from './ui/eventLog';
import { createFloatText } from './ui/floatText';
import { createHud } from './ui/hud';

const root = document.getElementById('app')!;

function enterGame(conn: GameConnection) {
  root.innerHTML = '<div class="game" id="game"></div><div class="ui" id="ui"></div>';
  const ui = document.getElementById('ui')!;
  const game = startGame(conn, document.getElementById('game')!);
  const hud = createHud(ui);
  hud.setCode(conn.code);
  const log = createEventLog(ui);
  const floats = createFloatText(ui, game.project);

  conn.onSnapshot((s) => {
    hud.update(s);
    log.update(s.log);
    // Chỉ khi chạy dev: cho phép script kiểm thử đọc trạng thái.
    if (import.meta.env.DEV) Object.assign(window, { __qnm: { snapshot: s, playerId: conn.playerId } });
  });
  conn.onEvent((e) => {
    if (e.type === 'sale') floats.spawn(`+${formatK(e.amount)}`, 'gain', e.x, e.z);
    else if (e.type === 'customerLost') floats.spawn('-1★', 'loss', e.x, e.z);
    else if (e.type === 'dayEnd') showDaySummary(ui, e.summary);
  });
  conn.onStatus((st, code) => {
    if (st === 'reconnecting') hud.setStatus('Mất kết nối — đang kết nối lại…');
    else if (st === 'connected') hud.setStatus(null);
    else if (code === 4001) hud.setStatus('Bạn đã mở quán ở tab khác. Tab này đã ngắt.');
    else hud.setStatus('Đã ngắt kết nối. Tải lại trang để vào lại.');
  });
}

showLobby(root, enterGame);
