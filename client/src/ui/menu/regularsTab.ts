import { ITEMS, LIFE, SHOP_META, SHOP_TIERS, formatK, loveLevel, regularDef } from '@qnm/shared';
import type { Snapshot } from '@qnm/shared';
import type { MenuTab } from './menu';

const LEVEL = ['🤍 Mới quen', '💛 Khách quen', '❤️ Khách ruột'];

export interface RegularRow {
  name: string;
  shop: string;
  fav: string;
  level: string;
  love: number;
  visits: number;
  /** Phần thưởng của mức hiện tại. */
  perk: string;
}

/** Danh sách khách quen của cả nhà (mọi quán) + cấp của quán đang đứng. */
export function regularsView(s: Snapshot): {
  tier: { icon: string; name: string; next: string | null; pct: number; earned: string; bonus: string } | null;
  rows: RegularRow[];
} {
  const life = s.life;
  const isShop = SHOP_META[s.shopId].kind === 'shop';
  const t = life && isShop ? SHOP_TIERS[life.tier] : null;
  const prev = t?.min ?? 0;
  const tier =
    life && t
      ? {
          icon: t.icon,
          name: t.name,
          next: life.nextTierAt !== null ? `${SHOP_TIERS[life.tier + 1].icon} ${SHOP_TIERS[life.tier + 1].name} khi đạt ${formatK(life.nextTierAt)}` : null,
          pct: life.nextTierAt !== null ? Math.min(100, Math.round(((life.earned - prev) / (life.nextTierAt - prev)) * 100)) : 100,
          earned: formatK(life.earned),
          bonus: life.tier ? `+${Math.round(life.tier * LIFE.TIER_TRAFFIC * 100)}% khách đi bộ` : 'chưa có',
        }
      : null;
  const rows = (life?.regulars ?? []).map((r) => {
    const lv = loveLevel(r.love);
    return {
      name: regularDef(r.id)?.name ?? r.id,
      shop: SHOP_META[r.shopId].name,
      fav: ITEMS[r.fav].name,
      level: LEVEL[lv],
      love: r.love,
      visits: r.visits,
      perk: lv === 2 ? 'Boa gấp đôi, hay mang quà' : lv === 1 ? 'Hay dẫn bạn tới, gọi thêm món' : `Phục vụ món ruột thật nhanh để thân hơn (quen ở ${LIFE.LOVE_QUEN})`,
    };
  });
  return { tier, rows };
}

/** Tab Khách quen: ai hay ghé, món ruột, độ thân thiết; cấp của quán. */
export function regularsTab(latest: () => Snapshot | null): MenuTab {
  return {
    id: 'regulars',
    title: '❤️ Khách quen',
    mount(body) {
      let key = '';
      const render = () => {
        const s = latest();
        if (!s) return;
        const v = regularsView(s);
        const k = JSON.stringify(v);
        if (k === key) return;
        key = k;
        body.innerHTML = `
          ${v.tier ? `<div class="tier-card">
            <div class="tier-icon">${v.tier.icon}</div>
            <div class="tier-info"><b>${SHOP_META[s.shopId].name}: ${v.tier.name}</b>
              <span class="muted">Doanh thu cộng dồn ${v.tier.earned} · thưởng cấp: ${v.tier.bonus}</span>
              ${v.tier.next ? `<div class="quest-bar"><i style="width:${v.tier.pct}%"></i></div><span class="muted">Lên ${v.tier.next}</span>` : '<span class="muted">Đã là cấp cao nhất!</span>'}
            </div></div>` : ''}
          <h3>Khách quen <span class="muted">${v.rows.length}</span></h3>
          ${v.rows.length ? `<table class="staff"><thead><tr><th>Khách</th><th>Món ruột</th><th>Thân thiết</th></tr></thead><tbody>
            ${v.rows.map((r) => `<tr><td><b>${r.name}</b><div class="muted">${r.shop} · đã ghé ${r.visits} lần</div></td><td>${r.fav}</td>
              <td>${r.level}<div class="energy"><span class="bar"><i style="width:${r.love}%;background:#e2557a"></i></span></div><div class="muted">${r.perk}</div></td></tr>`).join('')}
          </tbody></table>` : '<p class="muted">Chưa có khách quen. Mở quán vài hôm là sẽ có người hay ghé!</p>'}
          <p class="note">Mỗi ngày khách quen ghé một lần, gọi <b>món ruột</b> (có tên trên đầu). Bán món ruột thật nhanh thì khách thân dần:
          <b>khách quen</b> hay dẫn bạn tới, <b>khách ruột</b> boa gấp đôi và thỉnh thoảng mang quà (+⭐). Để khách chờ tới bỏ về hoặc đặt giá quá cao thì khách giận.
          Quán lên đời theo doanh thu cộng dồn: quán cóc → khang trang → nổi tiếng → nhà hàng, mỗi cấp trang trí đẹp hơn và đông khách hơn.</p>`;
      };
      render();
      const t = setInterval(render, 500);
      return () => clearInterval(t);
    },
  };
}
