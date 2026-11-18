import * as THREE from 'three';
import { SHELF_ROW_Z, SHOP_META, SHOPS, getStationDef } from '@qnm/shared';
import type { CampaignId, Outfit, ShopId, Snapshot } from '@qnm/shared';
import { KOL_VISIT, REVIEW_VISIT, visitPhase } from '../game/promoSchedule';
import type { VisitWindow } from '../game/promoSchedule';
import { createCharacter } from './characters';
import type { CharacterView } from './characters';
import { createItemMesh } from './items';
import { box, disposeLabel, disposeTree, makeLabel, mat } from './materials';

type Pt = { x: number; z: number };

/** Một nhân vật quảng cáo (KOL, người review…) kèm đồ cầm tay xoay theo người. */
interface Actor {
  view: CharacterView;
  props: THREE.Group;
  /** Đặt vị trí mỗi khung hình; trả về false = ẩn. */
  place(s: Snapshot, t: number): { x: number; z: number; dir: number; moving: boolean } | null;
}

const OUTFITS: Record<string, Outfit> = {
  kol: { hat: 'khong_mu', hair: 'toc_dai_vang', shirt: 'vay_vang', pants: 'quan_nau', apron: 'khong_tap_de' },
  review: { hat: 'mu_phot', hair: 'toc_ngan_den', shirt: 'ao_trang', pants: 'quan_den', apron: 'khong_tap_de' },
  press: { hat: 'khong_mu', hair: 'toc_bui', shirt: 'ao_den', pants: 'quan_jean', apron: 'khong_tap_de' },
  host: { hat: 'khong_mu', hair: 'toc_duoi_ngua', shirt: 'so_mi_xanh', pants: 'chan_vay_den', apron: 'khong_tap_de' },
  flyer: { hat: 'mu_luoi_trai_do', hair: 'toc_ngan_nau', shirt: 'ao_vang', pants: 'quan_short_kaki', apron: 'khong_tap_de' },
  rider: { hat: 'mu_bao_hiem_vang', hair: 'toc_ngan_den', shirt: 'ao_do', pants: 'quan_jean', apron: 'khong_tap_de' },
};

function actorView(kind: keyof typeof OUTFITS, name: string): CharacterView {
  const v = createCharacter(0xff4fa3, { look: 'player', name });
  v.setOutfit(OUTFITS[kind]);
  return v;
}

/** Đi từ cửa vào chỗ làm việc, đứng làm việc, rồi ra cửa theo lịch trong ngày. */
function visitPlace(w: VisitWindow, from: Pt, spot: Pt, workDir: number) {
  return (s: Snapshot) => {
    const ph = visitPhase(w, s.secOfDay);
    if (!ph) return null;
    if (ph.state === 'work') return { ...spot, dir: workDir, moving: false };
    const [a, b] = ph.state === 'enter' ? [from, spot] : [spot, from];
    const k = Math.min(1, Math.max(0, ph.k));
    return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, dir: Math.atan2(b.x - a.x, b.z - a.z), moving: true };
  };
}

/** Món đầu tiên quán bày bán (đặt lên khay mời ăn thử). */
function firstItem(shopId: ShopId) {
  for (const p of SHOPS[shopId].stations) {
    const d = getStationDef(p.def);
    if (d.kind === 'display') return d.item;
  }
  return null;
}

function banner(text: string, w: number, h: number, bg: string, fg: string): THREE.Mesh {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = Math.round((1024 * h) / w);
  const g = c.getContext('2d');
  if (g) {
    g.fillStyle = bg;
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = fg;
    g.font = `800 ${Math.round(c.height * 0.55)}px system-ui, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, c.width / 2, c.height / 2 + 4, c.width - 30);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
}

/**
 * Hình ảnh quảng cáo ngắn ngày đang chạy ở quán đang xem:
 * KOL quay video, người review / phóng viên ăn thử, livestream, xe loa chạy ngoài đường, băng rôn,
 * bàn mời ăn thử, người phát tờ rơi, biểu tượng mạng xã hội bay lên, biển "HOT" trên app.
 * Hết chiến dịch là biến mất.
 */
export function createPromoDecor(scene: THREE.Scene) {
  let key = '';
  let statics: THREE.Group | null = null;
  let actors: Actor[] = [];
  let anims: ((t: number, dt: number) => void)[] = [];
  let sprites: THREE.Sprite[] = [];

  function clear() {
    if (statics) disposeTree(statics);
    statics = null;
    for (const a of actors) {
      a.view.dispose();
      disposeTree(a.props);
    }
    actors = [];
    for (const sp of sprites) {
      sp.removeFromParent();
      disposeLabel(sp);
    }
    sprites = [];
    anims = [];
  }

  function label(text: string, bg: string, scale = 0.007): THREE.Sprite {
    const sp = makeLabel(text, { bg, size: 34, scale });
    sprites.push(sp);
    return sp;
  }

  function build(shopId: ShopId, active: Set<CampaignId>) {
    clear();
    const L = SHOPS[shopId];
    const b = L.bounds;
    const custZ = SHELF_ROW_Z + 1.2;
    const g = new THREE.Group();
    statics = g;
    scene.add(g);
    const cashier = L.stations.find((p) => getStationDef(p.def).kind === 'cashier');
    const pickup = L.stations.find((p) => getStationDef(p.def).kind === 'pickup');

    // 🌟 KOL: đi vào, đứng trước quầy cầm gậy tự sướng quay video.
    if (active.has('kol')) {
      const view = actorView('kol', '🌟 KOL Bé Na đang quay');
      scene.add(view.group);
      const props = new THREE.Group();
      props.add(box(0.26, 0.06, 0.03, 0x111111)); // kính râm
      props.children[0].position.set(0, 1.0, 0.2);
      const stick = box(0.025, 0.85, 0.025, 0x222222);
      stick.position.set(0.22, 1.0, 0.35);
      stick.rotation.x = 0.7;
      const phone = box(0.09, 0.16, 0.015, 0x1f1f1f);
      phone.position.set(0.22, 1.32, 0.66);
      phone.rotation.x = -0.3;
      const screen = box(0.075, 0.13, 0.005, 0xbfe3ff, 0x6ab0ff);
      screen.position.set(0.22, 1.32, 0.655);
      screen.rotation.x = -0.3;
      props.add(stick, phone, screen);
      scene.add(props);
      actors.push({ view, props, place: visitPlace(KOL_VISIT, L.entrance, { x: -0.5, z: custZ + 1.6 }, 0) });
    }

    // ⭐ Người review / 📰 phóng viên: đứng ăn thử trước kệ.
    if (active.has('review')) {
      const view = actorView('review', '😋 Ngon quá! · Reviewer');
      scene.add(view.group);
      const props = new THREE.Group();
      const note = box(0.14, 0.18, 0.02, 0xf4f1ea);
      note.position.set(-0.22, 0.6, 0.25);
      props.add(note);
      scene.add(props);
      actors.push({ view, props, place: visitPlace(REVIEW_VISIT, L.entrance, { x: -3.75, z: custZ + 1.1 }, 0) });
    }
    if (active.has('bao_chi')) {
      const view = actorView('press', '📰 Phóng viên ẩm thực');
      scene.add(view.group);
      const props = new THREE.Group();
      const cam = box(0.2, 0.14, 0.12, 0x1f1f1f);
      cam.position.set(0, 1.0, 0.32);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 10), mat(0x444444));
      lens.rotation.x = Math.PI / 2;
      lens.position.set(0, 1.0, 0.42);
      props.add(cam, lens);
      scene.add(props);
      actors.push({ view, props, place: visitPlace(REVIEW_VISIT, L.entrance, { x: -6.0, z: custZ + 1.4 }, 0.4) });
    }

    // 🎥 Livestream: người dẫn đứng cạnh điện thoại trên chân máy + đèn vòng, chữ LIVE nhấp nháy.
    if (active.has('livestream')) {
      const spot = { x: 3.5, z: custZ + 1.6 };
      const tri = new THREE.Group();
      tri.position.set(spot.x + 0.8, 0, spot.z + 0.2);
      for (let i = 0; i < 3; i++) {
        const leg = box(0.03, 1.3, 0.03, 0x2b2b2b);
        const a = (i / 3) * Math.PI * 2;
        leg.position.set(Math.sin(a) * 0.15, 0.62, Math.cos(a) * 0.15);
        leg.rotation.set(Math.cos(a) * 0.2, 0, -Math.sin(a) * 0.2);
        tri.add(leg);
      }
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 8, 20), mat(0xffffff, 0xffffff));
      ring.position.y = 1.4;
      const ph = box(0.08, 0.15, 0.015, 0x1f1f1f);
      ph.position.y = 1.4;
      tri.add(ring, ph);
      tri.rotation.y = -0.6;
      g.add(tri);
      const live = label('🔴 LIVE', '#d8261c', 0.008);
      live.position.set(spot.x + 0.8, 1.95, spot.z + 0.2);
      scene.add(live);
      anims.push((t) => (live.visible = Math.floor(t * 2) % 2 === 0));
      const view = actorView('host', '🎥 Đang livestream');
      scene.add(view.group);
      const props = new THREE.Group();
      scene.add(props);
      actors.push({ view, props, place: () => ({ ...spot, dir: 0.7, moving: false }) });
    }

    // 📢 Xe loa chạy qua lại ngoài đường trước quán.
    if (active.has('xe_loa')) {
      const bike = new THREE.Group();
      const body = box(1.1, 0.3, 0.3, 0x2f6db5);
      body.position.y = 0.45;
      bike.add(body);
      for (const x of [-0.45, 0.45]) {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 12), mat(0x222222));
        w.rotation.x = Math.PI / 2;
        w.position.set(x, 0.22, 0);
        bike.add(w);
      }
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.4, 12, 1, true), mat(0xd0d4d8));
      horn.rotation.z = -Math.PI / 2;
      horn.position.set(-0.55, 1.15, 0);
      bike.add(horn);
      const sign = label('📢 Khuyến mãi lớn tại quán!', '#c8452c', 0.0065);
      sign.position.set(0, 2.0, 0);
      bike.add(sign);
      g.add(bike);
      const rider = actorView('rider', '');
      rider.setSitting(true);
      scene.add(rider.group);
      const props = new THREE.Group();
      scene.add(props);
      const span = b.maxX - b.minX + 10;
      const z = b.maxZ + 2.6;
      const xAt = (t: number) => b.minX - 5 + ((t * 2.4) % span);
      anims.push((t) => bike.position.set(xAt(t), 0, z));
      actors.push({ view: rider, props, place: (_s, t) => ({ x: xAt(t) - 0.1, z, dir: Math.PI / 2, moving: false }) });
    }

    // 🎌 Băng rôn khuyến mãi trên tường sau.
    if (active.has('bang_ron')) {
      const ban = banner('🎉 KHUYẾN MÃI · GIẢM GIÁ HÔM NAY 🎉', 4.2, 0.6, '#d8261c', '#ffe066');
      ban.position.set(b.minX + 4.2, 2.55, b.minZ + 0.06);
      g.add(ban);
      for (const dx of [-2.15, 2.15]) {
        const pole = box(0.06, 1.3, 0.06, 0x7a4e2a);
        pole.position.set(b.minX + 4.2 + dx, 2.2, b.minZ + 0.05);
        g.add(pole);
      }
    }

    // 🍽️ Bàn mời ăn thử ở vỉa hè trước quán.
    if (active.has('an_thu')) {
      const tbl = new THREE.Group();
      tbl.position.set(b.minX + 3.2, 0, b.maxZ + 1.0);
      const top = box(1.1, 0.06, 0.6, 0xf4f1ea);
      top.position.y = 0.78;
      const legs = box(1.0, 0.75, 0.5, 0xc98a4b);
      legs.position.y = 0.38;
      tbl.add(legs, top);
      const it = firstItem(shopId);
      if (it)
        for (let i = 0; i < 3; i++) {
          const m = createItemMesh(it);
          m.scale.setScalar(0.7);
          m.position.set(-0.32 + i * 0.32, 0.82, 0);
          tbl.add(m);
        }
      const sign = label('🍽️ Mời ăn thử miễn phí', '#1f8a3a', 0.0065);
      sign.position.set(0, 1.5, 0);
      tbl.add(sign);
      g.add(tbl);
    }

    // 📄 Người phát tờ rơi đứng ở vỉa hè, quay qua quay lại mời khách.
    if (active.has('to_roi')) {
      const spot = { x: b.minX + 6.5, z: b.maxZ + 1.5 };
      const view = actorView('flyer', '📄 Phát tờ rơi');
      scene.add(view.group);
      const props = new THREE.Group();
      const paper = box(0.18, 0.12, 0.13, 0xffffff);
      paper.position.set(0.25, 0.55, 0.2);
      props.add(paper);
      scene.add(props);
      actors.push({ view, props, place: (_s, t) => ({ ...spot, dir: Math.sin(t * 0.8) * 0.9, moving: false }) });
    }

    // 📱 Mạng xã hội: tim, like, sao bay lên từ quầy.
    if (active.has('mxh') && cashier) {
      const icons = ['❤️', '👍', '⭐', '❤️', '💬', '👍'];
      const pops = icons.map((ic) => {
        const sp = label(ic, 'rgba(255,255,255,0.85)', 0.006);
        scene.add(sp);
        return sp;
      });
      anims.push((t) => {
        pops.forEach((sp, i) => {
          const ph = (t * 0.35 + i / pops.length) % 1;
          sp.position.set(cashier.x - 2.5 + (i % 3) * 1.1 + Math.sin(t + i) * 0.2, 1.6 + ph * 1.8, cashier.z + 0.6);
          sp.material.opacity = 1 - ph;
        });
      });
    }

    // 🛵 Đẩy app: biển HOT trên điểm giao hàng (chưa mở thì trên quầy).
    if (active.has('app_top')) {
      const at = pickup ?? cashier;
      if (at) {
        const hot = label('🔥 HOT trên app', '#ff7a00', 0.0075);
        scene.add(hot);
        anims.push((t) => hot.position.set(at.x, 2.3 + Math.sin(t * 3) * 0.08, at.z));
      }
    }
  }

  return {
    update(s: Snapshot, dt: number, t: number) {
      if (SHOP_META[s.shopId].kind !== 'shop') {
        if (key) clear();
        key = '';
        return;
      }
      const ids = [...new Set(s.campaigns.map((c) => c.id))].sort();
      const k = `${s.shopId}|${ids.join(',')}`;
      if (k !== key) {
        key = k;
        build(s.shopId, new Set(ids));
      }
      for (const f of anims) f(t, dt);
      for (const a of actors) {
        const p = a.place(s, t);
        a.view.group.visible = !!p;
        a.props.visible = !!p;
        if (!p) continue;
        a.view.setPose(p.x, p.z, p.dir, p.moving, t);
        a.props.position.set(p.x, 0, p.z);
        a.props.rotation.y = p.dir;
      }
    },
    /** Gỡ hết hình quảng cáo (khi rời quán / tắt). */
    clear,
  };
}
