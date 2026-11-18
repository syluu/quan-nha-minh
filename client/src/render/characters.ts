import * as THREE from 'three';
import { COSTUMES, DEFAULT_OUTFIT } from '@qnm/shared';
import type { CostumeStyle, ItemId, Outfit } from '@qnm/shared';
import { carryBadge } from '../ui/hud';
import { ITEM_STACK_H, createItemMesh } from './items';
import { disposeLabel, makeLabel, mat } from './materials';

// Khối đơn vị dùng chung (co giãn theo từng bộ phận) — tạo một lần, không rò bộ nhớ khi khách đến/đi.
const BOX = new THREE.BoxGeometry(1, 1, 1);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 10);
const CONE_CYL = new THREE.CylinderGeometry(0.62, 1, 1, 12); // trên hẹp dưới loe: váy, thân áo
const SPHERE = new THREE.SphereGeometry(1, 12, 9);
const DOME = new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
const CONE = new THREE.ConeGeometry(1, 1, 14);
const shadowGeo = new THREE.CircleGeometry(0.34, 16);
const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false });

const SKIN = 0xf1c9a0;
const SHOE = 0x2b2420;

export type CharacterLook = 'player' | 'customer' | 'staff';

export interface CharacterView {
  group: THREE.Group;
  setPose(x: number, z: number, dir: number, moving: boolean, t: number): void;
  setCarry(items: ItemId[], cap?: number): void;
  /** Đổi chữ trên đầu (khi người chơi đổi tên). */
  setName(name: string): void;
  /** Ngồi trên ghế (khách ăn tại chỗ): co chân ngồi, quay mặt vào bàn. */
  setSitting(on: boolean): void;
  /** Đang ăn (ngồi bàn): tay phải gắp đưa lên miệng, tay trái đặt lên bàn. */
  setEating(on: boolean): void;
  /** Trang phục người chơi (mũ, tóc, áo/váy, quần/chân váy, tạp dề) — đổi cả kiểu dáng. */
  setOutfit(outfit: Outfit): void;
  /** Bong bóng trên đầu (cảm xúc khách, biểu cảm người chơi); null = ẩn. */
  setBubble(text: string | null): void;
  dispose(): void;
}

interface Piece {
  style: CostumeStyle;
  color: number;
}
interface BodySpec {
  hat: Piece | null;
  hair: Piece | null;
  top: Piece;
  bottom: Piece;
  apron: Piece | null;
  /** Mũ trắng + tạp dề của nhân viên quán. */
  staffCap?: boolean;
}

interface Rig {
  root: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
}

function part(parent: THREE.Object3D, geo: THREE.BufferGeometry, color: number, sx: number, sy: number, sz: number, x: number, y: number, z: number) {
  const m = new THREE.Mesh(geo, mat(color));
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

const HIP_Y = 0.34;
const SHOULDER_Y = 0.76;
const HEAD_Y = 0.98;

/** Dựng thân người theo bộ đồ: chân (đùi + cẳng + giày), thân, tay (bắp + cẳng + bàn tay), đầu, tóc, mũ, phụ kiện. */
function buildRig(spec: BodySpec): Rig {
  const root = new THREE.Group();
  const { top, bottom } = spec;
  const dress = top.style === 'vay_lien';
  const skirt = bottom.style === 'chan_vay' || dress;
  const longTop = top.style === 'ao_dai';

  // Chân: xoay quanh hông khi đi.
  const legs: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.09, HIP_Y, 0);
    const thigh = skirt ? SKIN : bottom.color;
    const shin = skirt || bottom.style === 'quan_short' ? SKIN : bottom.color;
    part(leg, CYL, thigh, 0.08, 0.17, 0.08, 0, -0.085, 0);
    part(leg, CYL, shin, 0.072, 0.15, 0.072, 0, -0.24, 0);
    if (bottom.style === 'quan_jean' && !skirt) part(leg, CYL, 0x6a8ab8, 0.078, 0.03, 0.078, 0, -0.3, 0); // gấu quần xắn
    part(leg, BOX, SHOE, 0.11, 0.06, 0.19, 0, -0.31, 0.03);
    root.add(leg);
    legs.push(leg);
  }
  // Hông (theo quần) — váy liền / chân váy thì là vạt váy loe.
  if (skirt) part(root, CONE_CYL, dress ? top.color : bottom.color, 0.25, 0.3, 0.22, 0, HIP_Y - 0.06, 0);
  else part(root, BOX, bottom.color, 0.32, 0.12, 0.22, 0, HIP_Y + 0.02, 0);

  // Thân áo.
  const torsoColor = top.color;
  part(root, CONE_CYL, torsoColor, 0.2, 0.44, 0.17, 0, 0.58, 0);
  if (top.style === 'ao_ba_lo') {
    // Áo ba lỗ: vai trần, viền cổ khoét sâu.
    part(root, BOX, SKIN, 0.14, 0.08, 0.02, 0, 0.75, 0.15);
  }
  if (top.style === 'so_mi') {
    // Sơ mi: cổ bẻ + hàng cúc.
    part(root, BOX, 0xffffff, 0.08, 0.05, 0.04, -0.05, 0.78, 0.13).rotation.z = 0.5;
    part(root, BOX, 0xffffff, 0.08, 0.05, 0.04, 0.05, 0.78, 0.13).rotation.z = -0.5;
    for (let i = 0; i < 3; i++) part(root, BOX, 0x8a8f96, 0.025, 0.025, 0.02, 0, 0.7 - i * 0.1, 0.17);
  }
  if (top.style === 'ao_khoac') {
    // Áo khoác có mũ: mũ trùm sau gáy, túi trước bụng, dây rút.
    part(root, SPHERE, torsoColor, 0.17, 0.12, 0.12, 0, 0.82, -0.13);
    part(root, BOX, torsoColor, 0.24, 0.1, 0.03, 0, 0.47, 0.18);
    for (const s of [-1, 1]) part(root, BOX, 0xf4f1ea, 0.012, 0.1, 0.012, s * 0.04, 0.72, 0.17);
  }
  if (longTop) {
    // Áo dài: cổ đứng + hai vạt dài trước/sau tới gần mắt cá.
    part(root, CYL, torsoColor, 0.09, 0.07, 0.09, 0, 0.82, 0);
    part(root, BOX, torsoColor, 0.3, 0.5, 0.025, 0, 0.12 + 0.25, 0.13);
    part(root, BOX, torsoColor, 0.3, 0.5, 0.025, 0, 0.12 + 0.25, -0.13);
  }

  // Tay: xoay quanh vai khi đi / bê đồ.
  const arms: THREE.Group[] = [];
  const longSleeve = top.style === 'so_mi' || top.style === 'ao_khoac' || longTop;
  const noSleeve = top.style === 'ao_ba_lo';
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.24, SHOULDER_Y, 0);
    part(arm, CYL, noSleeve ? SKIN : torsoColor, 0.055, 0.2, 0.055, 0, -0.1, 0);
    part(arm, CYL, longSleeve ? torsoColor : SKIN, 0.05, 0.18, 0.05, 0, -0.28, 0);
    part(arm, SPHERE, SKIN, 0.05, 0.05, 0.05, 0, -0.39, 0);
    root.add(arm);
    arms.push(arm);
  }

  // Đầu, mắt, má.
  part(root, CYL, SKIN, 0.07, 0.08, 0.07, 0, 0.82, 0);
  part(root, SPHERE, SKIN, 0.2, 0.2, 0.2, 0, HEAD_Y, 0);
  for (const s of [-1, 1]) {
    part(root, BOX, 0x2b2118, 0.04, 0.05, 0.02, s * 0.07, HEAD_Y + 0.02, 0.19);
    part(root, SPHERE, 0xf2a08a, 0.03, 0.02, 0.01, s * 0.11, HEAD_Y - 0.04, 0.17);
  }

  if (spec.hair) buildHair(root, spec.hair, !!spec.hat && spec.hat.style !== 'khong_mu');
  if (spec.hat) buildHat(root, spec.hat);
  if (spec.staffCap) {
    part(root, CYL, 0xffffff, 0.2, 0.16, 0.2, 0, HEAD_Y + 0.17, 0);
    part(root, BOX, 0xf4f1ea, 0.3, 0.36, 0.03, 0, 0.5, 0.18);
  }
  if (spec.apron) {
    const z = longTop || dress ? 0.24 : 0.19;
    part(root, BOX, spec.apron.style === 'tap_de_caro' ? 0xffffff : spec.apron.color, 0.3, 0.4, 0.025, 0, 0.48, z);
    part(root, BOX, spec.apron.style === 'tap_de_caro' ? 0xffffff : spec.apron.color, 0.2, 0.12, 0.025, 0, 0.72, z - 0.02);
    if (spec.apron.style === 'tap_de_caro') {
      for (let i = 0; i < 4; i++) part(root, BOX, spec.apron.color, 0.31, 0.035, 0.03, 0, 0.33 + i * 0.1, z + 0.005);
      for (let i = 0; i < 3; i++) part(root, BOX, spec.apron.color, 0.035, 0.4, 0.03, -0.1 + i * 0.1, 0.48, z + 0.005);
    }
  }
  return { root, legL: legs[0], legR: legs[1], armL: arms[0], armR: arms[1] };
}

/** Tóc: phần mái phủ đầu + kiểu riêng (dài, đuôi ngựa, búi, bím, xoăn). Đội mũ thì bỏ bớt phần đỉnh. */
function buildHair(root: THREE.Group, h: Piece, underHat: boolean) {
  const c = h.color;
  if (h.style === 'toc_xoan') {
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      part(root, SPHERE, c, 0.09, 0.09, 0.09, Math.sin(a) * 0.15, HEAD_Y + 0.12 + (i % 2) * 0.03, Math.cos(a) * 0.13 - 0.04);
    }
    if (!underHat) part(root, SPHERE, c, 0.13, 0.1, 0.13, 0, HEAD_Y + 0.17, -0.02);
    return;
  }
  // Mái tóc phủ đỉnh + sau gáy.
  part(root, DOME, c, 0.222, underHat ? 0.16 : 0.225, 0.222, 0, HEAD_Y - 0.005, -0.012);
  part(root, SPHERE, c, 0.2, 0.17, 0.12, 0, HEAD_Y - 0.02, -0.09);
  if (h.style === 'toc_dai') part(root, BOX, c, 0.36, 0.4, 0.08, 0, HEAD_Y - 0.22, -0.13);
  if (h.style === 'toc_duoi_ngua') {
    part(root, SPHERE, c, 0.05, 0.05, 0.05, 0, HEAD_Y + 0.04, -0.21);
    part(root, CYL, c, 0.045, 0.28, 0.045, 0, HEAD_Y - 0.13, -0.25).rotation.x = 0.25;
  }
  if (h.style === 'toc_bui') part(root, SPHERE, c, 0.1, 0.09, 0.1, 0, HEAD_Y + 0.17, -0.12);
  if (h.style === 'toc_hai_bim')
    for (const s of [-1, 1]) {
      part(root, CYL, c, 0.04, 0.3, 0.04, s * 0.17, HEAD_Y - 0.2, 0.02);
      part(root, SPHERE, 0xd23b2a, 0.03, 0.03, 0.03, s * 0.17, HEAD_Y - 0.36, 0.02);
    }
}

function buildHat(root: THREE.Group, hat: Piece) {
  const c = hat.color;
  const y = HEAD_Y;
  switch (hat.style) {
    case 'khong_mu':
      return;
    case 'mu_luoi_trai':
      part(root, DOME, c, 0.215, 0.15, 0.215, 0, y + 0.07, 0);
      part(root, BOX, c, 0.26, 0.025, 0.18, 0, y + 0.08, 0.2);
      return;
    case 'mu_bao_hiem':
      part(root, DOME, c, 0.25, 0.22, 0.25, 0, y + 0.05, 0);
      part(root, BOX, 0x333333, 0.3, 0.06, 0.02, 0, y + 0.06, 0.23);
      return;
    case 'mu_dau_bep':
      part(root, CYL, c, 0.19, 0.3, 0.19, 0, y + 0.27, 0);
      part(root, SPHERE, c, 0.24, 0.14, 0.24, 0, y + 0.45, 0);
      return;
    case 'mu_phot':
      part(root, CYL, c, 0.36, 0.03, 0.36, 0, y + 0.15, 0);
      part(root, CYL, c, 0.18, 0.2, 0.18, 0, y + 0.26, 0);
      part(root, CYL, 0x1f1f1f, 0.185, 0.04, 0.185, 0, y + 0.19, 0);
      return;
    case 'mu_len':
      part(root, DOME, c, 0.22, 0.24, 0.22, 0, y + 0.04, 0);
      part(root, CYL, 0xf4f1ea, 0.225, 0.06, 0.225, 0, y + 0.06, 0);
      part(root, SPHERE, 0xf4f1ea, 0.07, 0.07, 0.07, 0, y + 0.3, 0);
      return;
    case 'mu_coi':
      part(root, CYL, c, 0.42, 0.02, 0.42, 0, y + 0.14, 0);
      part(root, CYL, c, 0.19, 0.13, 0.19, 0, y + 0.2, 0);
      part(root, CYL, 0xc8452c, 0.195, 0.04, 0.195, 0, y + 0.17, 0);
      return;
    case 'mu_tai_beo':
      part(root, CYL, c, 0.19, 0.13, 0.19, 0, y + 0.18, 0);
      part(root, CONE_CYL, c, 0.32, 0.06, 0.32, 0, y + 0.12, 0);
      return;
    default: {
      // Nón lá.
      const cone = part(root, CONE, c, 0.4, 0.26, 0.4, 0, y + 0.26, 0);
      cone.rotation.y = 0.2;
    }
  }
}

/** Hai kiểu tóc/áo khác nhau cho khách theo số thứ tự (nhìn đỡ giống nhau). */
function customerSpec(color: number, variant: number): BodySpec {
  const hairs: CostumeStyle[] = ['toc_ngan', 'toc_dai', 'toc_duoi_ngua', 'toc_ngan', 'toc_bui', 'toc_xoan'];
  const hairColors = [0x2b2118, 0x3a2618, 0x5a3a22, 0x2b2118];
  const bottoms: Piece[] = [
    { style: 'quan_dai', color: 0x3a3a48 },
    { style: 'quan_jean', color: 0x3a5a8c },
    { style: 'quan_short', color: 0xc2a878 },
    { style: 'chan_vay', color: 0x2b2b2b },
  ];
  const tops: CostumeStyle[] = ['ao_phong', 'so_mi', 'ao_phong', 'ao_khoac'];
  return {
    hat: null,
    hair: { style: hairs[variant % hairs.length], color: hairColors[variant % hairColors.length] },
    top: { style: tops[variant % tops.length], color },
    bottom: bottoms[(variant >> 1) % bottoms.length],
    apron: null,
  };
}

function outfitSpec(o: Outfit, ownColor: number): BodySpec {
  const pick = (slot: keyof Outfit) => COSTUMES[o[slot]] ?? COSTUMES[DEFAULT_OUTFIT[slot]];
  const hat = pick('hat');
  const hair = pick('hair');
  const top = pick('shirt');
  const bottom = pick('pants');
  const apron = pick('apron');
  return {
    hat: { style: hat.style, color: hat.color },
    hair: { style: hair.style, color: hair.color },
    top: { style: top.style === 'ao_mau_rieng' ? 'ao_phong' : top.style, color: top.style === 'ao_mau_rieng' ? ownColor : top.color },
    // Áo dài mặc với quần trắng nếu đang mặc quần mặc định.
    bottom:
      top.style === 'ao_dai' && o.pants === DEFAULT_OUTFIT.pants ? { style: 'quan_dai', color: 0xf0ede4 } : { style: bottom.style, color: bottom.color },
    apron: apron.style === 'khong' ? null : { style: apron.style, color: apron.color },
  };
}

/**
 * Nhân vật low-poly có tay chân cử động. Người chơi mặc theo bộ đồ (mặc định nón lá + áo phông màu riêng);
 * nhân viên đội mũ trắng + tạp dề; khách có tóc/áo/quần khác nhau. Chồng đồ cầm trước ngực.
 */
export function createCharacter(color: number, opts: { look: CharacterLook; name?: string; variant?: number }): CharacterView {
  const group = new THREE.Group();
  const inner = new THREE.Group();
  group.add(inner);

  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  group.add(shadow);

  let rig: Rig;
  function setRig(spec: BodySpec) {
    if (rig) inner.remove(rig.root);
    rig = buildRig(spec);
    inner.add(rig.root);
  }
  if (opts.look === 'player') setRig(outfitSpec(DEFAULT_OUTFIT, color));
  else if (opts.look === 'staff')
    setRig({ hat: null, hair: { style: 'toc_ngan', color: 0x2b2118 }, top: { style: 'ao_phong', color }, bottom: { style: 'quan_dai', color: 0x3a3a48 }, apron: null, staffCap: true });
  else setRig(customerSpec(color, opts.variant ?? 0));

  let sitting = false;
  let eating = false;
  let carrying = false;
  let outfitKey = '';

  let label: THREE.Sprite | null = null;
  let currentName = '';
  function setName(name: string) {
    if (name === currentName) return;
    currentName = name;
    if (label) {
      group.remove(label);
      disposeLabel(label);
    }
    label = makeLabel(name, { bg: opts.look === 'staff' ? 'rgba(90,90,90,.85)' : 'rgba(43,33,24,.8)', size: 34, scale: 0.0075 });
    label.position.y = 1.85;
    group.add(label);
  }
  if (opts.name) setName(opts.name);

  const stack = new THREE.Group();
  stack.position.set(0, 0.62, 0.36);
  inner.add(stack);
  let carryKey = '';
  let badge: THREE.Sprite | null = null;
  let badgeKey = '';

  function setBadge(count: number, cap: number) {
    if (opts.look === 'customer') return;
    const b = carryBadge(count, cap);
    const key = `${b.text}|${b.full}`;
    if (key === badgeKey) return;
    badgeKey = key;
    if (badge) {
      group.remove(badge);
      disposeLabel(badge);
      badge = null;
    }
    if (!b.text) return;
    badge = makeLabel(b.text, { bg: b.full ? '#c8452c' : '#1f8a3a', size: 34, scale: 0.0075 });
    badge.position.y = currentName ? 2.3 : 1.85;
    group.add(badge);
  }

  let bubble: THREE.Sprite | null = null;
  let bubbleText: string | null = null;
  function setBubble(text: string | null) {
    if (text === bubbleText) return;
    bubbleText = text;
    if (bubble) {
      group.remove(bubble);
      disposeLabel(bubble);
      bubble = null;
    }
    if (!text) return;
    bubble = makeLabel(text, { bg: 'rgba(255,255,255,.92)', color: '#2b2118', size: 38, scale: 0.0075 });
    bubble.position.y = currentName ? (opts.look === 'customer' ? 2.3 : 2.7) : 2.05;
    group.add(bubble);
  }

  return {
    group,
    setBubble,
    setPose(x, z, dir, moving, t) {
      if (bubble) bubble.position.y = (currentName ? (opts.look === 'customer' ? 2.3 : 2.7) : 2.05) + Math.sin(t * 4) * 0.04;
      group.position.set(x, 0, z);
      inner.rotation.y = sitting ? 0 : dir;
      inner.position.y = sitting ? 0.12 : moving ? Math.abs(Math.sin(t * 10)) * 0.04 : 0;
      // Đi: chân bước, tay vung ngược chân; đang bê đồ thì hai tay đưa ra trước đỡ chồng đồ.
      const swing = moving && !sitting ? Math.sin(t * 10) * 0.55 : 0;
      rig.legL.rotation.x = sitting ? -Math.PI / 2 : swing;
      rig.legR.rotation.x = sitting ? -Math.PI / 2 : -swing;
      const armRest = carrying ? -1.25 : 0;
      rig.armL.rotation.x = armRest + (carrying ? 0 : -swing * 0.8);
      rig.armR.rotation.x = armRest + (carrying ? 0 : swing * 0.8);
      if (eating && sitting) {
        // Gắp — đưa lên miệng — nhai, lặp lại; đầu gật nhẹ theo nhịp nhai.
        const k = (t * 0.9 + (x * 7.3 + z * 3.1)) % 1;
        const lift = k < 0.35 ? k / 0.35 : k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
        rig.armR.rotation.x = -0.9 - lift * 1.1;
        rig.armL.rotation.x = -0.9;
        inner.position.y = 0.12 + (k > 0.35 && k < 0.6 ? Math.abs(Math.sin(t * 18)) * 0.012 : 0);
      }
    },
    setOutfit(o) {
      const key = `${o.hat}|${o.hair}|${o.shirt}|${o.pants}|${o.apron}`;
      if (key === outfitKey) return;
      outfitKey = key;
      setRig(outfitSpec(o, color));
    },
    setSitting(on) {
      sitting = on;
    },
    setEating(on) {
      eating = on;
    },
    setName,
    setCarry(items, cap = 4) {
      setBadge(items.length, cap);
      carrying = items.length > 0;
      const key = items.join(',');
      if (key === carryKey) return;
      carryKey = key;
      stack.clear();
      items.forEach((it, i) => {
        const m = createItemMesh(it);
        m.position.y = i * ITEM_STACK_H;
        stack.add(m);
      });
    },
    dispose() {
      if (label) disposeLabel(label);
      if (badge) disposeLabel(badge);
      if (bubble) disposeLabel(bubble);
      group.removeFromParent();
    },
  };
}
