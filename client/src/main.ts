import './style.css';
import { formatK } from '@qnm/shared';
import type { SimEvent, Snapshot } from '@qnm/shared';
import { audio } from './audio/instance';
import { cuesFor } from './audio/cues';
import { startGame } from './game/gameLoop';
import { showLobby } from './lobby';
import type { GameConnection } from './net';
import { showDaySummary } from './ui/daySummary';
import { createEventLog } from './ui/eventLog';
import { createFloatText } from './ui/floatText';
import { createHud } from './ui/hud';
import { createSettlementModal } from './ui/settlementModal';
import { createMenu } from './ui/menu/menu';
import { pricesTab } from './ui/menu/pricesTab';
import { reportTab } from './ui/menu/reportTab';
import { applyDisplaySettings, settingsTab } from './ui/menu/settingsTab';
import { staffTab } from './ui/menu/staffTab';
import { upgradesTab } from './ui/menu/upgradesTab';
import { marketingTab } from './ui/menu/marketingTab';
import { bankTab } from './ui/menu/bankTab';
import { mapTab } from './ui/menu/mapTab';
import { costumeTab } from './ui/menu/costumeTab';
import { actionErrorText } from './ui/menu/views';
import { showToast } from './ui/toast';

const root = document.getElementById('app')!;


function enterGame(conn: GameConnection) {
  root.innerHTML = '<div class="game" id="game"></div><div class="ui" id="ui"></div>';
  const ui = document.getElementById('ui')!;
  const game = startGame(conn, document.getElementById('game')!);
  const hud = createHud(ui, conn.playerId);
  hud.setCode(conn.code);
  const log = createEventLog(ui);
  const floats = createFloatText(ui, game.project);
  let latest: Snapshot | null = null;
  conn.onSnapshot((s) => (latest = s));
  const myName = () => latest?.players.find((p) => p.id === conn.playerId)?.name ?? '';
  // eslint-disable-next-line prefer-const
  let menu: ReturnType<typeof createMenu> | undefined;
  menu = createMenu(
    ui,
    conn,
    [
      mapTab(conn, () => latest, () => menu?.close()),
      reportTab(conn),
      staffTab(conn, () => latest),
      upgradesTab(conn, () => latest, conn.playerId),
      pricesTab(conn, () => latest),
      marketingTab(conn, () => latest),
      bankTab(conn, () => latest),
      costumeTab(conn, () => latest, conn.playerId),
      settingsTab(conn, myName),
    ],
    (open) => game.setInputBlocked('menu', open),
  );
  conn.onActionError((e) => showToast(ui, actionErrorText(e)));
  createSettlementModal(ui, conn, (blocked) => game.setInputBlocked('settle', blocked));
  applyDisplaySettings();

  let prevCarry = 0;
  let pending: SimEvent[] = [];
  conn.onSnapshot((s) => {
    const mine = s.players.find((p) => p.id === conn.playerId)?.carry.length ?? 0;
    for (const c of cuesFor(prevCarry, mine, pending, conn.playerId)) audio.play(c);
    prevCarry = mine;
    pending = [];
    hud.update(s);
    log.update(s.log);
    // Chỉ khi chạy dev: cho phép script kiểm thử đọc trạng thái.
    if (import.meta.env.DEV) Object.assign(window, { __qnm: { snapshot: s, playerId: conn.playerId } });
  });
  conn.onEvent((e) => {
    // Sự kiện của quán khác (người nhà đang ở quán khác): không hiện chữ nổi ở đây.
    if ('shopId' in e && latest && e.shopId !== latest.shopId) return;
    pending.push(e);
    if (e.type === 'sale') floats.spawn(`+${formatK(e.amount)}`, 'gain', e.x, e.z);
    else if (e.type === 'customerLost') floats.spawn('-1★', 'loss', e.x, e.z);
    else if (e.type === 'trash') floats.spawn(`-${formatK(e.value)}`, 'waste', e.x, e.z);
    else if (e.type === 'orderDone') floats.spawn(`+${formatK(e.net)} online`, 'gain', e.x, e.z);
    else if (e.type === 'stored') floats.spawn('📦 Vào kho', 'gain', e.x, e.z);
    else if (e.type === 'orderCancelled') floats.spawn('Huỷ đơn -1★', 'loss', e.x, e.z);
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
