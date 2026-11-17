// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest';
import type * as THREE from 'three';

beforeAll(() => {
  // jsdom không có canvas 2D: bản giả đủ cho makeLabel.
  const ctx = new Proxy({}, { get: (_t, k) => (k === 'measureText' ? () => ({ width: 40 }) : () => {}), set: () => true });
  HTMLCanvasElement.prototype.getContext = (() => ctx) as never;
});

describe('CharacterView.setOutfit (plan 7)', () => {
  it('swaps real garment shapes (not just colours) without piling up meshes', async () => {
    const { createCharacter } = await import('../src/render/characters');
    const v = createCharacter(0x2f6db5, { look: 'player', name: 'Bố' });
    const count = () => {
      let n = 0;
      v.group.traverse((o) => ((o as THREE.Mesh).isMesh ? n++ : 0));
      return n;
    };
    v.setOutfit({ hat: 'non_la', hair: 'toc_ngan_den', shirt: 'ao_mac_dinh', pants: 'quan_nau', apron: 'khong_tap_de' });
    const base = count();
    v.setOutfit({ hat: 'mu_dau_bep', hair: 'toc_ngan_den', shirt: 'ao_dai_do', pants: 'quan_jean', apron: 'tap_de_caro' });
    const dressed = count();
    expect(dressed).toBeGreaterThan(base);
    for (let i = 0; i < 5; i++) {
      v.setOutfit({ hat: 'non_la', hair: 'toc_ngan_den', shirt: 'ao_mac_dinh', pants: 'quan_nau', apron: 'khong_tap_de' });
      v.setOutfit({ hat: 'mu_dau_bep', hair: 'toc_ngan_den', shirt: 'ao_dai_do', pants: 'quan_jean', apron: 'tap_de_caro' });
    }
    expect(count()).toBe(dressed);
    v.dispose();
  });
});

describe('garment shapes differ', () => {
  it('a dress, an áo dài, jeans and shorts each build a different body', async () => {
    const { createCharacter } = await import('../src/render/characters');
    const shape = (o: Record<string, string>) => {
      const v = createCharacter(0x2f6db5, { look: 'player' });
      v.setOutfit({ hat: 'khong_mu', hair: 'toc_ngan_den', shirt: 'ao_mac_dinh', pants: 'quan_nau', apron: 'khong_tap_de', ...o } as never);
      const sig: string[] = [];
      v.group.traverse((m) => {
        const mesh = m as THREE.Mesh;
        if (mesh.isMesh) sig.push(`${(mesh.geometry as THREE.BufferGeometry).uuid.slice(0, 4)}:${(mesh.material as THREE.MeshLambertMaterial).color?.getHex()}:${mesh.scale.toArray().map((n) => n.toFixed(2)).join(',')}`);
      });
      v.dispose();
      return sig.join('|');
    };
    const shapes = new Set([
      shape({}),
      shape({ shirt: 'ao_hong' }),
      shape({ shirt: 'ao_dai_do' }),
      shape({ pants: 'quan_jean' }),
      shape({ pants: 'quan_short_jean' }),
      shape({ pants: 'chan_vay_do' }),
      shape({ hair: 'toc_dai_den' }),
      shape({ hat: 'mu_coi' }),
    ]);
    expect(shapes.size).toBe(8);
  });
});
