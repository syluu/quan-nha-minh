/** Chữ nổi "+25K" / "-1★" bay lên tại vị trí trong thế giới rồi mờ dần. */
export function createFloatText(root: HTMLElement, project: (x: number, y: number, z: number) => { x: number; y: number }) {
  return {
    spawn(text: string, kind: 'gain' | 'loss', x: number, z: number) {
      const el = document.createElement('div');
      el.className = `float ${kind}`;
      el.textContent = text;
      root.append(el);
      const start = performance.now();
      const step = (now: number) => {
        const t = (now - start) / 1200;
        if (t >= 1) return el.remove();
        const p = project(x, 1.8 + t * 0.9, z);
        el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%)`;
        el.style.opacity = String(Math.min(1, (1 - t) * 1.6));
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },
  };
}
