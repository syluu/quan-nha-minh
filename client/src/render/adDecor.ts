import * as THREE from 'three';
import { SHOP_META, SHOPS } from '@qnm/shared';
import type { AdId, ShopId } from '@qnm/shared';
import { box, disposeTree, mat } from './materials';

const lanternGeo = new THREE.SphereGeometry(0.18, 12, 9);

/**
 * Trang trí theo quảng cáo lâu dài đã mua: biển LED chữ chạy ở mặt tiền (trước-trái quán),
 * dãy đèn lồng đỏ trên tường sau. Dựng lại khi đổi quán hoặc mua thêm.
 */
export function createAdDecor(scene: THREE.Scene) {
  let group: THREE.Group | null = null;
  let key = '';
  let ledTex: THREE.CanvasTexture | null = null;
  let pin: THREE.Group | null = null;
  let time = 0;

  function build(shopId: ShopId, ads: AdId[]) {
    if (group) disposeTree(group);
    group = new THREE.Group();
    ledTex = null;
    const b = SHOPS[shopId].bounds;
    if (ads.includes('bien_led')) {
      const g = new THREE.Group();
      g.position.set(b.minX + 2.2, 0, b.maxZ + 0.7);
      const pole = box(0.12, 1.9, 0.12, 0x3a3f45);
      pole.position.y = 0.95;
      const frame = box(2.6, 0.75, 0.14, 0x22262b);
      frame.position.y = 2.25;
      const c = document.createElement('canvas');
      c.width = 1024;
      c.height = 160;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0b0d10';
        ctx.fillRect(0, 0, 1024, 160);
        ctx.font = '800 88px system-ui, sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffcc33';
        ctx.fillText(`★ ${SHOP_META[shopId].sign} ★ NGON - RẺ - NHANH `, 10, 84, 1004);
      }
      ledTex = new THREE.CanvasTexture(c);
      ledTex.colorSpace = THREE.SRGBColorSpace;
      ledTex.wrapS = THREE.RepeatWrapping;
      ledTex.repeat.set(0.55, 1);
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(2.45, 0.6), new THREE.MeshBasicMaterial({ map: ledTex }));
      panel.position.set(0, 2.25, 0.08);
      g.add(pole, frame, panel);
      group.add(g);
    }
    if (ads.includes('den_long')) {
      for (let i = 0; i < 7; i++) {
        const x = b.minX + 1.5 + (i * (b.maxX - b.minX - 3)) / 6;
        const lantern = new THREE.Mesh(lanternGeo, mat(0xd8261c, 0xff3010));
        lantern.scale.y = 1.25;
        lantern.position.set(x, 2.0, b.minZ + 0.3);
        const cap = box(0.14, 0.06, 0.14, 0xf2c14e);
        cap.position.set(x, 2.25, b.minZ + 0.3);
        group.add(lantern, cap);
      }
    }
    if (ads.includes('ghim_ban_do')) {
      // Cây ghim bản đồ đỏ to cắm trên nóc tường sau, nhấp nhô.
      pin = new THREE.Group();
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), mat(0xe0302a, 0x400000));
      head.position.y = 0.55;
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 9), mat(0xffffff));
      dot.position.set(0, 0.6, 0.24);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.55, 14), mat(0xe0302a));
      tip.rotation.x = Math.PI;
      tip.position.y = 0.2;
      pin.add(head, dot, tip);
      pin.position.set(0, 2.5, b.minZ + 0.2);
      group.add(pin);
    } else pin = null;
    if (ads.includes('the_tich_diem')) {
      // Bảng "Tích điểm 10 tặng 1" dựng trên quầy thu ngân.
      const cashier = SHOPS[shopId].stations.find((p) => p.def === 'thu_ngan');
      if (cashier) {
        const c = document.createElement('canvas');
        c.width = 256;
        c.height = 192;
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#2f6db5';
          ctx.fillRect(0, 0, 256, 192);
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.font = '800 40px system-ui, sans-serif';
          ctx.fillText('💳 TÍCH ĐIỂM', 128, 70);
          ctx.font = '700 34px system-ui, sans-serif';
          ctx.fillText('10 lần tặng 1', 128, 135);
        }
        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        const board = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.38), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
        board.position.set(cashier.x - 0.25, 1.15, cashier.z + 0.3);
        board.rotation.x = -0.2;
        group.add(board);
      }
    }
    scene.add(group);
  }

  return {
    update(shopId: ShopId, ads: AdId[] | undefined, dt: number) {
      const list = ads ?? [];
      const k = `${shopId}|${[...list].sort().join(',')}`;
      if (k !== key) {
        key = k;
        build(shopId, list);
      }
      // Chữ chạy trên biển LED.
      if (ledTex) ledTex.offset.x = (ledTex.offset.x + dt * 0.12) % 1;
      time += dt;
      if (pin) {
        pin.position.y = 2.5 + Math.sin(time * 2) * 0.12;
        pin.rotation.y = time * 0.8;
      }
    },
  };
}
