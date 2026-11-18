import type { ShopId } from '@qnm/shared';
import { loadSettings } from '../settings';

const LINES: Partial<Record<ShopId, string[]>> = {
  banh_mi: ['Bánh mì nóng giòn đây!', 'Bánh mì trứng, bánh mì thịt đây!'],
  com_tam: ['Cơm tấm sườn nướng thơm phức đây!', 'Cơm tấm sườn chả đây!'],
  pho_cafe: ['Phở bò nóng hổi đây!', 'Cà phê sữa đá mát lạnh đây!'],
};

/** Tiếng rao thỉnh thoảng (đọc bằng giọng tiếng Việt của trình duyệt nếu có; không có giọng thì im lặng). */
export function createRao() {
  let next = 40 + Math.random() * 40;
  return {
    update(dt: number, shopId: ShopId) {
      next -= dt;
      if (next > 0) return;
      next = 70 + Math.random() * 50;
      const lines = LINES[shopId];
      const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
      if (!lines || !synth) return;
      const s = loadSettings();
      if (s.muted || s.sfx <= 0) return;
      const voice = synth.getVoices().find((v) => v.lang?.toLowerCase().startsWith('vi'));
      if (!voice) return;
      const u = new SpeechSynthesisUtterance(lines[Math.floor(Math.random() * lines.length)]);
      u.voice = voice;
      u.lang = voice.lang;
      u.volume = Math.min(1, s.sfx * 0.8);
      u.rate = 1.05;
      u.pitch = 1.1;
      synth.speak(u);
    },
  };
}
