import { BALANCE } from '../content';
import type { ShopState, WorldState } from './world';

export function stars(ratings: number[]): number {
  if (ratings.length === 0) return BALANCE.DEFAULT_STARS;
  const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  return Math.round(avg * 10) / 10;
}

/** Sao trung bình các quán đang có (tổng kết ngày, báo cáo). */
export function averageStars(world: WorldState): number {
  const owned = Object.values(world.shops).filter((s) => s.owned);
  if (!owned.length) return BALANCE.DEFAULT_STARS;
  return Math.round((owned.reduce((n, s) => n + stars(s.ratings), 0) / owned.length) * 10) / 10;
}

export function pushRating(shop: ShopState, score: number): void {
  shop.ratings.push(score);
  while (shop.ratings.length > BALANCE.RATING_WINDOW) shop.ratings.shift();
}
