/** Thông báo ngắn giữa trên màn hình (lỗi thao tác…), tự tắt sau 2,5 s. */
export function showToast(root: HTMLElement, text: string): void {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  root.append(el);
  setTimeout(() => el.remove(), 2500);
}
