import { createHash } from 'node:crypto';
import { Room } from '@colyseus/core';
import type { Client } from '@colyseus/core';
import {
  BALANCE,
  MSG,
  buildReport,
  fireStaff,
  hireStaff,
  joinPlayer,
  leavePlayer,
  normalizeCode,
  normalizeLoaded,
  renamePlayer,
  setInput,
  setPrice,
  tick,
  toSnapshot,
} from '@qnm/shared';
import type { ActionResult, FireMsg, HireMsg, InputMsg, JoinOptions, RenameMsg, SetPriceMsg, WorldState } from '@qnm/shared';
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
    this.world = normalizeLoaded(raw);

    this.onMessage(MSG.input, (client: Client, msg: InputMsg) => {
      const pid = this.ownedPlayer(client);
      if (pid) setInput(this.world, pid, msg ?? { mx: 0, mz: 0 });
    });

    // Thao tác quản lý: chỉ chủ nhân vật mới được gửi; lỗi trả về riêng cho người gửi.
    const act = <T,>(type: string, run: (pid: string, msg: T) => ActionResult | void) =>
      this.onMessage(type, (client: Client, msg: T) => {
        const pid = this.ownedPlayer(client);
        if (!pid) return;
        const r = run(pid, (msg ?? {}) as T);
        if (r && !r.ok) client.send(MSG.actionError, { error: r.error });
      });
    act<HireMsg>(MSG.hire, (pid, m) => hireStaff(this.world, 'banh_mi', m.role, m.item ?? null, pid));
    act<FireMsg>(MSG.fire, (pid, m) => fireStaff(this.world, 'banh_mi', String(m.staffId), pid));
    act<SetPriceMsg>(MSG.setPrice, (pid, m) => setPrice(this.world, 'banh_mi', m.item, m.price, pid));
    act<RenameMsg>(MSG.rename, (pid, m) => renamePlayer(this.world, pid, m.name));
    this.onMessage(MSG.getReport, (client: Client) => {
      if (this.ownedPlayer(client)) client.send(MSG.report, buildReport(this.world));
    });

    this.setSimulationInterval((deltaMs) => {
      for (const e of tick(this.world, deltaMs / 1000)) {
        this.broadcast(MSG.event, e);
        if (e.type === 'dayEnd') void this.save();
      }
    }, 1000 / BALANCE.TICK_HZ);

    this.clock.setInterval(() => this.broadcast(MSG.snapshot, toSnapshot(this.world, 'banh_mi')), 1000 / BALANCE.SNAPSHOT_HZ);
    this.clock.setInterval(() => void this.save(), BALANCE.AUTOSAVE_SEC * 1000);
  }

  onAuth(_client: Client, options: JoinOptions) {
    const pid = playerIdFromToken(options?.token ?? '');
    if (!this.owners.has(pid) && this.owners.size >= BALANCE.MAX_PLAYERS) throw new Error('WORLD_FULL');
    return true;
  }

  onJoin(client: Client, options: JoinOptions) {
    const playerId = playerIdFromToken(options?.token ?? client.sessionId);
    const previous = this.owners.get(playerId);
    if (previous) {
      // Cùng trình duyệt mở tab mới / F5: tab cũ (nếu còn sống) bị đá; nếu đang giữ chỗ thì bị đá khi kết nối lại.
      this.clients.find((c) => c.sessionId === previous)?.leave(KICK_DUPLICATE);
    }
    this.owners.set(playerId, client.sessionId);
    client.userData = { playerId } satisfies ClientData;
    joinPlayer(this.world, playerId, cleanName(options?.name));
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
