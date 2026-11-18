import { createHash } from 'node:crypto';
import { Room } from '@colyseus/core';
import type { Client } from '@colyseus/core';
import {
  BALANCE,
  MSG,
  SHOP_IDS,
  buildReport,
  drainSettleEvents,
  fireStaff,
  repayLoan,
  runCampaign,
  sellStation,
  setOnlinePaused,
  upgradePickup,
  takeLoan,
  upgradeMachine,
  upgradePlayer,
  upgradeStaff,
  hireStaff,
  joinPlayer,
  findPlayerByName,
  rentShop,
  buyCostume,
  buyAd,
  sellWarehouse,
  wearCostume,
  setMachineEnabled,
  travel,
  leavePlayer,
  normalizeCode,
  normalizeLoaded,
  renamePlayer,
  setInput,
  setPrice,
  tick,
  toSnapshot,
} from '@qnm/shared';
import type {
  ActionResult, FireMsg, HireMsg, InputMsg, JoinOptions, RenameMsg, RepayLoanMsg, RunCampaignMsg, SellStationMsg, SetPriceMsg,
  SetOnlinePausedMsg, TakeLoanMsg, UpgradeMachineMsg, UpgradePlayerMsg, UpgradeStaffMsg, WorldState,
  BuyAdMsg, CostumeMsg, SellWarehouseMsg, RentShopMsg, SetMachineEnabledMsg, ShopId, Snapshot, TravelMsg,
} from '@qnm/shared';
import type { WorldStore } from '../persistence';

interface ClientData {
  playerId: string;
}

export const KICK_DUPLICATE = 4001;

export function playerIdFromToken(token: string): string {
  return createHash('sha256').update(String(token)).digest('hex').slice(0, 12);
}

function cleanName(name: unknown): string {
  const s = String(name ?? '').trim().slice(0, 16);
  return s || 'Người chơi';
}

/** Mỗi mã quán chỉ có đúng một phòng đang chạy (hoặc đang lưu lúc đóng) trong tiến trình này. */
type ActiveEntry = { room: WorldRoom } | { disposing: Promise<void> };

/** Một phòng = một thế giới (quán của một gia đình), xác định bằng mã. */
export class WorldRoom extends Room {
  static store: WorldStore;
  /** Số giây giữ chỗ khi rớt mạng (test đặt nhỏ để chạy nhanh). */
  static reconnectSec: number = BALANCE.RECONNECT_SEC;
  static active = new Map<string, ActiveEntry>();

  /** Dư ghế cho các chỗ đang giữ khi F5/rớt mạng; giới hạn người thật kiểm ở onAuth. */
  maxClients = BALANCE.MAX_PLAYERS * 2;
  private world!: WorldState;
  private code = '';
  /** playerId → sessionId của tab đang sở hữu nhân vật. */
  private owners = new Map<string, string>();
  private saving: Promise<void> = Promise.resolve();

  async onCreate(options: { code?: string }) {
    const code = String(options?.code ?? '');
    if (normalizeCode(code) !== code) throw new Error('INVALID_CODE');

    // Không bao giờ có 2 phòng cho cùng một quán: phòng cũ đang lưu thì chờ, đang chạy thì từ chối.
    for (let entry = WorldRoom.active.get(code); entry; entry = WorldRoom.active.get(code)) {
      if ('room' in entry) throw new Error('WORLD_BUSY');
      await entry.disposing;
    }
    WorldRoom.active.set(code, { room: this });
    this.code = code;

    const raw = await WorldRoom.store.load(code).catch((err) => {
      WorldRoom.active.delete(code);
      throw err;
    });
    if (!raw) {
      WorldRoom.active.delete(code);
      throw new Error('WORLD_NOT_FOUND');
    }
    try {
      this.world = normalizeLoaded(raw);
    } catch (err) {
      // File lưu hỏng / phiên bản lạ: nhả mã quán để lần sau còn thử lại được (không kẹt WORLD_BUSY).
      WorldRoom.active.delete(code);
      throw err;
    }

    this.onMessage(MSG.input, (client: Client, msg: InputMsg) => {
      const pid = this.ownedPlayer(client);
      if (pid) setInput(this.world, pid, msg ?? { mx: 0, mz: 0 });
    });

    // Thao tác quản lý: chỉ chủ nhân vật mới được gửi; lỗi trả về riêng cho người gửi.
    const act = <T,>(type: string, run: (pid: string, msg: T) => ActionResult | void) =>
      this.onMessage(type, (client: Client, msg: T) => {
        const pid = this.ownedPlayer(client);
        if (!pid) return;
        // Thao tác theo quán gửi kèm quán đang xem; vừa bị chuyển quán (vd. người nhà trả mặt bằng) thì từ chối.
        const sent = (msg as { shopId?: unknown } | null)?.shopId;
        if (type !== MSG.sellStation && type !== MSG.rentShop && sent !== undefined && sent !== this.world.players[pid]?.location) {
          client.send(MSG.actionError, { error: 'WRONG_SHOP' });
          return;
        }
        const r = run(pid, (msg ?? {}) as T);
        if (r && !r.ok) client.send(MSG.actionError, { error: r.error });
        // Vay / bán máy có thể vừa đóng kết toán tháng (hoặc phá sản): báo cho cả nhà và lưu ngay.
        const settled = drainSettleEvents(this.world);
        for (const e of settled) this.broadcast(MSG.event, e);
        if (settled.length) void this.save();
      });
    // Thao tác theo quán: luôn là quán người gửi đang đứng.
    const here = (pid: string): ShopId => this.world.players[pid]?.location ?? 'banh_mi';
    act<HireMsg>(MSG.hire, (pid, m) => hireStaff(this.world, here(pid), m.role, m.item ?? null, pid));
    act<FireMsg>(MSG.fire, (pid, m) => fireStaff(this.world, here(pid), String(m.staffId), pid));
    act<SetPriceMsg>(MSG.setPrice, (pid, m) => setPrice(this.world, here(pid), m.item, m.price, pid));
    act<RenameMsg>(MSG.rename, (pid, m) => renamePlayer(this.world, pid, m.name));
    act<UpgradePlayerMsg>(MSG.upgradePlayer, (pid, m) => upgradePlayer(this.world, pid, m.kind));
    act<UpgradeStaffMsg>(MSG.upgradeStaff, (pid, m) => upgradeStaff(this.world, here(pid), m.staffId, pid));
    act<UpgradeMachineMsg>(MSG.upgradeMachine, (pid, m) => upgradeMachine(this.world, here(pid), m.instanceId, pid));
    act<SetMachineEnabledMsg>(MSG.setMachineEnabled, (pid, m) => setMachineEnabled(this.world, here(pid), m.instanceId, m.enabled, pid));
    act<RunCampaignMsg>(MSG.runCampaign, (pid, m) => runCampaign(this.world, here(pid), m.campaign, pid));
    act<TakeLoanMsg>(MSG.takeLoan, (pid, m) => takeLoan(this.world, m.amount, m.months, pid, m.forMonth));
    act<RepayLoanMsg>(MSG.repayLoan, (pid, m) => repayLoan(this.world, m.loanId, pid));
    act<SellStationMsg>(MSG.sellStation, (pid, m) => {
      const shopId = (SHOP_IDS as unknown[]).includes(m.shopId) ? m.shopId! : here(pid);
      return sellStation(this.world, shopId, m.instanceId, pid, m.forMonth);
    });
    act<SetOnlinePausedMsg>(MSG.setOnlinePaused, (pid, m) => setOnlinePaused(this.world, here(pid), m.paused, pid));
    act<Record<string, never>>(MSG.upgradePickup, (pid) => upgradePickup(this.world, here(pid), pid));
    act<RentShopMsg>(MSG.rentShop, (pid, m) => rentShop(this.world, m.shopId, pid));
    act<TravelMsg>(MSG.travel, (pid, m) => travel(this.world, pid, m.to));
    act<BuyAdMsg>(MSG.buyAd, (pid, m) => buyAd(this.world, here(pid), m.ad, pid));
    act<SellWarehouseMsg>(MSG.sellWarehouse, (pid, m) => sellWarehouse(this.world, m.ingredient, m.qty, pid));
    act<CostumeMsg>(MSG.buyCostume, (pid, m) => buyCostume(this.world, pid, m.id));
    act<CostumeMsg>(MSG.wearCostume, (pid, m) => wearCostume(this.world, pid, m.id));
    this.onMessage(MSG.getReport, (client: Client) => {
      if (this.ownedPlayer(client)) client.send(MSG.report, buildReport(this.world));
    });

    this.setSimulationInterval((deltaMs) => {
      for (const e of tick(this.world, deltaMs / 1000)) {
        this.broadcast(MSG.event, e);
        if (e.type === 'dayEnd' || e.type === 'monthEnd' || e.type === 'monthClosed' || e.type === 'bankrupt') void this.save();
      }
    }, 1000 / BALANCE.TICK_HZ);

    this.clock.setInterval(() => this.sendSnapshots(), 1000 / BALANCE.SNAPSHOT_HZ);
    this.clock.setInterval(() => void this.save(), BALANCE.AUTOSAVE_SEC * 1000);
  }

  /**
   * Nhân vật của người vào phòng: trùng tên (không phân biệt hoa/thường) với một nhân vật có sẵn → dùng lại nhân vật đó
   * (cùng phòng + cùng tên = cùng một người, kể cả vào từ máy khác); không trùng thì theo mã trình duyệt.
   */
  private resolvePlayerId(options: JoinOptions, fallback: string): string {
    const byName = findPlayerByName(this.world, cleanName(options?.name));
    return byName?.id ?? playerIdFromToken(options?.token ?? fallback);
  }

  onAuth(_client: Client, options: JoinOptions) {
    const pid = this.resolvePlayerId(options, '');
    if (!this.owners.has(pid) && this.owners.size >= BALANCE.MAX_PLAYERS) throw new Error('WORLD_FULL');
    return true;
  }

  onJoin(client: Client, options: JoinOptions) {
    const playerId = this.resolvePlayerId(options, client.sessionId);
    const previous = this.owners.get(playerId);
    if (previous) {
      // Cùng trình duyệt mở tab mới / F5: tab cũ (nếu còn sống) bị đá; nếu đang giữ chỗ thì bị đá khi kết nối lại.
      this.clients.find((c) => c.sessionId === previous)?.leave(KICK_DUPLICATE);
    }
    this.owners.set(playerId, client.sessionId);
    client.userData = { playerId } satisfies ClientData;
    // Vào bằng tên của nhân vật có sẵn: giữ nguyên cách viết tên cũ ("bố" vào lại vẫn là "Bố").
    const sameName = findPlayerByName(this.world, cleanName(options?.name));
    joinPlayer(this.world, playerId, sameName?.id === playerId ? sameName.name : cleanName(options?.name));
    client.send(MSG.welcome, { playerId, code: this.world.code });
  }

  onDrop(client: Client) {
    // Rớt mạng: nhân vật offline ngay (nhả ô trả tiền, dừng input), giữ chỗ để kết nối lại.
    const pid = this.ownedPlayer(client);
    if (pid) leavePlayer(this.world, pid);
    void Promise.resolve(this.allowReconnection(client, WorldRoom.reconnectSec)).catch(() => {});
  }

  onReconnect(client: Client) {
    const pid = this.ownedPlayer(client);
    if (!pid) {
      client.leave(KICK_DUPLICATE);
      return;
    }
    joinPlayer(this.world, pid, this.world.players[pid]?.name ?? 'Người chơi');
  }

  onLeave(client: Client) {
    const pid = this.ownedPlayer(client);
    if (!pid) return;
    this.owners.delete(pid);
    leavePlayer(this.world, pid);
  }

  async onDispose() {
    const done = this.save();
    const entry: ActiveEntry = { disposing: done };
    WorldRoom.active.set(this.code, entry);
    await done;
    if (WorldRoom.active.get(this.code) === entry) WorldRoom.active.delete(this.code);
  }

  /** Mỗi client nhận snapshot của quán mình đang đứng (mỗi quán dựng 1 lần). */
  private sendSnapshots() {
    const cache = new Map<ShopId, Snapshot>();
    for (const client of this.clients) {
      const pid = this.ownedPlayer(client);
      const loc: ShopId = (pid && this.world.players[pid]?.location) || 'banh_mi';
      let snap = cache.get(loc);
      if (!snap) cache.set(loc, (snap = toSnapshot(this.world, loc)));
      client.send(MSG.snapshot, snap);
    }
  }

  /** playerId nếu client này đang là chủ nhân vật, ngược lại null. */
  private ownedPlayer(client: Client): string | null {
    const data = client.userData as ClientData | undefined;
    if (!data) return null;
    return this.owners.get(data.playerId) === client.sessionId ? data.playerId : null;
  }

  private save(): Promise<void> {
    if (!this.world) return Promise.resolve();
    // Lưu nối tiếp để hai lần lưu không ghi đè lộn xộn.
    this.saving = this.saving
      .then(() => WorldRoom.store.save(this.world))
      .catch((err) => console.error('[save] lỗi lưu thế giới', this.world.code, err));
    return this.saving;
  }
}
