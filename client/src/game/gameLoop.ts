import * as THREE from 'three';
import { BALANCE, SHOPS } from '@qnm/shared';
import type { ShopId, Snapshot } from '@qnm/shared';
import { createInputGate, createKeyboardInput } from '../input';
import { createPointerControls, dragToWorld } from '../pointer';
import type { GameConnection } from '../net';
import { createFollowCamera } from '../render/camera';
import { createCharacter } from '../render/characters';
import { createPickRing } from '../render/pickRing';
import { createShipperView } from '../render/shipper';
import { createAdDecor } from '../render/adDecor';
import { staffLabel } from '../ui/menu/views';
import type { CharacterView } from '../render/characters';
import { createScene, createShopBackdrop } from '../render/scene';
import { createStationView } from '../render/stations';
import type { StationView } from '../render/stations';
import { createTileView } from '../render/payTiles';
import type { TileView } from '../render/payTiles';
import { disposeTree } from '../render/materials';
import { createInterpolator } from './interp';
import { createPredictor } from './prediction';

export interface GameHandle {
  /** Khoá/mở điều khiển di chuyển theo từng lý do ('menu', 'settle'…). */
  setInputBlocked(reason: string, blocked: boolean): void;
  /** Chiếu một điểm thế giới ra toạ độ màn hình (px) — dùng cho chữ nổi. */
  project(x: number, y: number, z: number): { x: number; y: number };
}

/** Vòng lặp vẽ: nhận snapshot → nội suy; nhân vật của mình dùng dự đoán; camera đi theo. */
export function startGame(conn: GameConnection, container: HTMLElement): GameHandle {
  const { renderer, scene, camera } = createScene(container);
  const cam = createFollowCamera(camera, renderer.domElement);
  const interp = createInterpolator(100);
  const predictor = createPredictor();
  const input = createKeyboardInput();
  // Chuột: giữ trái kéo = joystick; giữ phải kéo = xem quanh quán.
  const pointer = createPointerControls(renderer.domElement, container, (dx, dy) => {
    const d = dragToWorld(dx, dy, cam.metersPerPx());
    cam.pan(d.x, d.z);
  });
  const gate = createInputGate();

  let stationViews = new Map<string, StationView>();
  let tileViews = new Map<string, TileView>();
  let backdrop: THREE.Group | null = null;
  let shopId: ShopId | null = null;

  const players = new Map<string, CharacterView>();
  const customers = new Map<number, CharacterView>();
  const staffViews = new Map<string, CharacterView>();
  const pickRing = createPickRing(scene);
  const shipperView = createShipperView(scene);
  const adDecor = createAdDecor(scene);
  const lastPos = new Map<string, { x: number; z: number }>();
  let latest: Snapshot | null = null;
  let cameraSnapped = false;

  /** Dựng cảnh của quán mới (lúc vào game, khi đi sang quán khác): bỏ hết mô hình của quán cũ. */
  function enterShop(id: ShopId) {
    shopId = id;
    if (backdrop) disposeTree(backdrop);
    for (const v of stationViews.values()) disposeTree(v.group);
    for (const v of tileViews.values()) disposeTree(v.group);
    for (const v of [...players.values(), ...customers.values(), ...staffViews.values()]) v.dispose();
    players.clear();
    customers.clear();
    staffViews.clear();
    lastPos.clear();
    const layout = SHOPS[id];
    backdrop = createShopBackdrop(id);
    scene.add(backdrop);
    stationViews = new Map(layout.stations.map((p) => [p.instanceId, createStationView(p)]));
    tileViews = new Map(layout.stations.map((p) => [p.instanceId, createTileView(p)]));
    for (const v of stationViews.values()) scene.add(v.group);
    for (const v of tileViews.values()) scene.add(v.group);
    shipperView.update(null, 0);
    interp.clear();
    predictor.reset(id);
    cameraSnapped = false;
  }

  conn.onSnapshot((s) => {
    if (s.shopId !== shopId) enterShop(s.shopId);
    latest = s;
    interp.push(s, performance.now());
    const me = s.players.find((p) => p.id === conn.playerId);
    if (me) predictor.reconcile(me);
  });

  const solid = (id: string) => latest?.stations.find((st) => st.instanceId === id)?.unlocked ?? false;

  let lastSent = { mx: 0, mz: 0 };
  let menuOpen = false;
  let menuChanged = false;
  let sendTimer = 0;
  let prev = performance.now();

  function frame(now: number) {
    // Hẹn khung hình sau trước: một lỗi vẽ (dữ liệu lạ) không được làm đứng cả màn hình.
    requestAnimationFrame(frame);
    try {
      drawFrame(now);
    } catch (err) {
      console.error('[game] lỗi khi vẽ khung hình', err);
    }
  }

  function drawFrame(now: number) {
    const dt = Math.min(0.1, (now - prev) / 1000);
    prev = now;
    const t = now / 1000;

    const local = pointer.joystick() ?? input.read();
    sendTimer -= dt;
    if (local.mx !== lastSent.mx || local.mz !== lastSent.mz || menuChanged || sendTimer <= 0) {
      conn.sendInput(local.mx, local.mz, menuOpen);
      menuChanged = false;
      lastSent = local;
      sendTimer = 0.1;
    }
    // Tốc độ thật của mình (đã nâng cấp) để dự đoán khớp với máy chủ.
    const meNow = latest?.players.find((p) => p.id === conn.playerId);
    const mySpeed = BALANCE.PLAYER_SPEED * (1 + BALANCE.PLAYER_SPEED_STEP * (meNow?.speedLevel ?? 0));
    const myPose = predictor.ready() ? predictor.step(local, dt, solid, mySpeed) : null;
    const iAmWalking = Math.hypot(local.mx, local.mz) > BALANCE.STILL_INPUT;

    const s = interp.sample(now);
    if (s) {
      for (const st of s.stations) stationViews.get(st.instanceId)?.update(st);
      const tiles = new Map(s.tiles.map((x) => [x.instanceId, x]));
      for (const [id, v] of tileViews) v.update(tiles.get(id));

      const seen = new Set<string>();
      for (const p of s.players) {
        if (!p.online || p.location !== s.shopId) continue;
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
        // Nhân vật của mình: "đang đi" theo phím bấm (không theo độ lệch vị trí, tránh nhún khi đang khớp vị trí).
        const moving = isMe ? iAmWalking : !!prevPos && Math.hypot(pose.x - prevPos.x, pose.z - prevPos.z) > 0.01;
        lastPos.set(p.id, { x: pose.x, z: pose.z });
        v.setPose(pose.x, pose.z, pose.dir, moving, t);
        v.setCarry(p.carry, p.cap);
        v.setName(p.name);
        if (p.outfit) v.setOutfit(p.outfit);
      }
      for (const [id, v] of players) if (!seen.has(id)) (v.dispose(), players.delete(id));

      const seenC = new Set<number>();
      for (const c of s.customers) {
        seenC.add(c.id);
        let v = customers.get(c.id);
        if (!v) {
          v = createCharacter([0x3d7dd8, 0xd8573d, 0x5aa34a, 0x9b59b6, 0xe0a020, 0x2aa3a3][c.id % 6], { look: 'customer', variant: c.id });
          customers.set(c.id, v);
          scene.add(v.group);
        }
        const key = `c${c.id}`;
        const prevPos = lastPos.get(key);
        const moving = !!prevPos && Math.hypot(c.x - prevPos.x, c.z - prevPos.z) > 0.002;
        lastPos.set(key, { x: c.x, z: c.z });
        v.setSitting(c.sitting);
        v.setPose(c.x, c.z, c.dir, moving && !c.sitting, t);
        v.setCarry(c.holding);
      }
      for (const [id, v] of customers) if (!seenC.has(id)) (v.dispose(), customers.delete(id), lastPos.delete(`c${id}`));

      // Nhân viên
      const seenS = new Set<string>();
      for (const st of s.staff) {
        seenS.add(st.id);
        let v = staffViews.get(st.id);
        if (!v) {
          v = createCharacter(0x7a8b99, { look: 'staff', name: staffLabel(st) });
          staffViews.set(st.id, v);
          scene.add(v.group);
        }
        const key = `s${st.id}`;
        const prevPos = lastPos.get(key);
        const moving = !!prevPos && Math.hypot(st.x - prevPos.x, st.z - prevPos.z) > 0.002;
        lastPos.set(key, { x: st.x, z: st.z });
        v.setPose(st.x, st.z, st.dir, moving, t);
        v.setCarry(st.carry, BALANCE.STAFF_LEVELS[st.level - 1]?.carry ?? BALANCE.STAFF_LEVELS[0].carry);
      }
      for (const [id, v] of staffViews) if (!seenS.has(id)) (v.dispose(), staffViews.delete(id), lastPos.delete(`s${id}`));

      shipperView.update(latest?.online.shipper ?? null, dt);
      if (shopId) adDecor.update(shopId, latest?.ads, dt);

      // Vòng tiến trình nhặt món của chính mình
      const meSnap = latest?.players.find((p) => p.id === conn.playerId);
      const mePose = myPose ?? meSnap;
      pickRing.update(meSnap?.pickAt && mePose ? meSnap.pick : 0, mePose?.x ?? 0, mePose?.z ?? 0);

      const focus = myPose ?? s.players.find((p) => p.id === conn.playerId);
      if (focus) {
        // Đang xem chỗ khác mà nhân vật bắt đầu đi → khung nhìn tự quay về nhân vật.
        if (iAmWalking && cam.isPanned()) cam.recenter(dt);
        if (!cameraSnapped) {
          cam.snap(focus.x, focus.z);
          cameraSnapped = true;
        }
        cam.follow(focus.x, focus.z, dt);
      }
    }
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  const v = new THREE.Vector3();
  return {
    setInputBlocked(reason, blocked) {
      gate.set(reason, blocked);
      const on = !gate.blocked();
      input.setEnabled(on);
      pointer.setEnabled(on);
      menuOpen = !on;
      menuChanged = true;
    },
    project(x, y, z) {
      v.set(x, y, z).project(camera);
      const r = renderer.domElement.getBoundingClientRect();
      return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
    },
  };
}
