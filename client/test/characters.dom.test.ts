// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest';
import type * as THREE from 'three';

beforeAll(() => {
  // jsdom không có canvas 2D: thay bằng bản giả đủ dùng cho makeLabel.
  const ctx = new Proxy({}, { get: (_t, k) => (k === 'measureText' ? () => ({ width: 40 }) : () => {}), set: () => true });
  HTMLCanvasElement.prototype.getContext = (() => ctx) as never;
});

describe('CharacterView.setName', () => {
  it('replaces the name label above the head after a rename', async () => {
    const { createCharacter } = await import('../src/render/characters');
    const v = createCharacter(0x2f6db5, { look: 'player', name: 'Bố' });
    const labelText = () => v.group.children.filter((c) => (c as THREE.Sprite).isSprite).map((c) => c.userData.text);
    expect(labelText()).toEqual(['Bố']);
    v.setName('Ông Bố');
    expect(labelText()).toEqual(['Ông Bố']);
  });
});
