import { describe, expect, it } from 'vitest';
import { generateCode, normalizeCode } from '../src/codes';

describe('room codes (Review Focus 5)', () => {
  it('generates ABC-DEF style codes without ambiguous characters', () => {
    for (let i = 0; i < 50; i++) expect(generateCode()).toMatch(/^[A-HJ-NP-Z2-9]{3}-[A-HJ-NP-Z2-9]{3}$/);
  });

  it('normalizes loosely typed codes', () => {
    expect(normalizeCode(' abc def ')).toBe('ABC-DEF');
    expect(normalizeCode('abcdef')).toBe('ABC-DEF');
    expect(normalizeCode('ABC-DEF')).toBe('ABC-DEF');
  });

  it('rejects malformed codes', () => {
    expect(normalizeCode('abc')).toBeNull();
    expect(normalizeCode('ABC-DE0')).toBeNull();
    expect(normalizeCode('')).toBeNull();
  });
});
