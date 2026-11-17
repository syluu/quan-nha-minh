import { describe, expect, it } from 'vitest';
import { itemCost } from '../src/content/costs';

describe('itemCost', () => {
  it('sums ingredient prices down the recipe tree', () => {
    expect(itemCost('banh_mi')).toBe(2000);
    expect(itemCost('trung_op')).toBe(3000);
    expect(itemCost('banh_mi_trung')).toBe(6000);
    expect(itemCost('banh_mi_thit')).toBe(9000);
    expect(itemCost('tra_da')).toBe(500);
  });
});
