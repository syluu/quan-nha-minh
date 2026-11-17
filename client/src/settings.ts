export interface Settings {
  music: number;
  sfx: number;
  muted: boolean;
  showHint: boolean;
}

export const DEFAULT_SETTINGS: Settings = { music: 0.3, sfx: 0.7, muted: false, showHint: true };
const KEY = 'qnm.settings';

const vol = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : d);

/** Cài đặt lưu theo từng máy (trình duyệt); lỗi hoặc dữ liệu hỏng → mặc định. */
export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const o = JSON.parse(raw) as Partial<Record<keyof Settings, unknown>>;
    return {
      music: vol(o.music, DEFAULT_SETTINGS.music),
      sfx: vol(o.sfx, DEFAULT_SETTINGS.sfx),
      muted: typeof o.muted === 'boolean' ? o.muted : DEFAULT_SETTINGS.muted,
      showHint: typeof o.showHint === 'boolean' ? o.showHint : DEFAULT_SETTINGS.showHint,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* bỏ qua */
  }
}
