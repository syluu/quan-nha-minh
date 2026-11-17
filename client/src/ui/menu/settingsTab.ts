import { audio } from '../../audio/instance';
import type { GameConnection } from '../../net';
import { loadSettings, saveSettings } from '../../settings';
import type { Settings } from '../../settings';
import { setItem } from '../../storage';
import type { MenuTab } from './menu';

/** Áp dụng cài đặt hiển thị (dòng hướng dẫn phím) ngay khi vào game. */
export function applyDisplaySettings(s: Settings = loadSettings()): void {
  document.querySelectorAll<HTMLElement>('.hint').forEach((el) => (el.hidden = !s.showHint));
}

/** Tab Cài đặt: âm lượng nhạc/hiệu ứng, tắt tiếng, đổi tên, dòng hướng dẫn phím. */
export function settingsTab(conn: GameConnection, myName: () => string): MenuTab {
  return {
    id: 'settings',
    title: '⚙️ Cài đặt',
    mount(body) {
      const s = loadSettings();
      body.innerHTML = `
        <h3>Âm thanh</h3>
        <label class="setting">Nhạc nền <input type="range" min="0" max="1" step="0.05" data-k="music" value="${s.music}" /></label>
        <label class="setting">Hiệu ứng <input type="range" min="0" max="1" step="0.05" data-k="sfx" value="${s.sfx}" /></label>
        <label class="setting check"><input type="checkbox" data-k="muted" ${s.muted ? 'checked' : ''}/> Tắt tiếng</label>
        <h3>Nhân vật</h3>
        <div class="setting rename"><input type="text" maxlength="16" value="" aria-label="Tên nhân vật" /><button class="primary">Đổi tên</button></div>
        <h3>Hiển thị</h3>
        <label class="setting check"><input type="checkbox" data-k="showHint" ${s.showHint ? 'checked' : ''}/> Hiện dòng hướng dẫn phím</label>
        <p class="note">Âm lượng và hiển thị lưu riêng trên máy này.</p>`;
      const nameInput = body.querySelector<HTMLInputElement>('.rename input')!;
      nameInput.value = myName();
      body.querySelector<HTMLButtonElement>('.rename button')!.onclick = () => {
        const n = nameInput.value.trim();
        if (!n) return;
        conn.rename(n);
        setItem('qnm.name', n);
      };
      body.querySelectorAll<HTMLInputElement>('[data-k]').forEach((el) => {
        el.oninput = () => {
          const next: Settings = { ...loadSettings() };
          const k = el.dataset.k as keyof Settings;
          if (el.type === 'checkbox') (next[k] as boolean) = el.checked;
          else (next[k] as number) = Number(el.value);
          saveSettings(next);
          audio.setVolumes(next);
          applyDisplaySettings(next);
        };
      });
    },
  };
}
