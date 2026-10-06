/**
 * Tournament and training codes end up in URLs: only letters, digits, spaces, '-' and '_' are
 * allowed. Same rule as the backend.
 */
export const CODE_PATTERN = /^[A-Za-z0-9 _-]+$/;

export const CODE_FORMAT_HINT = 'Lettres, chiffres, espaces, « - » et « _ » uniquement.';

export function isValidCode(code: string): boolean {
  return CODE_PATTERN.test(code.trim());
}
