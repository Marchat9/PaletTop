import { TransformFnParams } from 'class-transformer';

/**
 * Tournament and training codes end up in URLs: only letters, digits, spaces, '-' and '_' are
 * allowed. Same rule as the frontend.
 */
export const CODE_PATTERN = /^[A-Za-z0-9 _-]+$/;

export const CODE_FORMAT_MESSAGE =
    'Le code ne peut contenir que des lettres, des chiffres, des espaces, « - » et « _ ».';

/**
 * Codes are stored and looked up in upper case, without surrounding spaces: "palet-2026" and
 * "PALET-2026" are the same code. Leaves anything that is not a string untouched.
 */
export function normalizedCode({ value }: TransformFnParams): unknown {
    return typeof value === 'string' ? value.trim().toUpperCase() : value;
}
