import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from '@colyseus/sdk';
import { MSG, normalizeCode } from '@qnm/shared';
import type { Report, Snapshot } from '@qnm/shared';
import { createGameServer } from '../src/app';
import { MemoryWorldStore } from '../src/persistence';
import { WorldRoom } from '../src/rooms/WorldRoom';

const store = new MemoryWorldStore();
let game: Awaited<ReturnType<typeof createGameServer>>;
let base: string;

beforeAll(async () => {
  WorldRoom.reconnectSec = 1;
  game = await createGameServer(store);
  const port = await game.listen(0);
  base = `http://localhost:${port}`;
});

afterAll(async () => {
  await game.close();
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function newWorld(): Promise<string> {
  const res = await fetch(`${base}/api/worlds`, { method: 'POST' });
  expect(res.status).toBe(201);
  return ((await res.json()) as { code: string }).code;
}

async function join(code: string, token: string, name = 'Bố') {
  const client = new Client(base);
  const room = await client.joinOrCreate('world', { code, token, name });
  let last: Snapshot | null = null;
  let leaveCode: number | null = null;
  room.onMessage(MSG.snapshot, (s: Snapshot) => (last = s));
  room.onMessage(MSG.event, () => {});
  room.onMessage(MSG.welcome, () => {});
  const errors: string[] = [];
  let report: Report | null = null;
  room.onMessage(MSG.actionError, (m: { error: string }) => errors.push(m.error));
  room.onMessage(MSG.report, (r: Report) => (report = r));
  room.onLeave((c: number) => (leaveCode = c));
  return { room, snapshot: () => last, leaveCode: () => leaveCode, errors, report: () => report };
}

describe('http', () => {
  it('GET /health → {ok:true}', async () => {
    const res = await fetch(`${base}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('POST /api/worlds returns a fresh code', async () => {
    const code = await newWorld();
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{3}-[A-HJ-NP-Z2-9]{3}$/);
    expect(await store.exists(code)).toBe(true);
  });
});

describe('WorldRoom', () => {
  it('two family members join the same shop (one typed the code in lowercase)', async () => {
    const code = await newWorld();
    const a = await join(code, 'token-a', 'Bố');
    const b = await join(normalizeCode(code.toLowerCase().replace('-', ' '))!, 'token-b', 'Mẹ');
    await sleep(500);
    const s = a.snapshot()!;
    expect(s.players.filter((p) => p.online).map((p) => p.name).sort()).toEqual(['Bố', 'Mẹ']);
    await a.room.leave();
    await b.room.leave();
  });

  it('rejects unknown and non-normalized codes', async () => {
    await expect(new Client(base).joinOrCreate('world', { code: 'ZZZ-ZZZ', token: 't', name: 'x' })).rejects.toThrow();
    await expect(new Client(base).joinOrCreate('world', { code: 'abc def', token: 't', name: 'x' })).rejects.toThrow();
  });

  it('the same browser token twice keeps one character and kicks the old tab with 4001 (Review Focus 3)', async () => {
    const code = await newWorld();
    const first = await join(code, 'same-token');
    const second = await join(code, 'same-token');
    await sleep(500);
    expect(first.leaveCode()).toBe(4001);
    const s = second.snapshot()!;
    expect(s.players.filter((p) => p.online)).toHaveLength(1);
    expect(s.players).toHaveLength(1);
    await second.room.leave();
  });

  it('a reload (drop + rejoin with the same token) keeps the new tab online after the reconnect window (C1)', async () => {
    const code = await newWorld();
    const watcher = await join(code, 'watcher', 'Mẹ');
    const first = await join(code, 'reload-token', 'Bố');
    await first.room.leave(false); // F5: rớt mạng không chủ động
    await sleep(200);
    const second = await join(code, 'reload-token', 'Bố');
    await sleep(WorldRoom.reconnectSec * 1000 + 800);
    const bo = watcher.snapshot()!.players.filter((p) => p.name === 'Bố');
    expect(bo).toHaveLength(1);
    expect(bo[0].online).toBe(true);
    expect(second.leaveCode()).toBeNull();
    await second.room.leave();
    await watcher.room.leave();
  });

  it('a dropped player goes offline right away so tiles and input are released (I1)', async () => {
    const code = await newWorld();
    const watcher = await join(code, 'w2', 'Mẹ');
    const a = await join(code, 'drop-me', 'Bố');
    await sleep(300);
    await a.room.leave(false);
    await sleep(400);
    expect(watcher.snapshot()!.players.find((p) => p.name === 'Bố')?.online).toBe(false);
    await watcher.room.leave();
  });

  it('never forks a world: a 5th distinct player is refused, reloads stay in the same room (C2)', async () => {
    const code = await newWorld();
    const members = [];
    for (let i = 0; i < 4; i++) members.push(await join(code, `fam-${i}`, `P${i}`));
    await expect(join(code, 'stranger', 'X')).rejects.toThrow(/WORLD_FULL/);
    // 2 người F5 trong lúc ghế còn giữ chỗ → vẫn cùng một phòng.
    await members[0].room.leave(false);
    await members[1].room.leave(false);
    const back0 = await join(code, 'fam-0', 'P0');
    const back1 = await join(code, 'fam-1', 'P1');
    expect(back0.room.roomId).toBe(members[2].room.roomId);
    expect(back1.room.roomId).toBe(members[2].room.roomId);
    for (const m of [back0, back1, members[2], members[3]]) await m.room.leave();
  });

  it('saves the world with everyone offline when the last person leaves (Review Focus 4)', async () => {
    const code = await newWorld();
    const a = await join(code, 'token-x');
    const b = await join(code, 'token-y');
    await sleep(300);
    await a.room.leave();
    await b.room.leave();
    await sleep(500);
    const saved = (await store.load(code)) as { players: Record<string, { online: boolean }> };
    const players = Object.values(saved.players);
    expect(players).toHaveLength(2);
    expect(players.every((p) => p.online === false)).toBe(true);
  });
});

describe('management messages', () => {
  it('hire, refuse a second cashier, set a price, rename and fetch the report', async () => {
    const code = await newWorld();
    const a = await join(code, 'mgr-token', 'Mẹ');
    a.room.send(MSG.hire, { role: 'cashier', item: null });
    await sleep(300);
    expect(a.snapshot()!.staff.map((s) => s.role)).toEqual(['cashier']);
    a.room.send(MSG.hire, { role: 'cashier', item: null });
    await sleep(300);
    expect(a.errors).toEqual(['NO_SLOT']);
    a.room.send(MSG.setPrice, { item: 'banh_mi', price: 6000 });
    a.room.send(MSG.rename, { name: 'Ông Bố' });
    a.room.send(MSG.getReport, {});
    await sleep(300);
    expect(a.snapshot()!.prices.banh_mi).toBe(6000);
    expect(a.snapshot()!.players[0].name).toBe('Ông Bố');
    expect(a.report()!.today.day).toBe(1);
    const staffId = a.snapshot()!.staff[0].id;
    a.room.send(MSG.fire, { staffId });
    await sleep(300);
    expect(a.snapshot()!.staff).toEqual([]);
    await a.room.leave();
  });
});

describe('plan 3 messages', () => {
  it('loan, campaign and player upgrade go through; junk loan is refused', async () => {
    const code = await newWorld();
    const a = await join(code, 'p3-token', 'Bố');
    await sleep(300);
    const money0 = a.snapshot()!.money;
    a.room.send(MSG.takeLoan, { amount: 1_000_000, months: 2 });
    a.room.send(MSG.takeLoan, { amount: 'x', months: 2 });
    a.room.send(MSG.runCampaign, { campaign: 'to_roi' });
    a.room.send(MSG.upgradePlayer, { kind: 'carry' });
    await sleep(400);
    const s = a.snapshot()!;
    expect(s.loans).toHaveLength(1);
    expect(s.campaigns.map((c) => c.id)).toEqual(['to_roi']);
    expect(s.players[0].cap).toBe(6);
    expect(a.errors).toEqual(['BAD_AMOUNT']);
    // tiền: +1.000K vay −200K quảng cáo −300K nâng cấp (± nguyên liệu lò bánh trong lúc chờ)
    expect(Math.abs(s.money - (money0 + 1_000_000 - 200_000 - 300_000))).toBeLessThan(20_000);
    await a.room.leave();
  });
});
