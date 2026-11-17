// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest';
import type * as THREE from 'three';

beforeAll(() => {
  // jsdom không có canvas 2D: bản giả đủ cho makeLabel.
  const ctx = new Proxy({}, { get: (_t, k) => (k === 'measureText' ? () => ({ width: 40 }) : () => {}), set: () => true });
  HTMLCanvasElement.prototype.getContext = (() => ctx) as never;
});

describe('CharacterView.setOutfit (plan 7)', () => {
  it('swaps hat models and recolours shirt/pants without piling up meshes', async () => {
    const { createCharacter } = await import('../src/render/characters');
    const v = createCharacter(0x2f6db5, { look: 'player', name: 'Bố' });
    const count = () => {
      let n = 0;
      v.group.traverse((o) => ((o as THREE.Mesh).isMesh ? n++ : 0));
      return n;
    };
    v.setOutfit({ hat: 'non_la', shirt: 'ao_mac_dinh', pants: 'quan_nau', apron: 'khong_tap_de' });
    const base = count();
    v.setOutfit({ hat: 'mu_dau_bep', shirt: 'ao_dai_do', pants: 'quan_jean', apron: 'tap_de_caro' });
    const dressed = count();
    expect(dressed).toBeGreaterThan(base);
    for (let i = 0; i < 5; i++) {
      v.setOutfit({ hat: 'non_la', shirt: 'ao_mac_dinh', pants: 'quan_nau', apron: 'khong_tap_de' });
      v.setOutfit({ hat: 'mu_dau_bep', shirt: 'ao_dai_do', pants: 'quan_jean', apron: 'tap_de_caro' });
    }
    expect(count()).toBe(dressed);
    v.dispose();
  });
});
