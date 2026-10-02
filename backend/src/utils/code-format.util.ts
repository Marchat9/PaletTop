/**
 * Tournament and training codes end up in URLs: only letters, digits, spaces, '-' and '_' are
 * allowed. Same rule as the frontend.
 */
export const CODE_PATTERN = /^[A-Za-z0-9 _-]+$/;

export const CODE_FORMAT_MESSAGE =
    'Le code ne peut contenir que des lettres, des chiffres, des espaces, « - » et « _ ».';
