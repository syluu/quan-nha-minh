import { Client } from '@colyseus/sdk';
import { MSG } from '@qnm/shared';
import type { CampaignId, ItemId, JoinOptions, Report, SimEvent, Snapshot, StaffRole, WelcomeMsg } from '@qnm/shared';

export type ConnStatus = 'connected' | 'reconnecting' | 'left';

export interface GameConnection {
  playerId: string;
  code: string;
  onSnapshot(cb: (s: Snapshot) => void): void;
  onEvent(cb: (e: SimEvent) => void): void;
  onStatus(cb: (s: ConnStatus, code?: number) => void): void;
  /** menu = true khi đang mở menu (máy chủ không cho mua ô / bỏ rác lúc đó). */
  sendInput(mx: number, mz: number, menu?: boolean): void;
  leave(): void;
  requestReport(): void;
  /** Đăng ký nhận báo cáo; trả về hàm huỷ đăng ký. */
  onReport(cb: (r: Report) => void): () => void;
  onActionError(cb: (error: string) => void): void;
  hire(role: StaffRole, item: ItemId | null): void;
  fire(staffId: string): void;
  setPrice(item: ItemId, price: number): void;
  rename(name: string): void;
  upgradePlayer(kind: 'carry' | 'speed'): void;
  upgradeStaff(staffId: string): void;
  upgradeMachine(instanceId: string): void;
  runCampaign(campaign: CampaignId): void;
  takeLoan(amount: number, months: number): void;
  repayLoan(loanId: string): void;
  sellStation(instanceId: string): void;
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
  const reportCbs: ((r: Report) => void)[] = [];
  const errorCbs: ((e: string) => void)[] = [];
  room.onMessage(MSG.report, (r: Report) => reportCbs.forEach((cb) => cb(r)));
  room.onMessage(MSG.actionError, (m: { error: string }) => errorCbs.forEach((cb) => cb(m.error)));
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
    sendInput: (mx, mz, menu = false) => room.send(MSG.input, { mx, mz, menu }),
    leave: () => void room.leave(),
    requestReport: () => room.send(MSG.getReport, {}),
    onReport: (cb) => {
      reportCbs.push(cb);
      return () => {
        const i = reportCbs.indexOf(cb);
        if (i >= 0) reportCbs.splice(i, 1);
      };
    },
    onActionError: (cb) => errorCbs.push(cb),
    hire: (role, item) => room.send(MSG.hire, { role, item }),
    fire: (staffId) => room.send(MSG.fire, { staffId }),
    setPrice: (item, price) => room.send(MSG.setPrice, { item, price }),
    rename: (name) => room.send(MSG.rename, { name }),
    upgradePlayer: (kind) => room.send(MSG.upgradePlayer, { kind }),
    upgradeStaff: (staffId) => room.send(MSG.upgradeStaff, { staffId }),
    upgradeMachine: (instanceId) => room.send(MSG.upgradeMachine, { instanceId }),
    runCampaign: (campaign) => room.send(MSG.runCampaign, { campaign }),
    takeLoan: (amount, months) => room.send(MSG.takeLoan, { amount, months }),
    repayLoan: (loanId) => room.send(MSG.repayLoan, { loanId }),
    sellStation: (instanceId) => room.send(MSG.sellStation, { instanceId }),
  };
}
