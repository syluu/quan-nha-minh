import { APP_VERSION } from './version';
import { normalizeCode } from '@qnm/shared';
import { connect, createWorldOnServer } from './net';
import type { GameConnection } from './net';
import { getItem, getOrCreateToken, setItem } from './storage';

function errorText(err: unknown): string {
  const msg = String((err as Error)?.message ?? err);
  if (msg.includes('WORLD_NOT_FOUND')) return 'Không tìm thấy quán với mã này.';
  if (msg.includes('INVALID_CODE')) return 'Mã quán gồm 6 ký tự, ví dụ ABC-DEF.';
  if (msg.includes('WORLD_FULL') || msg.includes('locked')) return 'Quán đã đủ 4 người chơi.';
  if (msg.includes('WORLD_BUSY')) return 'Quán đang lưu dữ liệu, thử lại sau vài giây.';
  if (msg.includes('CREATE_FAILED')) return 'Không tạo được quán mới, thử lại sau.';
  return 'Không kết nối được máy chủ. Nếu vừa mở, chờ khoảng 1 phút để máy chủ khởi động rồi thử lại.';
}

/** Màn hình sảnh: nhập tên, tạo quán mới hoặc vào quán bằng mã. */
export function showLobby(root: HTMLElement, onJoined: (conn: GameConnection) => void): void {
  root.innerHTML = `
    <div class="lobby">
      <h1>🥖 Quán Nhà Mình</h1>
      <p class="sub">Cả nhà cùng bán bánh mì <span class="ver">· Bản ${APP_VERSION}</span></p>
      <label>Tên của bạn<input id="name" maxlength="16" placeholder="Ví dụ: Bố" /></label>
      <button id="create" class="primary">Tạo quán mới</button>
      <div class="or">hoặc</div>
      <label>Mã quán<input id="code" maxlength="9" placeholder="ABC-DEF" autocomplete="off" /></label>
      <button id="join">Vào quán</button>
      <p id="msg" class="msg" role="status"></p>
    </div>`;
  const $ = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const nameEl = $<HTMLInputElement>('name');
  const codeEl = $<HTMLInputElement>('code');
  const msgEl = $('msg');
  const buttons = [$<HTMLButtonElement>('create'), $<HTMLButtonElement>('join')];
  nameEl.value = getItem('qnm.name') ?? '';
  codeEl.value = getItem('qnm.lastCode') ?? '';

  const busy = (b: boolean, text = '') => {
    buttons.forEach((el) => (el.disabled = b));
    msgEl.textContent = text;
  };

  async function enter(code: string) {
    const name = nameEl.value.trim() || 'Người chơi';
    setItem('qnm.name', name);
    busy(true, 'Đang vào quán…');
    try {
      const conn = await connect({ code, name, token: getOrCreateToken() });
      setItem('qnm.lastCode', code);
      onJoined(conn);
    } catch (err) {
      busy(false, errorText(err));
    }
  }

  buttons[0].onclick = async () => {
    busy(true, 'Đang tạo quán…');
    try {
      await enter(await createWorldOnServer());
    } catch (err) {
      busy(false, errorText(err));
    }
  };
  buttons[1].onclick = () => {
    const code = normalizeCode(codeEl.value);
    if (!code) return busy(false, errorText('INVALID_CODE'));
    codeEl.value = code;
    void enter(code);
  };
  codeEl.onkeydown = (e) => {
    if (e.key === 'Enter') buttons[1].click();
  };
}
