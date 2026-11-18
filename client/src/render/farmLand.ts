import * as THREE from 'three';
import { BALANCE, SHOPS, formatK } from '@qnm/shared';
import { box, disposeTree, makeLabel } from './materials';

/** Mép trái phần đất đã có theo số lần mở rộng (0–3). */
const LAND_EDGE = [-7.75, -16.75, -25.75];

/**
 * Trang trại: phần đất chưa mua phủ cỏ tối, rào gỗ ở ranh giới và biển "Mở rộng lần N — giá".
 * Mua mở rộng thì ranh giới dời sang trái.
 */
export function createFarmLand(scene: THREE.Scene) {
  let group: THREE.Group | null = null;
  let key = '';
  return {
    update(isFarm: boolean, level: number) {
      const k = isFarm ? `farm|${level}` : '';
      if (k === key) return;
      key = k;
      if (group) disposeTree(group);
      group = null;
      if (!isFarm || level >= LAND_EDGE.length) return;
      group = new THREE.Group();
      const b = SHOPS.farm.bounds;
      const edge = LAND_EDGE[level];
      const wild = new THREE.Mesh(
        new THREE.PlaneGeometry(edge - b.minX, b.maxZ - b.minZ),
        new THREE.MeshLambertMaterial({ color: 0x5f7d3c }),
      );
      wild.rotation.x = -Math.PI / 2;
      wild.position.set((edge + b.minX) / 2, 0.015, (b.minZ + b.maxZ) / 2);
      group.add(wild);
      // Rào gỗ dọc ranh giới.
      const rail = box(0.08, 0.08, b.maxZ - b.minZ, 0x8a5a2b);
      rail.position.set(edge, 0.55, (b.minZ + b.maxZ) / 2);
      group.add(rail);
      for (let z = b.minZ + 0.3; z <= b.maxZ - 0.3; z += 1.2) {
        const post = box(0.12, 0.8, 0.12, 0x7a4e2a);
        post.position.set(edge, 0.4, z);
        group.add(post);
      }
      const sign = makeLabel(`🔒 Đất mở rộng lần ${level + 1} · ${formatK(BALANCE.FARM_EXPANSION_COSTS[level])} · Menu → 🌾 Trang trại`, {
        bg: 'rgba(43,33,24,.85)', size: 30, scale: 0.0075,
      });
      sign.position.set(edge - 2.6, 1.6, -1.25);
      group.add(sign);
      scene.add(group);
    },
  };
}
