/** Bảng chữ cho mã quán: bỏ các ký tự dễ nhầm (0/O, 1/I). */
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateCode(rand: () => number = Math.random): string {
  let s = '';
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)];
  return `${s.slice(0, 3)}-${s.slice(3)}`;
}

/** " abc def " / "abcdef" / "ABC-DEF" → "ABC-DEF"; sai định dạng → null. */
export function normalizeCode(input: string): string | null {
  const s = String(input ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (s.length !== 6) return null;
  for (const ch of s) if (!CODE_ALPHABET.includes(ch)) return null;
  return `${s.slice(0, 3)}-${s.slice(3)}`;
}
