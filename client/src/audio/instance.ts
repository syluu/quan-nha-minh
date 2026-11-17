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
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', unlock);

if (import.meta.env.DEV) Object.assign(window, { __qnmAudio: audio });
