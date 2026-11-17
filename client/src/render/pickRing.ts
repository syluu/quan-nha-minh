import * as THREE from 'three';

/** Vòng nằm trên sàn quanh chân người chơi, chạy dần tới khi nhặt được món tiếp theo (0,45 s/món). */
export function createPickRing(scene: THREE.Scene) {
  const mat = new THREE.MeshBasicMaterial({ color: 0x1f8a3a, transparent: true, opacity: 0.9, depthTest: false, side: THREE.DoubleSide });
  const bg = new THREE.Mesh(
    new THREE.RingGeometry(0.42, 0.52, 32),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, depthTest: false, side: THREE.DoubleSide }),
  );
  let arc = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.52, 32, 1, 0, 0.001), mat);
  const group = new THREE.Group();
  group.add(bg, arc);
  group.renderOrder = 20;
  bg.renderOrder = 20;
  arc.renderOrder = 21;
  group.rotation.x = -Math.PI / 2;
  group.visible = false;
  scene.add(group);
  let lastStep = -1;
  return {
    update(progress: number, x: number, z: number) {
      group.visible = progress > 0.01;
      if (!group.visible) return;
      group.position.set(x, 0.03, z);
      const step = Math.round(progress * 24);
      if (step === lastStep) return;
      lastStep = step;
      group.remove(arc);
      arc.geometry.dispose();
      arc = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.52, 32, 1, Math.PI / 2, -Math.max(0.001, (step / 24) * Math.PI * 2)), mat);
      arc.renderOrder = 21;
      group.add(arc);
    },
  };
}
