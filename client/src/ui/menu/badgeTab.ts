import { BADGES } from '@qnm/shared';
import type { Snapshot } from '@qnm/shared';
import type { MenuTab } from './menu';

/** Tab Huy hiệu: tủ trưng bày thành tích của cả nhà (giữ cả khi phá sản). */
export function badgeTab(latest: () => Snapshot | null): MenuTab {
  return {
    id: 'badges',
    title: '🏅 Huy hiệu',
    mount(body) {
      let key = '';
      const render = () => {
        const owned = new Set(latest()?.fun?.badges ?? []);
        const k = [...owned].join(',');
        if (k === key && body.childElementCount) return;
        key = k;
        body.innerHTML = `
          <h3>Tủ huy hiệu <span class="muted">${owned.size}/${BADGES.length}</span></h3>
          <div class="badges">${BADGES.map(
            (b) => `<div class="badge${owned.has(b.id) ? ' got' : ''}"><span class="badge-icon">${owned.has(b.id) ? b.icon : '🔒'}</span>
              <b>${b.name}</b><span class="muted">${b.desc}</span></div>`,
          ).join('')}</div>
          <p class="note">Huy hiệu là của cả nhà và vẫn giữ khi quán phá sản.</p>`;
      };
      render();
      const t = setInterval(render, 500);
      return () => clearInterval(t);
    },
  };
}
