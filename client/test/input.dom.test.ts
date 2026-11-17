// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createKeyboardInput } from '../src/input';

const key = (type: 'keydown' | 'keyup', code: string) => window.dispatchEvent(new KeyboardEvent(type, { code }));

describe('createKeyboardInput.setEnabled (Review Focus 5)', () => {
  it('stops movement while the menu is open and forgets held keys', () => {
    const input = createKeyboardInput();
    key('keydown', 'KeyW');
    expect(input.read()).not.toEqual({ mx: 0, mz: 0 });
    input.setEnabled(false);
    expect(input.read()).toEqual({ mx: 0, mz: 0 });
    key('keydown', 'KeyD');
    expect(input.read()).toEqual({ mx: 0, mz: 0 });
    input.setEnabled(true);
    expect(input.read()).toEqual({ mx: 0, mz: 0 });
    key('keydown', 'KeyW');
    expect(input.read()).not.toEqual({ mx: 0, mz: 0 });
    input.dispose();
  });
});

describe('input gate (M3)', () => {
  it('stays blocked until every reason is cleared', async () => {
    const { createInputGate } = await import('../src/input');
    const gate = createInputGate();
    gate.set('menu', true);
    gate.set('settle', true);
    gate.set('menu', false);
    expect(gate.blocked()).toBe(true);
    gate.set('settle', false);
    expect(gate.blocked()).toBe(false);
  });
});
