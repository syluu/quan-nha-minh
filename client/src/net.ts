import { Client } from '@colyseus/sdk';
import { MSG } from '@qnm/shared';
import type { JoinOptions, SimEvent, Snapshot, WelcomeMsg } from '@qnm/shared';

export type ConnStatus = 'connected' | 'reconnecting' | 'left';

export interface GameConnection {
  playerId: string;
  code: string;
  onSnapshot(cb: (s: Snapshot) => void): void;
  onEvent(cb: (e: SimEvent) => void): void;
  onStatus(cb: (s: ConnStatus, code?: number) => void): void;
  sendInput(mx: number, mz: number): void;
  leave(): void;
}

export function serverEndpoint(): string {
  return import.meta.env.DEV ? `http://${location.hostname}:2567` : location.origin;
}

export async function createWorldOnServer(): Promise<string> {
  const res = await fetch('/api/worlds', { method: 'POST' });
  if (!res.ok) throw new Error('CREATE_FAILED');
  return ((await res.json()) as { code: string }).code;
}

export async function connect(opts: JoinOptions): Promise<GameConnection> {
  const client = new Client(serverEndpoint());
  const room = await client.joinOrCreate('world', opts);

  const snapshotCbs: ((s: Snapshot) => void)[] = [];
  const eventCbs: ((e: SimEvent) => void)[] = [];
  const statusCbs: ((s: ConnStatus, code?: number) => void)[] = [];
  const welcome = new Promise<WelcomeMsg>((resolve, reject) => {
    room.onMessage(MSG.welcome, (m: WelcomeMsg) => resolve(m));
    setTimeout(() => reject(new Error('NO_WELCOME')), 5000);
  });
  room.onMessage(MSG.snapshot, (s: Snapshot) => snapshotCbs.forEach((cb) => cb(s)));
  room.onMessage(MSG.event, (e: SimEvent) => eventCbs.forEach((cb) => cb(e)));
  room.onDrop(() => statusCbs.forEach((cb) => cb('reconnecting')));
  room.onReconnect(() => statusCbs.forEach((cb) => cb('connected')));
  room.onLeave((code: number) => statusCbs.forEach((cb) => cb('left', code)));

  const { playerId } = await welcome;
  return {
    playerId,
    code: opts.code,
    onSnapshot: (cb) => snapshotCbs.push(cb),
    onEvent: (cb) => eventCbs.push(cb),
    onStatus: (cb) => statusCbs.push(cb),
    sendInput: (mx, mz) => room.send(MSG.input, { mx, mz }),
    leave: () => void room.leave(),
  };
}
