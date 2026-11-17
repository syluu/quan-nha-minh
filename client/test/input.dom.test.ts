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
