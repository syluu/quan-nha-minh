/** Lời thoại vui trong bong bóng: nhân viên than mệt / khoe rảnh, chủ quán giục cả nhà. Thỉnh thoảng mới nói. */

export const STAFF_BUSY = [
  'Mệt quá 😮‍💨', 'Bận vcl 😵', 'Sắp kiệt sức rồi...', 'Chạy không kịp thở!', 'Ai phụ tui với 😭',
  'Tay chân rã rời 🥵', 'Sếp ơi tăng lương đi!', 'Hết hơi rồi...', 'Ngày gì mà đông dữ vậy!', 'Cho xin ngụm nước 💦',
];
export const STAFF_IDLE = [
  'Rảnh quá 😎', 'Khỏe re~', '♪ Là lá la ♪', '♪ Tình tang tính tang ♪', 'Hôm nay vắng ghê', 'Ngồi chơi xơi nước 🍵',
  'Ngáp ngáp 🥱', 'Chờ khách nè 🙋', '♪ Một con vịt xòe ra hai cái cánh ♪', 'Lướt điện thoại tí 📱',
];
export const OWNER_CROWDED = ['Đông khách ghê!', 'Nhanh tay lên cả nhà!', 'Khách tới, khách tới! 🙌', 'Bán đắt như tôm tươi 🦐', 'Thu ngân đâu rồi?!'];
export const OWNER_CARRY = ['Tới đây, tới đây!', 'Nóng hổi đây 🔥', 'Tránh đường nha!', 'Hàng về rồi!', 'Để đó tui bê cho!'];
export const OWNER_QUIET = ['Vắng khách quá, chạy quảng cáo thôi 📣', 'Hôm nay bán được bao nhiêu nhỉ? 🤔', 'Ủa khách đâu hết rồi?', 'Nghỉ tay chút 😌', 'Cố lên cả nhà! 💪'];

export interface ChatterOpts {
  /** Giây chờ giữa hai câu (ngẫu nhiên trong khoảng). */
  gap?: [number, number];
  /** Một câu hiện bao lâu. */
  show?: number;
  rand?: () => number;
}

type Mood = 'busy' | 'idle' | 'crowded' | 'carry' | 'quiet' | null;

/**
 * Mỗi nhân vật có đồng hồ riêng: cứ 25–50 giây mới có thể nói một câu (hợp tình huống lúc đó), hiện ~3,5 giây.
 * Nhân viên: "bận" khi gần như liên tục đi lại / bê đồ trong ~20 giây gần nhất, "rảnh" khi đứng không lâu.
 */
export function createChatter(opts: ChatterOpts = {}) {
  const [gapMin, gapMax] = opts.gap ?? [25, 50];
  const show = opts.show ?? 3.5;
  const rand = opts.rand ?? Math.random;
  const st = new Map<string, { wait: number; left: number; text: string | null; work: number; still: number }>();

  function entry(id: string) {
    let e = st.get(id);
    if (!e) {
      e = { wait: 5 + rand() * (gapMax - 5), left: 0, text: null, work: 0, still: 0 };
      st.set(id, e);
    }
    return e;
  }

  function tick(id: string, dt: number, mood: Mood, pick: (m: Exclude<Mood, null>) => string[]): string | null {
    const e = entry(id);
    if (e.left > 0) {
      e.left -= dt;
      if (e.left <= 0) e.text = null;
      return e.text;
    }
    e.wait -= dt;
    if (e.wait > 0 || !mood) return null;
    const lines = pick(mood);
    e.text = lines[Math.floor(rand() * lines.length)];
    e.left = show;
    e.wait = gapMin + rand() * (gapMax - gapMin);
    return e.text;
  }

  return {
    /** Nhân viên: moving/carrying lấy từ hình ảnh đang thấy. */
    staff(id: string, dt: number, moving: boolean, carrying: boolean): string | null {
      const e = entry(`s:${id}`);
      // Mức làm việc ~20 giây gần nhất (trung bình trượt).
      const k = Math.min(1, dt / 20);
      e.work += ((moving || carrying ? 1 : 0) - e.work) * k;
      e.still = moving || carrying ? 0 : e.still + dt;
      const mood: Mood = e.work > 0.8 ? 'busy' : e.still > 8 ? 'idle' : null;
      return tick(`s:${id}`, dt, mood, (m) => (m === 'busy' ? STAFF_BUSY : STAFF_IDLE));
    },
    /** Người chơi (chủ quán): theo tình hình quán. */
    owner(id: string, dt: number, ctx: { customers: number; carrying: boolean }): string | null {
      const mood: Mood = ctx.customers >= 8 ? 'crowded' : ctx.carrying ? 'carry' : ctx.customers <= 1 ? 'quiet' : null;
      return tick(`p:${id}`, dt, mood, (m) => (m === 'crowded' ? OWNER_CROWDED : m === 'carry' ? OWNER_CARRY : OWNER_QUIET));
    },
    forget(id: string) {
      st.delete(`s:${id}`);
      st.delete(`p:${id}`);
    },
  };
}
