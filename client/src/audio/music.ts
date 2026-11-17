/** Nhạc nền nhẹ: giai điệu ngũ cung 8 nhịp lặp lại + bè trầm, sóng tam giác mềm. */
const NOTE = (n: number) => 440 * Math.pow(2, (n - 69) / 12); // số MIDI → Hz

// Giai điệu (MIDI) 4 ô nhịp × 8 nốt; 0 = nghỉ.
const MELODY = [
  76, 79, 81, 79, 76, 74, 72, 0,
  74, 76, 79, 76, 74, 72, 69, 0,
  72, 74, 76, 79, 81, 79, 76, 74,
  76, 74, 72, 69, 72, 0, 72, 0,
];
const BASS = [48, 45, 41, 43];
const STEP = 0.38;

export function createMusic(ctx: AudioContext, out: GainNode) {
  let step = 0;
  let nextAt = 0;
  let timer: ReturnType<typeof setInterval> | null = null;

  function note(midi: number, at: number, dur: number, peak: number) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = NOTE(midi);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(out);
    o.start(at);
    o.stop(at + dur + 0.05);
  }

  function schedule() {
    while (nextAt < ctx.currentTime + 0.5) {
      const m = MELODY[step % MELODY.length];
      if (m) note(m, nextAt, STEP * 1.6, 0.25);
      if (step % 8 === 0) note(BASS[Math.floor(step / 8) % BASS.length], nextAt, STEP * 7.5, 0.3);
      nextAt += STEP;
      step++;
    }
  }

  return {
    start() {
      if (timer) return;
      nextAt = ctx.currentTime + 0.1;
      timer = setInterval(schedule, 120);
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
    },
  };
}
