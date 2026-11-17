import { BALANCE } from '../content';
import type { ShopState } from './world';

export function stars(ratings: number[]): number {
  if (ratings.length === 0) return BALANCE.DEFAULT_STARS;
  const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  return Math.round(avg * 10) / 10;
}

export function pushRating(shop: ShopState, score: number): void {
  shop.ratings.push(score);
  while (shop.ratings.length > BALANCE.RATING_WINDOW) shop.ratings.shift();
}
