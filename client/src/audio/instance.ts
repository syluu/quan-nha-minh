import { loadSettings } from '../settings';
import { createAudio } from './engine';

/** Một bộ âm thanh dùng chung cho cả game (sảnh, cảnh chơi, menu cài đặt). */
export const audio = createAudio();
audio.setVolumes(loadSettings());

// Trình duyệt chỉ cho phát sau thao tác đầu tiên của người dùng.
const unlock = () => {
  audio.unlock();
  audio.startMusic();
};
// iPhone/iPad chỉ cho bật âm trong 'click'/'touchend'; máy tính dùng pointerdown/keydown.
for (const ev of ['pointerdown', 'keydown', 'click', 'touchend']) window.addEventListener(ev, unlock);

if (import.meta.env.DEV) Object.assign(window, { __qnmAudio: audio });
