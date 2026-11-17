import * as THREE from 'three';
import { BALANCE, formatK, getStationDef } from '@qnm/shared';
import type { PlacedStation, Snapshot } from '@qnm/shared';

type TileSnap = Snapshot['tiles'][number];

export interface TileView {
  group: THREE.Group;
  update(t: TileSnap | undefined): void;
}

/**
 * Ô trả tiền trên sàn: viền + tên + giá; vòng trắng đếm 2 giây khi có người đứng,
 * sau đó thanh xanh thể hiện phần đã trả.
 */
export function createTileView(placed: PlacedStation): TileView {
  const def = getStationDef(placed.def);
  const size = 1.3;
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
  plane.position.y = 0.02;
  const group = new THREE.Group();
  group.position.set(placed.x, 0, placed.z);
  group.add(plane);
  let key = '';

  function draw(t: TileSnap) {
    g.clearRect(0, 0, 256, 256);
    g.fillStyle = 'rgba(255,250,240,0.85)';
    g.strokeStyle = '#2b2118';
    g.lineWidth = 8;
    g.setLineDash([22, 12]);
    g.beginPath();
    g.roundRect(8, 8, 240, 240, 26);
    g.fill();
    g.stroke();
    g.setLineDash([]);

    // Phần đã trả: tô xanh từ dưới lên.
    const frac = t.cost > 0 ? t.paid / t.cost : 0;
    if (frac > 0) {
      g.save();
      g.beginPath();
      g.roundRect(12, 12, 232, 232, 22);
      g.clip();
      g.fillStyle = 'rgba(31,138,58,0.35)';
      g.fillRect(12, 244 - 232 * frac, 232, 232 * frac);
      g.restore();
    }

    g.fillStyle = '#2b2118';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '700 26px system-ui, sans-serif';
    g.fillText(def.name, 128, 70, 220);
    g.font = '800 46px system-ui, sans-serif';
    g.fillStyle = '#c8452c';
    g.fillText(formatK(t.cost - t.paid), 128, 128, 220);

    // Vòng đếm 2 giây
    if (t.occupantSec > 0) {
      const k = Math.min(1, t.occupantSec / BALANCE.PAY_TILE_DELAY_SEC);
      g.strokeStyle = k < 1 ? '#ffffff' : '#1f8a3a';
      g.lineWidth = 14;
      g.beginPath();
      g.arc(128, 192, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k);
      g.stroke();
      g.strokeStyle = '#2b2118';
      g.lineWidth = 3;
      g.beginPath();
      g.arc(128, 192, 38, 0, Math.PI * 2);
      g.stroke();
    } else {
      g.font = '600 20px system-ui, sans-serif';
      g.fillStyle = '#7a6a58';
      g.fillText('Đứng 2 giây để mua', 128, 192, 220);
    }
    tex.needsUpdate = true;
  }

  return {
    group,
    update(t) {
      group.visible = !!t;
      if (!t) return;
      const k = `${t.paid}|${Math.round(t.occupantSec * 10)}`;
      if (k === key) return;
      key = k;
      draw(t);
    },
  };
}
