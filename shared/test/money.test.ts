import { describe, expect, it } from 'vitest';
import { K, formatK } from '../src/money';

describe('K', () => {
  it('converts thousands to integer đồng', () => {
    expect(K(5)).toBe(5000);
    expect(K(2.5)).toBe(2500);
  });
});

describe('formatK', () => {
  it('formats whole thousands', () => {
    expect(formatK(5000)).toBe('5K');
    expect(formatK(0)).toBe('0K');
  });
  it('uses dot for thousands and comma for decimals', () => {
    expect(formatK(2_987_500)).toBe('2.987,5K');
    expect(formatK(25_000_000)).toBe('25.000K');
    expect(formatK(1200)).toBe('1,2K');
  });
  it('formats negatives', () => {
    expect(formatK(-300_000)).toBe('-300K');
  });
});
