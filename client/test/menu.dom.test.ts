// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createMenu } from '../src/ui/menu/menu';

function setup() {
  document.body.innerHTML = '<div id="ui"></div>';
  const root = document.getElementById('ui')!;
  const opens: boolean[] = [];
  const menu = createMenu(root, {} as never, [
    { id: 'settings', title: 'Cài đặt', mount: (b) => void (b.innerHTML = '<input type="range" id="vol"/><input type="text" id="name"/>') },
  ], (o) => opens.push(o));
  return { menu, opens };
}

const press = (target: EventTarget, code: string) => target.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));

describe('menu keyboard', () => {
  it('Esc and M still close the menu after touching a slider', () => {
    const { menu } = setup();
    menu.open();
    const vol = document.getElementById('vol')!;
    vol.focus();
    press(vol, 'Escape');
    expect(menu.isOpen()).toBe(false);
    menu.open();
    press(document.getElementById('vol')!, 'KeyM');
    expect(menu.isOpen()).toBe(false);
  });

  it('typing M in the name box does not close the menu, but Esc does', () => {
    const { menu } = setup();
    menu.open();
    const name = document.getElementById('name')!;
    press(name, 'KeyM');
    expect(menu.isOpen()).toBe(true);
    press(name, 'Escape');
    expect(menu.isOpen()).toBe(false);
  });
});
