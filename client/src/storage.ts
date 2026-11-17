/** localStorage bọc try/catch: chế độ ẩn danh hoặc bị chặn vẫn chơi được. */
export function getItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* bỏ qua */
  }
}

export function getOrCreateToken(): string {
  let t = getItem('qnm.token');
  if (!t) {
    t = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setItem('qnm.token', t);
  }
  return t;
}
