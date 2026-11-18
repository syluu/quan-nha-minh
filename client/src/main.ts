import './style.css';
import { BADGES, SHOP_META, SHOPS, formatK } from '@qnm/shared';
import type { ShopId } from '@qnm/shared';
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
import { createShipperAlert } from './ui/shipperAlert';
import { createPromoAlert } from './ui/promoAlert';
import { createQuestPanel } from './ui/questPanel';
import { badgeTab } from './ui/menu/badgeTab';
import { createMenu } from './ui/menu/menu';
import { pricesTab } from './ui/menu/pricesTab';
import { reportTab } from './ui/menu/reportTab';
import { applyDisplaySettings, settingsTab } from './ui/menu/settingsTab';
import { staffTab } from './ui/menu/staffTab';
import { upgradesTab } from './ui/menu/upgradesTab';
import { marketingTab } from './ui/menu/marketingTab';
import { bankTab } from './ui/menu/bankTab';
import { mapTab } from './ui/menu/mapTab';
import { farmTab } from './ui/menu/farmTab';
import { costumeTab } from './ui/menu/costumeTab';
import { actionErrorText } from './ui/menu/views';
import { showToast } from './ui/toast';
import { createEmoteBar } from './ui/emoteBar';
import { createRao } from './audio/rao';

const root = document.getElementById('app')!;

/** Toạ độ một trạm (để bắn pháo giấy khi vừa mở). */
function stationXZ(shopId: ShopId, instanceId: string): [number, number] {
  const p = SHOPS[shopId].stations.find((x) => x.instanceId === instanceId);
  return [p?.x ?? 0, p?.z ?? 0];
}


function enterGame(conn: GameConnection) {
  root.innerHTML = '<div class="game" id="game"></div><div class="ui" id="ui"></div>';
  const ui = document.getElementById('ui')!;
  const game = startGame(conn, document.getElementById('game')!);
  const hud = createHud(ui, conn.playerId);
  hud.setCode(conn.code);
  const log = createEventLog(ui);
  // Cột thông báo bên trái: shipper, khách mời quảng cáo (KOL, người review…).
  const side = document.createElement('div');
  side.className = 'side-alerts';
  ui.append(side);
  const shipperAlert = createShipperAlert(side);
  const promoAlert = createPromoAlert(side, (x, z) => game.lookAt(x, z));
  const questPanel = createQuestPanel(side);
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
      farmTab(conn, () => latest),
      reportTab(conn),
      staffTab(conn, () => latest),
      upgradesTab(conn, () => latest, conn.playerId),
      pricesTab(conn, () => latest),
      marketingTab(conn, () => latest),
      bankTab(conn, () => latest),
      costumeTab(conn, () => latest, conn.playerId),
      badgeTab(() => latest),
      settingsTab(conn, myName),
    ],
    (open) => game.setInputBlocked('menu', open),
  );
  conn.onActionError((e) => showToast(ui, actionErrorText(e)));
  createEmoteBar(ui, conn);
  const rao = createRao();
  let lastRao = performance.now();
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
    const now = performance.now();
    if (SHOP_META[s.shopId].kind === 'shop') rao.update((now - lastRao) / 1000, s.shopId);
    lastRao = now;
    log.update(s.log);
    shipperAlert.update(s);
    promoAlert.update(s);
    questPanel.update(s);
    // Chỉ khi chạy dev: cho phép script kiểm thử đọc trạng thái.
    if (import.meta.env.DEV) Object.assign(window, { __qnm: { snapshot: s, playerId: conn.playerId } });
  });
  conn.onEvent((e) => {
    // Sự kiện của quán khác (người nhà đang ở quán khác): không hiện chữ nổi ở đây.
    if ('shopId' in e && latest && e.shopId !== latest.shopId) return;
    pending.push(e);
    if (e.type === 'sale') {
      floats.spawn(`+${formatK(e.amount)}`, 'gain', e.x, e.z);
      if (e.tip) setTimeout(() => floats.spawn(`💰 +${formatK(e.tip!)} boa`, 'gain', e.x, e.z), 350);
    } else if (e.type === 'combo') {
      floats.spawn(`🔥 Combo ×${e.n}! +${formatK(e.bonus)}`, 'gain', e.x, e.z);
      game.confetti(e.x, e.z);
    } else if (e.type === 'unlock') game.confetti(...stationXZ(e.shopId, e.instanceId));
    else if (e.type === 'catFed') {
      floats.spawn('😺 Mèo ở lại quán! +⭐', 'gain', e.x, e.z);
      game.confetti(e.x, e.z);
    } else if (e.type === 'highFive') {
      floats.spawn(`🙌 ${e.names.join(' & ')} đập tay! Chạy nhanh 10 giây`, 'gain', e.x, e.z);
      game.confetti(e.x, e.z);
    } else if (e.type === 'questDone') {
      showToast(ui, `📋 Xong nhiệm vụ: ${e.text} (+${formatK(e.reward)})`);
      game.confetti();
    } else if (e.type === 'badge') {
      const b = BADGES.find((x) => x.id === e.id);
      if (b) showToast(ui, `🏅 Huy hiệu mới: ${b.icon} ${b.name}`);
      game.confetti();
    }
    else if (e.type === 'customerLost') floats.spawn('😡 -1★', 'loss', e.x, e.z);
    else if (e.type === 'trash') floats.spawn(`-${formatK(e.value)}`, 'waste', e.x, e.z);
    else if (e.type === 'orderDone') floats.spawn(`+${formatK(e.net)} online`, 'gain', e.x, e.z);
    else if (e.type === 'stored') floats.spawn('📦 Vào kho', 'gain', e.x, e.z);
    else if (e.type === 'orderCancelled') floats.spawn('Huỷ đơn -1★', 'loss', e.x, e.z);
    else if (e.type === 'dayEnd') showDaySummary(ui, e.summary);
  });
  conn.onStatus((st, code) => {
    if (st === 'reconnecting') hud.setStatus('Mất kết nối — đang kết nối lại…');
    else if (st === 'connected') hud.setStatus(null);
    else if (code === 4001) hud.setStatus('Nhân vật này vừa được mở ở tab/máy khác (cùng tên). Tab này đã ngắt.');
    else hud.setStatus('Đã ngắt kết nối. Tải lại trang để vào lại.');
  });
}

showLobby(root, enterGame);
