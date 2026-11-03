/**
 * Length bounds of the free texts, checked by the DTOs so an oversized value is a clean 400 rather
 * than a database error (or unbounded storage on the columns without a length). Same bounds as the
 * frontend inputs.
 */
export const MAX_NAME_LENGTH = 100;
export const MAX_TEAM_NAME_LENGTH = 50;
export const MAX_CLUB_LENGTH = 150;
export const MAX_DESCRIPTION_LENGTH = 1000;

export const maxLengthMessage = (field: string, max: number) =>
    `${field} : ${max} caractères maximum.`;
