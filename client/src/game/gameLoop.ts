import * as THREE from 'three';
import { BALANCE, ITEMS, SHOPS } from '@qnm/shared';
import type { Snapshot } from '@qnm/shared';
import { createKeyboardInput } from '../input';
import type { GameConnection } from '../net';
import { createFollowCamera } from '../render/camera';
import { createCharacter } from '../render/characters';
import { createPickRing } from '../render/pickRing';
import type { CharacterView } from '../render/characters';
import { createScene } from '../render/scene';
import { createStationView } from '../render/stations';
import { createTileView } from '../render/payTiles';
import { createInterpolator } from './interp';
import { createPredictor } from './prediction';

export interface GameHandle {
  /** Tắt/bật điều khiển di chuyển (khi mở/đóng menu). */
  setInputEnabled(on: boolean): void;
  /** Chiếu một điểm thế giới ra toạ độ màn hình (px) — dùng cho chữ nổi. */
  project(x: number, y: number, z: number): { x: number; y: number };
}

/** Vòng lặp vẽ: nhận snapshot → nội suy; nhân vật của mình dùng dự đoán; camera đi theo. */
export function startGame(conn: GameConnection, container: HTMLElement): GameHandle {
  const { renderer, scene, camera } = createScene(container);
  const cam = createFollowCamera(camera, renderer.domElement);
  const layout = SHOPS.banh_mi;
  const interp = createInterpolator(100);
  const predictor = createPredictor();
  const input = createKeyboardInput();

  const stationViews = new Map(layout.stations.map((p) => [p.instanceId, createStationView(p)]));
  const tileViews = new Map(layout.stations.map((p) => [p.instanceId, createTileView(p)]));
  for (const v of stationViews.values()) scene.add(v.group);
  for (const v of tileViews.values()) scene.add(v.group);

  const players = new Map<string, CharacterView>();
  const customers = new Map<number, CharacterView>();
  const staffViews = new Map<string, CharacterView>();
  const pickRing = createPickRing(scene);
  const lastPos = new Map<string, { x: number; z: number }>();
  let latest: Snapshot | null = null;
  let cameraSnapped = false;

  conn.onSnapshot((s) => {
    latest = s;
    interp.push(s, performance.now());
    const me = s.players.find((p) => p.id === conn.playerId);
    if (me) predictor.reconcile(me);
  });

  const solid = (id: string) => latest?.stations.find((st) => st.instanceId === id)?.unlocked ?? false;

  let lastSent = { mx: 0, mz: 0 };
  let sendTimer = 0;
  let prev = performance.now();

  function frame(now: number) {
    const dt = Math.min(0.1, (now - prev) / 1000);
    prev = now;
    const t = now / 1000;

    const local = input.read();
    sendTimer -= dt;
    if (local.mx !== lastSent.mx || local.mz !== lastSent.mz || sendTimer <= 0) {
      conn.sendInput(local.mx, local.mz);
      lastSent = local;
      sendTimer = 0.1;
    }
    const myPose = predictor.ready() ? predictor.step(local, dt, solid) : null;

    const s = interp.sample(now);
    if (s) {
      for (const st of s.stations) stationViews.get(st.instanceId)?.update(st);
      const tiles = new Map(s.tiles.map((x) => [x.instanceId, x]));
      for (const [id, v] of tileViews) v.update(tiles.get(id));

      const seen = new Set<string>();
      for (const p of s.players) {
        if (!p.online) continue;
        seen.add(p.id);
        let v = players.get(p.id);
        if (!v) {
          v = createCharacter(p.color, { look: 'player', name: p.name });
          players.set(p.id, v);
          scene.add(v.group);
        }
        const isMe = p.id === conn.playerId && myPose;
        const pose = isMe ? myPose! : p;
        const prevPos = lastPos.get(p.id);
        const moving = !!prevPos && Math.hypot(pose.x - prevPos.x, pose.z - prevPos.z) > 0.002;
        lastPos.set(p.id, { x: pose.x, z: pose.z });
        v.setPose(pose.x, pose.z, pose.dir, moving, t);
        v.setCarry(p.carry, p.cap);
      }
      for (const [id, v] of players) if (!seen.has(id)) (v.dispose(), players.delete(id));

      const seenC = new Set<number>();
      for (const c of s.customers) {
        seenC.add(c.id);
        let v = customers.get(c.id);
        if (!v) {
          v = createCharacter([0x3d7dd8, 0xd8573d, 0x5aa34a, 0x9b59b6, 0xe0a020, 0x2aa3a3][c.id % 6], { look: 'customer' });
          customers.set(c.id, v);
          scene.add(v.group);
        }
        const key = `c${c.id}`;
        const prevPos = lastPos.get(key);
        const moving = !!prevPos && Math.hypot(c.x - prevPos.x, c.z - prevPos.z) > 0.002;
        lastPos.set(key, { x: c.x, z: c.z });
        v.setPose(c.x, c.z, c.dir, moving, t);
        v.setCarry(c.holding);
      }
      for (const [id, v] of customers) if (!seenC.has(id)) (v.dispose(), customers.delete(id), lastPos.delete(`c${id}`));

      // Nhân viên
      const seenS = new Set<string>();
      for (const st of s.staff) {
        seenS.add(st.id);
        let v = staffViews.get(st.id);
        if (!v) {
          const job = st.role === 'cashier' ? 'thu ngân' : ITEMS[st.item!].name;
          v = createCharacter(0x7a8b99, { look: 'staff', name: `${st.name} · ${job}` });
          staffViews.set(st.id, v);
          scene.add(v.group);
        }
        const key = `s${st.id}`;
        const prevPos = lastPos.get(key);
        const moving = !!prevPos && Math.hypot(st.x - prevPos.x, st.z - prevPos.z) > 0.002;
        lastPos.set(key, { x: st.x, z: st.z });
        v.setPose(st.x, st.z, st.dir, moving, t);
        v.setCarry(st.carry, BALANCE.STAFF_CARRY);
      }
      for (const [id, v] of staffViews) if (!seenS.has(id)) (v.dispose(), staffViews.delete(id), lastPos.delete(`s${id}`));

      // Vòng tiến trình nhặt món của chính mình
      const meSnap = latest?.players.find((p) => p.id === conn.playerId);
      const mePose = myPose ?? meSnap;
      pickRing.update(meSnap?.pickAt && mePose ? meSnap.pick : 0, mePose?.x ?? 0, mePose?.z ?? 0);

      const focus = myPose ?? s.players.find((p) => p.id === conn.playerId);
      if (focus) {
        if (!cameraSnapped) {
          cam.snap(focus.x, focus.z);
          cameraSnapped = true;
        }
        cam.follow(focus.x, focus.z, dt);
      }
    }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  const v = new THREE.Vector3();
  return {
    setInputEnabled(on) {
      input.setEnabled(on);
    },
    project(x, y, z) {
      v.set(x, y, z).project(camera);
      const r = renderer.domElement.getBoundingClientRect();
      return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
    },
  };
}
