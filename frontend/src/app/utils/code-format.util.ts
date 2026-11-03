/**
 * Tournament and training codes end up in URLs: only letters, digits, spaces, '-' and '_' are
 * allowed. Same rule as the backend.
 */
export const CODE_PATTERN = /^[A-Za-z0-9 _-]+$/;

export const CODE_FORMAT_HINT = 'Lettres, chiffres, espaces, « - » et « _ » uniquement.';

export function isValidCode(code: string): boolean {
  return CODE_PATTERN.test(code.trim());
}

/**
 * Codes are stored in upper case, without surrounding spaces (same rule as the backend). A code
 * read from a URL or a form must go through this before being compared to a stored one.
 */
export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}
