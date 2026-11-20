import * as argon2 from 'argon2';

/**
 * Password hashing with Argon2id (OWASP recommended parameters: 19 MiB of memory, 2 iterations).
 *
 * - Salt: 16 random bytes drawn by argon2 for every hash and stored inside the PHC string
 *   (`$argon2id$v=19$m=19456,t=2,p=1$<salt>$<hash>`). It is not secret: it makes two identical
 *   passwords hash differently and forces an attacker to attack each hash separately.
 * - Pepper (optional): a secret kept outside the database (environment), mixed in through
 *   Argon2's `secret` parameter. A database leak alone is then not enough to start a dictionary
 *   attack. Losing or changing it invalidates every hash created with it.
 */
export const ARGON2_OPTIONS = {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
} as const;

// `$argon2id$v=<n>$m=<n>,t=<n>,p=<n>$<salt>$<hash>`, with a salt of at least 16 bytes (22 base64
// chars) and a hash of at least 32 bytes (43 chars): a value truncated by a bad copy-paste or a
// line wrap is rejected instead of passing as a hash that no password will ever match.
const ARGON2ID_PHC_PATTERN =
    /^\$argon2id\$v=\d+\$m=\d+,t=\d+,p=\d+\$[A-Za-z0-9+/]{22,}\$[A-Za-z0-9+/]{43,}$/;

function toSecret(pepper?: string): Buffer | undefined {
    return pepper ? Buffer.from(pepper, 'utf8') : undefined;
}

export async function hashPassword(plain: string, pepper?: string): Promise<string> {
    if (!plain) {
        throw new Error('Password must not be empty');
    }
    return argon2.hash(plain, { ...ARGON2_OPTIONS, secret: toSecret(pepper) });
}

/**
 * Never throws: an empty candidate, a value that is not an argon2id hash (clear text, truncated
 * or foreign hash) or a wrong pepper all resolve to `false`.
 */
export async function verifyPassword(
    storedHash: string,
    plain: string,
    pepper?: string,
): Promise<boolean> {
    if (!plain || !isArgon2idHash(storedHash)) {
        return false;
    }
    try {
        return await argon2.verify(storedHash, plain, { secret: toSecret(pepper) });
    } catch {
        return false;
    }
}

export function isArgon2idHash(value: string): boolean {
    return ARGON2ID_PHC_PATTERN.test(value);
}
