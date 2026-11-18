import * as THREE from 'three';
import { ITEMS, SHOP_META, SHOP_TIERS, SHOPS, getStationDef, partyDef } from '@qnm/shared';
import type { ItemId, ShopId, Snapshot } from '@qnm/shared';
import { createItemMesh } from './items';
import { box, disposeLabel, disposeTree, glassMat, makeLabel, markSharedGeometry, mat } from './materials';

const TABLE_TOP = 0.75;
const plateGeo = new THREE.CylinderGeometry(0.17, 0.14, 0.03, 12);
const chopGeo = new THREE.BoxGeometry(0.012, 0.012, 0.26);
const cupGeo = new THREE.CylinderGeometry(0.05, 0.04, 0.13, 10);
const puffGeo = new THREE.SphereGeometry(1, 7, 5);
const dropGeo = new THREE.SphereGeometry(0.055, 7, 5);
const bulbGeo = new THREE.SphereGeometry(0.05, 6, 5);
const potGeo = new THREE.CylinderGeometry(0.22, 0.16, 0.36, 10);
const leafGeo = new THREE.IcosahedronGeometry(0.32, 0);
markSharedGeometry(plateGeo, chopGeo, cupGeo, puffGeo, dropGeo, bulbGeo, potGeo, leafGeo);

/** Món ăn bằng nước (tô) thì đựng tô và bốc khói nhiều; còn lại để đĩa. */
const SOUPS = new Set<ItemId>(['pho_bo']);
const DRINKS = new Set<ItemId>(['tra_da', 'ca_phe_phin', 'ca_phe_sua_da']);
const isSoup = (item: ItemId) => SOUPS.has(item);
const isDrink = (item: ItemId) => DRINKS.has(item);
/** Món đã có sẵn đĩa / tô trong mô hình. */
const SERVED = new Set<ItemId>(['com_tam_suon', 'com_tam_suon_cha', 'pho_bo']);

/** Ghế nhựa đỏ / xanh (quán cóc). */
function plasticStool(color: number): THREE.Group {
  const g = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.04, 10), mat(color));
  seat.position.y = 0.32;
  g.add(seat);
  for (const [x, z] of [[-0.11, -0.11], [0.11, -0.11], [-0.11, 0.11], [0.11, 0.11]]) {
    const leg = box(0.035, 0.32, 0.035, color);
    leg.position.set(x, 0.16, z);
    g.add(leg);
  }
  return g;
}

function plant(): THREE.Group {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(potGeo, mat(0xb5562f));
  pot.position.y = 0.18;
  const leaves = new THREE.Mesh(leafGeo, mat(0x3f8f3a));
  leaves.position.y = 0.6;
  leaves.scale.set(1, 1.3, 1);
  const top = new THREE.Mesh(leafGeo, mat(0x4fa34a));
  top.position.y = 0.95;
  top.scale.setScalar(0.65);
  g.add(pot, leaves, top);
  return g;
}

/** Quạt cây: chân tròn, cột, lồng quạt quay qua quay lại, cánh quay. */
function fan(): THREE.Group {
  const g = new THREE.Group();
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.05, 12), mat(0x2f6db5));
  foot.position.y = 0.025;
  const pole = box(0.05, 1.1, 0.05, 0xdedede);
  pole.position.y = 0.6;
  const head = new THREE.Group();
  head.name = 'fanHead';
  head.position.y = 1.2;
  const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.16, 10), mat(0x2f6db5));
  motor.rotation.x = Math.PI / 2;
  motor.position.z = -0.08;
  const cage = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.015, 6, 20), mat(0xdedede));
  cage.position.z = 0.04;
  const blades = new THREE.Group();
  blades.name = 'blades';
  blades.position.z = 0.03;
  for (let i = 0; i < 3; i++) {
    const bl = box(0.1, 0.22, 0.01, 0x7fc8ff);
    bl.position.y = 0.12;
    const arm = new THREE.Group();
    arm.rotation.z = (i * Math.PI * 2) / 3;
    arm.add(bl);
    blades.add(arm);
  }
  head.add(motor, cage, blades);
  g.add(foot, pole, head);
  return g;
}

function wallClock(): THREE.Group {
  const g = new THREE.Group();
  const face = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 16), mat(0xfff8e6));
  face.rotation.x = Math.PI / 2;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.025, 6, 16), mat(0x5b3a1e));
  const hand1 = box(0.02, 0.14, 0.01, 0x2b2118);
  hand1.position.set(0, 0.06, 0.03);
  const hand2 = box(0.1, 0.02, 0.01, 0x2b2118);
  hand2.position.set(0.04, 0, 0.03);
  g.add(face, rim, hand1, hand2);
  return g;
}

function frame(color: number, w: number, h: number): THREE.Group {
  const g = new THREE.Group();
  const border = box(w, h, 0.04, 0x8a6d3b);
  const art = box(w - 0.1, h - 0.1, 0.02, color);
  art.position.z = 0.02;
  const sun = new THREE.Mesh(new THREE.CircleGeometry(0.07, 10), mat(0xf2c14e));
  sun.position.set(w * 0.2, h * 0.15, 0.035);
  const hill = box(w - 0.14, h * 0.3, 0.02, 0x3f8f3a);
  hill.position.set(0, -h * 0.25, 0.031);
  g.add(border, art, sun, hill);
  return g;
}

/** Lẵng hoa khai trương (nhà hàng). */
function flowerStand(): THREE.Group {
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    const leg = box(0.04, 1.1, 0.04, 0x8a6d3b);
    leg.position.set(s * 0.18, 0.55, 0);
    leg.rotation.z = s * 0.15;
    g.add(leg);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.09, 6, 14), mat(0xff7ac8));
  ring.position.y = 1.45;
  const center = new THREE.Mesh(new THREE.CircleGeometry(0.3, 14), mat(0xfff3d6));
  center.position.set(0, 1.45, 0.02);
  g.add(ring, center);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const fl = new THREE.Mesh(bulbGeo, mat([0xd8261c, 0xf2c14e, 0xffffff][i % 3]));
    fl.scale.setScalar(1.6);
    fl.position.set(Math.cos(a) * 0.38, 1.45 + Math.sin(a) * 0.38, 0.08);
    g.add(fl);
  }
  const ribbon = box(0.12, 0.6, 0.01, 0xd8261c);
  ribbon.position.set(0, 0.95, 0.03);
  g.add(ribbon);
  return g;
}

/** Trang trí theo cấp quán: quán cóc (ghế nhựa) → khang trang (cây, quạt trần, đồng hồ) → nổi tiếng (tranh, đèn dây, bảng thực đơn) → nhà hàng (thảm đỏ, lẵng hoa, viền biển vàng). */
function buildTier(shopId: ShopId, tier: number): THREE.Group {
  const g = new THREE.Group();
  const b = SHOPS[shopId].bounds;
  const wallZ = b.minZ + 0.03;
  const t = SHOP_TIERS[tier];
  const plaque = makeLabel(`${t.icon} ${t.name}`, { bg: tier >= 3 ? '#b8860b' : tier >= 2 ? '#c8452c' : tier >= 1 ? '#2f6db5' : '#8a6d3b', size: 30, scale: 0.007 });
  plaque.position.set(3.7, 1.5, wallZ + 0.05);
  plaque.material.depthTest = true;
  g.add(plaque);

  if (tier === 0) {
    // Quán cóc: chồng ghế nhựa ở góc, tấm bìa viết tay.
    const corner = new THREE.Group();
    corner.position.set(b.minX + 0.45, 0, b.minZ + 0.5);
    for (let i = 0; i < 4; i++) {
      const st = plasticStool(i % 2 ? 0x2f6db5 : 0xd8261c);
      st.position.y = i * 0.07;
      corner.add(st);
    }
    g.add(corner);
    const card = makeLabel('Ngon - Rẻ - Sạch', { bg: '#d9b98a', color: '#5b3a1e', size: 26, scale: 0.006 });
    card.position.set(-2.9, 1.5, wallZ + 0.05);
    card.material.depthTest = true;
    g.add(card);
    return g;
  }
  // Khang trang trở lên.
  const clock = wallClock();
  clock.position.set(b.minX + 1.2, 1.85, wallZ + 0.03);
  g.add(clock);
  for (const [x, z] of [[b.minX + 0.45, b.maxZ - 0.45], [b.maxX - 0.45, b.minZ + 0.45]]) {
    const p = plant();
    p.position.set(x, 0, z);
    g.add(p);
  }
  const f = fan();
  f.position.set(b.minX + 0.45, 0, b.minZ + 0.45);
  f.rotation.y = Math.PI / 4;
  g.add(f);
  if (tier >= 2) {
    for (const [x, c] of [[-5.3, 0x9fd3f0], [5.3, 0xf5c6a5]] as const) {
      const fr = frame(c, 0.75, 0.55);
      fr.position.set(x, 1.65, wallZ + 0.03);
      g.add(fr);
    }
    const menu = box(1.1, 0.7, 0.04, 0x2b3a2b);
    menu.position.set(-2.9, 1.55, wallZ + 0.02);
    g.add(menu);
    const menuText = makeLabel('THỰC ĐƠN', { color: '#fff3d6', size: 26, scale: 0.006 });
    menuText.position.set(-2.9, 1.75, wallZ + 0.06);
    menuText.material.depthTest = true;
    g.add(menuText);
    for (let i = 0; i < 3; i++) {
      const line = box(0.75, 0.03, 0.01, 0xfff3d6);
      line.position.set(-2.9, 1.58 - i * 0.12, wallZ + 0.05);
      g.add(line);
    }
    // Dây đèn bóng tròn chạy dọc tường sau.
    const n = 22;
    for (let i = 0; i < n; i++) {
      const x = b.minX + 0.4 + (i * (b.maxX - b.minX - 0.8)) / (n - 1);
      const bulb = new THREE.Mesh(bulbGeo, mat([0xffd76a, 0xff8a5a, 0xfff3d6][i % 3], 0xffb030));
      bulb.position.set(x, 2.08 - Math.abs(Math.sin((i / (n - 1)) * Math.PI * 4)) * 0.1, wallZ + 0.12);
      g.add(bulb);
    }
  }
  if (tier >= 3) {
    // Thảm đỏ từ lối vào, hai lẵng hoa, viền vàng quanh biển hiệu.
    const ent = SHOPS[shopId].entrance;
    const carpet = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 3.2), mat(0xb3202a));
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.set(ent.x, 0.012, ent.z + 0.6);
    g.add(carpet);
    for (const s of [-1, 1]) {
      const fs = flowerStand();
      fs.position.set(ent.x + s * 1.1, 0, ent.z + 1.4);
      g.add(fs);
    }
    for (const [w, h, x, y] of [[4.2, 0.08, 0, 1.94], [4.2, 0.08, 0, 1.06], [0.08, 0.96, -2.06, 1.5], [0.08, 0.96, 2.06, 1.5]]) {
      const trim = box(w, h, 0.04, 0xd4a017, 0x806000);
      trim.position.set(x, y, wallZ + 0.01);
      g.add(trim);
    }
  }
  return g;
}

/** Bàn tiệc ngoài lề phải cạnh điểm giao: hộp món chất dần, băng rôn tên tiệc + tiến độ. */
function buildPartyTable(): { group: THREE.Group; boxes: THREE.Group } {
  const g = new THREE.Group();
  const top = box(1.5, 0.06, 0.7, 0xffffff);
  top.position.y = 0.75;
  const cloth = box(1.52, 0.4, 0.72, 0xd94f8a);
  cloth.position.y = 0.52;
  g.add(top, cloth);
  for (const [x, z] of [[-0.68, -0.3], [0.68, -0.3], [-0.68, 0.3], [0.68, 0.3]]) {
    const leg = box(0.05, 0.75, 0.05, 0x8a6d3b);
    leg.position.set(x, 0.375, z);
    g.add(leg);
  }
  for (const s of [-1, 1]) {
    const pole = box(0.05, 1.7, 0.05, 0x8a6d3b);
    pole.position.set(s * 0.75, 0.85, -0.38);
    g.add(pole);
    const bal = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), mat(s < 0 ? 0xff7ac8 : 0x2f6db5));
    bal.scale.y = 1.2;
    bal.position.set(s * 0.75, 1.85, -0.38);
    g.add(bal);
  }
  const boxes = new THREE.Group();
  boxes.position.y = 0.78;
  g.add(boxes);
  return { group: g, boxes };
}

/**
 * Phần "quán có hồn" trong cảnh 3D: trang trí theo cấp quán, bàn đơn tiệc,
 * khách ngồi ăn (món trên bàn, khói, ăn vơi dần), nhân viên mệt (mồ hôi) / hăng hái (ly trà đá).
 */
export function createLifeDecor(scene: THREE.Scene) {
  let tierGroup: THREE.Group | null = null;
  let tierKey = '';
  let party: { group: THREE.Group; boxes: THREE.Group; label: THREE.Sprite | null; key: string } | null = null;
  const meals = new Map<number, { group: THREE.Group; food: THREE.Group; key: string; steamAcc: number }>();
  const puffs: { mesh: THREE.Mesh; life: number }[] = [];
  const staffFx = new Map<string, { sweat: THREE.Group; cup: THREE.Group }>();

  function clearParty() {
    if (!party) return;
    if (party.label) disposeLabel(party.label);
    disposeTree(party.group);
    party = null;
  }

  function puff(x: number, y: number, z: number) {
    const m = new THREE.Mesh(puffGeo, new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false }));
    m.scale.setScalar(0.035);
    m.position.set(x + (Math.random() - 0.5) * 0.1, y, z + (Math.random() - 0.5) * 0.08);
    scene.add(m);
    puffs.push({ mesh: m, life: 0 });
  }

  return {
    /** Cấp quán + bàn tiệc (gọi mỗi khung hình với ảnh chụp mới nhất). */
    update(s: Snapshot, dt: number, t: number) {
      const isShop = SHOP_META[s.shopId].kind === 'shop';
      const tier = isShop ? (s.life?.tier ?? 0) : -1;
      const k = `${s.shopId}|${tier}`;
      if (k !== tierKey) {
        tierKey = k;
        if (tierGroup) disposeTree(tierGroup);
        tierGroup = tier >= 0 ? buildTier(s.shopId, tier) : null;
        if (tierGroup) scene.add(tierGroup);
      }
      tierGroup?.traverse((o) => {
        if (o.name === 'blades') o.rotation.z = t * 12;
        else if (o.name === 'fanHead') o.rotation.y = Math.sin(t * 0.6) * 0.7;
      });

      // Bàn tiệc: có đơn đang làm ở quán này.
      const p = s.life?.party;
      const show = p && p.shopId === s.shopId && (p.state === 'active' || (p.state === 'done' && s.secOfDay <= (p.endSec ?? 0) + 20));
      if (!show) clearParty();
      else {
        const pickup = SHOPS[s.shopId].stations.find((x) => getStationDef(x.def).kind === 'pickup');
        if (pickup && !party) {
          const pt = buildPartyTable();
          const b = SHOPS[s.shopId].bounds;
          pt.group.position.set(b.maxX + 1.3, 0, pickup.z - 1.6);
          pt.group.rotation.y = -Math.PI / 2;
          scene.add(pt.group);
          party = { ...pt, label: null, key: '' };
        }
        if (party) {
          const key = `${p.delivered}/${p.qty}|${p.state}`;
          if (key !== party.key) {
            party.key = key;
            const d = partyDef(p.kind);
            if (party.label) {
              party.label.removeFromParent();
              disposeLabel(party.label);
            }
            party.label = makeLabel(p.state === 'done' ? `${d.icon} ${d.name} — đủ rồi! 🎉` : `${d.icon} ${d.name}: ${p.delivered}/${p.qty} ${ITEMS[p.item].name}`, {
              bg: p.state === 'done' ? '#1f8a3a' : '#b8327a', size: 30, scale: 0.0065,
            });
            party.label.position.set(0, 2.35, 0);
            party.group.add(party.label);
            // Chồng hộp món: mỗi hộp là một món đã giao (tối đa 3 tầng × 8).
            party.boxes.clear();
            for (let i = 0; i < p.delivered; i++) {
              const bx = box(0.16, 0.1, 0.16, i % 2 ? 0xfff3d6 : 0xf2e2c0);
              bx.position.set(-0.6 + (i % 8) * 0.17, 0.05 + Math.floor(i / 8) * 0.105, ((Math.floor(i / 8) % 2) - 0.5) * 0.12);
              party.boxes.add(bx);
            }
          }
          party.label?.position.setY(2.35 + Math.sin(t * 3) * 0.04);
        }
      }

      // Hơi bốc từ món đang ăn.
      for (let i = puffs.length - 1; i >= 0; i--) {
        const pf = puffs[i];
        pf.life += dt;
        pf.mesh.position.y += dt * 0.35;
        pf.mesh.scale.setScalar(0.035 + pf.life * 0.06);
        (pf.mesh.material as THREE.MeshLambertMaterial).opacity = 0.5 * (1 - pf.life / 1.4);
        if (pf.life >= 1.4) {
          pf.mesh.removeFromParent();
          (pf.mesh.material as THREE.Material).dispose();
          puffs.splice(i, 1);
        }
      }
    },

    /** Khách ngồi ăn: bày món lên bàn trước mặt, ăn vơi dần, tô nóng bốc khói. */
    meal(id: number, items: ItemId[], x: number, z: number, eat: number, dt: number) {
      let m = meals.get(id);
      const key = items.join(',');
      if (!m || m.key !== key) {
        if (m) disposeTree(m.group);
        const group = new THREE.Group();
        const food = new THREE.Group();
        const foods = items.filter((it) => !isDrink(it));
        const drinks = items.filter((it) => isDrink(it));
        foods.forEach((it, i) => {
          const dish = new THREE.Group();
          dish.position.set((i - (foods.length - 1) / 2) * 0.3, 0, 0);
          const soup = isSoup(it);
          // Cơm tấm, phở đã có sẵn đĩa/tô; bánh mì, thịt nướng thì bày lên đĩa.
          if (!SERVED.has(it)) {
            const base = new THREE.Mesh(plateGeo, mat(0xf4f1ea));
            base.position.y = 0.015;
            dish.add(base);
          }
          const meal = createItemMesh(it);
          meal.position.y = SERVED.has(it) ? 0 : 0.03;
          meal.userData.soup = soup;
          food.add(meal);
          meal.position.x = dish.position.x;
          group.add(dish);
        });
        drinks.forEach((it, i) => {
          const d = createItemMesh(it);
          d.scale.setScalar(0.75);
          d.position.set(0.3 + i * 0.14, 0, -0.08);
          group.add(d);
        });
        // Đôi đũa gác bên phải.
        for (const dx of [0, 0.03]) {
          const c = new THREE.Mesh(chopGeo, mat(0xc49a6c));
          c.position.set(0.2 + dx, 0.03, 0.02);
          c.rotation.y = 0.25;
          group.add(c);
        }
        group.add(food);
        scene.add(group);
        m = { group, food, key, steamAcc: 0 };
        meals.set(id, m);
      }
      m.group.position.set(x, TABLE_TOP + 0.03, z + 0.49);
      // Ăn vơi dần (còn lại chút xíu thì xong).
      // Ăn vơi dần: món thấp xuống (nước dùng cạn, cơm vơi), bánh mì ngắn lại.
      const left = Math.max(0.25, 1 - eat * 0.8);
      m.food.children.forEach((c) => c.scale.set(1, left, c.userData.soup ? 1 : 0.4 + left * 0.6));
      const soupy = m.food.children.some((c) => c.userData.soup);
      m.steamAcc += dt * (soupy ? 3 : 1) * (1 - eat);
      while (m.steamAcc >= 1) {
        m.steamAcc -= 1;
        puff(x, TABLE_TOP + 0.18, z + 0.49);
      }
    },
    /** Bỏ món của khách không còn ngồi ăn. */
    keepMeals(alive: Set<number>) {
      for (const [id, m] of meals)
        if (!alive.has(id)) {
          disposeTree(m.group);
          meals.delete(id);
        }
    },

    /** Nhân viên mệt: giọt mồ hôi bay ra; vừa uống trà đá: cầm ly trà đá. */
    staff(id: string, holder: THREE.Group, energy: number, cheer: boolean, dir: number, t: number) {
      let fx = staffFx.get(id);
      if (!fx || fx.sweat.parent !== holder) {
        const sweat = new THREE.Group();
        for (let i = 0; i < 3; i++) {
          const d = new THREE.Mesh(dropGeo, mat(0x7fc8ff, 0x3a8ad0));
          d.scale.y = 1.4;
          sweat.add(d);
        }
        const cup = new THREE.Group();
        const glass = new THREE.Mesh(cupGeo, glassMat(0xc98a4a, 0.75));
        const straw = box(0.015, 0.16, 0.015, 0xd8261c);
        straw.position.set(0.015, 0.1, 0);
        cup.add(glass, straw);
        holder.add(sweat, cup);
        fx = { sweat, cup };
        staffFx.set(id, fx);
      }
      fx.sweat.visible = !cheer && energy < 35;
      if (fx.sweat.visible)
        fx.sweat.children.forEach((d, i) => {
          const k = (t * 1.3 + i / 3) % 1;
          const side = i % 2 ? 1 : -1;
          d.position.set(side * (0.18 + k * 0.15), 1.5 + k * 0.12 - k * k * 0.3, 0.05);
          d.visible = k < 0.85;
        });
      fx.cup.visible = cheer;
      if (cheer) fx.cup.position.set(Math.sin(dir + 0.6) * 0.3, 0.92 + Math.sin(t * 2) * 0.02, Math.cos(dir + 0.6) * 0.3);
    },
    forgetStaff(alive: Set<string>) {
      for (const id of [...staffFx.keys()]) if (!alive.has(id)) staffFx.delete(id);
    },
  };
}
