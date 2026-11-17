import type { GameConnection } from '../../net';

export interface MenuTab {
  id: string;
  title: string;
  /** Gọi khi tab được mở; trả về hàm dọn dẹp (tuỳ chọn). */
  mount(body: HTMLElement): void | (() => void);
}

/**
 * Menu chồng lên màn hình chơi: nút ☰ góc phải trên, phím M bật/tắt, Esc đóng.
 * Khi mở, gọi onOpenChange(true) để tắt điều khiển di chuyển.
 */
export function createMenu(root: HTMLElement, _conn: GameConnection, tabs: MenuTab[], onOpenChange: (open: boolean) => void) {
  const button = document.createElement('button');
  button.className = 'menu-btn';
  button.textContent = '☰ Menu';
  button.title = 'Menu (phím M)';

  const panel = document.createElement('div');
  panel.className = 'menu';
  panel.hidden = true;
  panel.innerHTML = `
    <div class="menu-head">
      <nav class="menu-tabs"></nav>
      <button class="menu-close" title="Đóng (Esc)">✕</button>
    </div>
    <div class="menu-body"></div>`;
  const nav = panel.querySelector<HTMLElement>('.menu-tabs')!;
  const body = panel.querySelector<HTMLElement>('.menu-body')!;
  root.append(button, panel);

  let current = tabs[0]?.id;
  let cleanup: (() => void) | void;

  function show(id: string) {
    current = id;
    if (cleanup) cleanup();
    nav.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.tab === id));
    body.replaceChildren();
    cleanup = tabs.find((t) => t.id === id)?.mount(body);
  }

  for (const t of tabs) {
    const b = document.createElement('button');
    b.textContent = t.title;
    b.dataset.tab = t.id;
    b.onclick = () => show(t.id);
    nav.append(b);
  }

  function setOpen(open: boolean) {
    if (panel.hidden === !open) return;
    panel.hidden = !open;
    onOpenChange(open);
    if (open) show(current);
    else {
      if (cleanup) cleanup = void cleanup();
      // Trả tiêu điểm về trang để phím di chuyển hoạt động ngay.
      (document.activeElement as HTMLElement | null)?.blur?.();
    }
  }

  button.onclick = () => setOpen(panel.hidden);
  panel.querySelector<HTMLButtonElement>('.menu-close')!.onclick = () => setOpen(false);
  window.addEventListener('keydown', (e) => {
    // Esc luôn đóng; M chỉ bị bỏ qua khi đang gõ chữ (ô đổi tên), không phải khi đang chỉnh thanh trượt/ô tích.
    const t = e.target as HTMLInputElement | null;
    const typing = t?.tagName === 'TEXTAREA' || (t?.tagName === 'INPUT' && (t.type === 'text' || t.type === 'search'));
    if (e.code === 'Escape') setOpen(false);
    else if (e.code === 'KeyM' && !typing) setOpen(panel.hidden);
  });

  return { open: (tab?: string) => (setOpen(true), tab && show(tab)), close: () => setOpen(false), isOpen: () => !panel.hidden };
}
