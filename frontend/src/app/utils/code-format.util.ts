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
/** Training session codes: 6 digits, 4 for the sessions created before the change. */
export const SESSION_CODE_LENGTH = 6;
const SESSION_CODE_PATTERN = /^(\d{4}|\d{6})$/;

export function isSessionCode(code: string | null | undefined): boolean {
  return !!code && SESSION_CODE_PATTERN.test(code);
}

/** The spectator mode only opens with a current 6-digit session code, not the older 4-digit ones. */
const SPECTATOR_SESSION_CODE_PATTERN = /^\d{6}$/;

export function isSpectatorSessionCode(code: string | null | undefined): boolean {
  return !!code && SPECTATOR_SESSION_CODE_PATTERN.test(code);
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}
