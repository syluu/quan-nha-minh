import type { Cue } from './cues';
import { createMusic } from './music';

/**
 * Âm thanh tự tổng hợp bằng Web Audio (không cần file). Trình duyệt chỉ cho phát
 * sau lần bấm/gõ phím đầu tiên → gọi unlock() trong một sự kiện người dùng.
 */
export function createAudio() {
  let ctx: AudioContext | null = null;
  let sfx: GainNode | null = null;
  let musicOut: GainNode | null = null;
  let volumes = { music: 0.3, sfx: 0.7, muted: false };
  let music: ReturnType<typeof createMusic> | null = null;
  let wantMusic = false;

  function applyVolumes() {
    if (!ctx || !sfx || !musicOut) return;
    const t = ctx.currentTime;
    sfx.gain.setTargetAtTime(volumes.muted ? 0 : volumes.sfx * 0.5, t, 0.05);
    musicOut.gain.setTargetAtTime(volumes.muted ? 0 : volumes.music * 0.35, t, 0.2);
  }

  function tone(freq: number, at: number, dur: number, type: OscillatorType, peak: number, slideTo?: number) {
    if (!ctx || !sfx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, at);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, at + dur);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(sfx);
    o.start(at);
    o.stop(at + dur + 0.02);
  }

  function noise(at: number, dur: number, peak: number) {
    if (!ctx || !sfx) return;
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(4000, at);
    f.frequency.exponentialRampToValueAtTime(300, at + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(peak, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(f).connect(g).connect(sfx);
    src.start(at);
  }

  return {
    unlock() {
      if (!ctx) {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        sfx = ctx.createGain();
        musicOut = ctx.createGain();
        sfx.connect(ctx.destination);
        musicOut.connect(ctx.destination);
        sfx.gain.value = 0;
        musicOut.gain.value = 0;
        applyVolumes();
        if (wantMusic) this.startMusic();
      }
      if (ctx.state === 'suspended') void ctx.resume();
    },
    play(c: Cue) {
      if (!ctx || volumes.muted) return;
      const t = ctx.currentTime + 0.01;
      switch (c) {
        case 'pick':
          tone(660, t, 0.09, 'sine', 0.5, 990);
          break;
        case 'drop':
          tone(520, t, 0.08, 'triangle', 0.45, 360);
          break;
        case 'trash':
          noise(t, 0.28, 0.35);
          break;
        case 'cash':
          tone(1318, t, 0.35, 'triangle', 0.4);
          tone(1760, t + 0.09, 0.45, 'triangle', 0.4);
          break;
        case 'unlock':
          [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.08, 0.3, 'triangle', 0.4));
          break;
        case 'lost':
          tone(320, t, 0.45, 'sine', 0.35, 170);
          break;
        case 'dayEnd':
          tone(880, t, 1.0, 'sine', 0.35);
          tone(1320, t + 0.15, 1.0, 'sine', 0.25);
          break;
      }
    },
    /** Trạng thái AudioContext (để kiểm tra): 'none' khi chưa mở khoá. */
    state(): string {
      return ctx?.state ?? 'none';
    },
    setVolumes(v: { music: number; sfx: number; muted: boolean }) {
      volumes = v;
      applyVolumes();
    },
    startMusic() {
      wantMusic = true;
      if (!ctx || !musicOut || music) return;
      music = createMusic(ctx, musicOut);
      music.start();
    },
  };
}
