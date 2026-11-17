import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from '@colyseus/sdk';
import { MSG, normalizeCode } from '@qnm/shared';
import type { Snapshot } from '@qnm/shared';
import { createGameServer } from '../src/app';
import { MemoryWorldStore } from '../src/persistence';

const store = new MemoryWorldStore();
let game: Awaited<ReturnType<typeof createGameServer>>;
let base: string;

beforeAll(async () => {
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
  room.onLeave((c: number) => (leaveCode = c));
  return { room, snapshot: () => last, leaveCode: () => leaveCode };
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
