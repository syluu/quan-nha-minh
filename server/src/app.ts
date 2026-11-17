import { existsSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import express from 'express';
import { createWorld, generateCode } from '@qnm/shared';
import type { WorldStore } from './persistence';
import { WorldRoom } from './rooms/WorldRoom';

const CLIENT_DIST = resolve(dirname(fileURLToPath(import.meta.url)), '../../client/dist');

async function createUniqueWorld(store: WorldStore): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generateCode();
    if (await store.exists(code)) continue;
    try {
      await store.create(createWorld(code, Math.floor(Math.random() * 2 ** 31)));
      return code;
    } catch (err) {
      if ((err as Error).message !== 'CODE_TAKEN') throw err;
    }
  }
  throw new Error('NO_FREE_CODE');
}

export async function createGameServer(store: WorldStore) {
  WorldRoom.store = store;
  const transport = new WebSocketTransport();
  const gameServer = new Server({
    transport,
    express: (app) => {
      app.use(express.json());
      app.get('/health', (_req, res) => {
        res.json({ ok: true });
      });
      app.post('/api/worlds', async (_req, res) => {
        try {
          res.status(201).json({ code: await createUniqueWorld(store) });
        } catch (err) {
          console.error('[api] tạo quán lỗi', err);
          res.status(500).json({ error: 'CREATE_FAILED' });
        }
      });
      if (existsSync(CLIENT_DIST)) {
        app.use(express.static(CLIENT_DIST));
        app.use((req, res, next) => {
          if (req.method !== 'GET' || req.path.startsWith('/matchmake') || req.path.startsWith('/api')) return next();
          res.sendFile(resolve(CLIENT_DIST, 'index.html'));
        });
      }
    },
  });
  gameServer.define('world', WorldRoom).filterBy(['code']);

  return {
    gameServer,
    async listen(port: number): Promise<number> {
      await gameServer.listen(port);
      const httpServer = (transport as unknown as { server: import('node:http').Server }).server;
      return (httpServer.address() as AddressInfo).port;
    },
    async close(): Promise<void> {
      await gameServer.gracefullyShutdown(false);
    },
  };
}
