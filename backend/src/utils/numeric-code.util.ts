import { ConflictException } from '@nestjs/common';

// Random draws before falling back to a scan: past this, the space is nearly full and drawing at
// random would take longer and longer.
const RANDOM_ATTEMPTS = 100;

/**
 * A random numeric code not in `existingCodes`. Throws a 409 once every code of that length is
 * taken, instead of looping forever on the event loop.
 */
export function generateNumericCode(existingCodes: Iterable<string>, length = 4): string {
    const taken = new Set(existingCodes);
    const max = 10 ** length;
    const format = (value: number) => value.toString().padStart(length, '0');

    for (let attempt = 0; attempt < RANDOM_ATTEMPTS; attempt++) {
        const code = format(Math.floor(Math.random() * max));
        if (!taken.has(code)) return code;
    }

    // Nearly full: scan from a random start so the remaining free codes are still spread out.
    const start = Math.floor(Math.random() * max);
    for (let offset = 0; offset < max; offset++) {
        const code = format((start + offset) % max);
        if (!taken.has(code)) return code;
    }

    throw new ConflictException('Plus aucun code disponible.');
}
