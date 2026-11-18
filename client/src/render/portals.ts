import * as THREE from 'three';
import { BALANCE } from '@qnm/shared';
import type { ShopId, Snapshot } from '@qnm/shared';
import { disposeTree } from './materials';

type PortalSnap = Snapshot['portals'][number];

const ICON: Record<ShopId, string> = { banh_mi: '🥖', com_tam: '🍚', pho_cafe: '🍜', farm: '🌾' };

interface PadView {
  group: THREE.Group;
  draw(p: PortalSnap, pulse: number): void;
}

/** Một ô lối đi trên sàn: vòng tròn xanh dương, biểu tượng + tên nơi đến, vòng đếm 1 giây khi có người đứng. */
function createPad(p: PortalSnap): PadView {
  const size = 1.5;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d')!;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
  );
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = 0.025;
  const group = new THREE.Group();
  group.position.set(p.x, 0, p.z);
  group.add(plane);
  let key = '';

  return {
    group,
    draw(t, pulse) {
      const k = Math.min(1, t.sec / BALANCE.PORTAL_SEC);
      const glow = t.sec > 0 ? 1 : Math.round(pulse * 8) / 8;
      const nk = `${t.name}|${Math.round(k * 20)}|${glow}`;
      if (nk === key) return;
      key = nk;
      g.clearRect(0, 0, 256, 256);
      // Nền tròn + viền nét đứt, nền sáng nhấp nháy nhẹ để dễ để ý.
      g.fillStyle = `rgba(214,236,255,${0.75 + 0.15 * glow})`;
      g.strokeStyle = '#1f5fa8';
      g.lineWidth = 9;
      g.setLineDash([20, 12]);
      g.beginPath();
      g.arc(128, 128, 116, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.setLineDash([]);

      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = '72px system-ui, "Noto Color Emoji", sans-serif';
      g.fillText(ICON[t.to] ?? '🚪', 128, 70);
      g.fillStyle = '#1f3f6a';
      g.font = '700 26px system-ui, sans-serif';
      g.fillText('Sang', 128, 122, 200);
      g.font = '800 34px system-ui, sans-serif';
      g.fillText(t.name, 128, 156, 210);

      if (t.sec > 0) {
        g.strokeStyle = '#ffffff';
        g.lineWidth = 12;
        g.beginPath();
        g.arc(128, 200, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k);
        g.stroke();
        g.strokeStyle = '#1f5fa8';
        g.lineWidth = 3;
        g.beginPath();
        g.arc(128, 200, 29, 0, Math.PI * 2);
        g.stroke();
      } else {
        g.fillStyle = '#4a6a8a';
        g.font = '700 21px system-ui, sans-serif';
        g.fillText('Đứng 1 giây để đi', 128, 198, 180);
      }
      tex.needsUpdate = true;
    },
  };
}

export interface PortalLayer {
  update(portals: PortalSnap[] | undefined, t: number): void;
  clear(): void;
}

/** Các ô lối đi của quán đang xem; thuê thêm quán / trang trại thì thêm ô. */
export function createPortalLayer(scene: THREE.Scene): PortalLayer {
  const pads = new Map<string, PadView>();
  const clear = () => {
    for (const v of pads.values()) disposeTree(v.group);
    pads.clear();
  };
  return {
    clear,
    update(portals, t) {
      const list = portals ?? [];
      const want = new Set(list.map((p) => `${p.to}@${p.x},${p.z}`));
      for (const [k, v] of pads) {
        if (want.has(k)) continue;
        disposeTree(v.group);
        pads.delete(k);
      }
      const pulse = 0.5 + 0.5 * Math.sin(t * 3);
      for (const p of list) {
        const k = `${p.to}@${p.x},${p.z}`;
        let v = pads.get(k);
        if (!v) {
          v = createPad(p);
          pads.set(k, v);
          scene.add(v.group);
        }
        v.draw(p, pulse);
      }
    },
  };
}
