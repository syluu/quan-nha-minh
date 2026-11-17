import { createHash } from 'node:crypto';
import { Room } from '@colyseus/core';
import type { Client } from '@colyseus/core';
import {
  BALANCE,
  MSG,
  joinPlayer,
  leavePlayer,
  normalizeCode,
  normalizeLoaded,
  setInput,
  tick,
  toSnapshot,
} from '@qnm/shared';
import type { InputMsg, JoinOptions, WorldState } from '@qnm/shared';
import type { WorldStore } from '../persistence';

interface ClientData {
  playerId: string;
  kicked?: boolean;
}

export const KICK_DUPLICATE = 4001;

export function playerIdFromToken(token: string): string {
  return createHash('sha256').update(String(token)).digest('hex').slice(0, 12);
}

function cleanName(name: unknown): string {
  const s = String(name ?? '').trim().slice(0, 16);
  return s || 'Người chơi';
}

/** Một phòng = một thế giới (quán của một gia đình), xác định bằng mã. */
export class WorldRoom extends Room {
  static store: WorldStore;
  maxClients = BALANCE.MAX_PLAYERS;
  private world!: WorldState;
  private saving: Promise<void> = Promise.resolve();

  async onCreate(options: { code?: string }) {
    const code = String(options?.code ?? '');
    if (normalizeCode(code) !== code) throw new Error('INVALID_CODE');
    const raw = await WorldRoom.store.load(code);
    if (!raw) throw new Error('WORLD_NOT_FOUND');
    this.world = normalizeLoaded(raw);

    this.onMessage(MSG.input, (client: Client, msg: InputMsg) => {
      const data = client.userData as ClientData | undefined;
      if (data) setInput(this.world, data.playerId, msg ?? { mx: 0, mz: 0 });
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

  onJoin(client: Client, options: JoinOptions) {
    const playerId = playerIdFromToken(options?.token ?? client.sessionId);
    for (const other of this.clients) {
      const data = other.userData as ClientData | undefined;
      if (other !== client && data?.playerId === playerId) {
        data.kicked = true;
        other.leave(KICK_DUPLICATE);
      }
    }
    client.userData = { playerId } satisfies ClientData;
    joinPlayer(this.world, playerId, cleanName(options?.name));
    client.send(MSG.welcome, { playerId, code: this.world.code });
  }

  onDrop(client: Client) {
    this.allowReconnection(client, BALANCE.RECONNECT_SEC);
  }

  onLeave(client: Client) {
    const data = client.userData as ClientData | undefined;
    if (!data || data.kicked) return;
    leavePlayer(this.world, data.playerId);
  }

  async onDispose() {
    await this.save();
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
