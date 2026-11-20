import { describe, expect, it } from 'vitest';
import * as argon2 from 'argon2';
import { ARGON2_OPTIONS, hashPassword, isArgon2idHash, verifyPassword } from './password-hash.util';

const PEPPER = 'p'.repeat(32);

describe('password-hash.util', () => {
    describe('hashPassword / verifyPassword', () => {
        it('hashes then verifies the same password', async () => {
            const hash = await hashPassword('Palet2026');

            await expect(verifyPassword(hash, 'Palet2026')).resolves.toBe(true);
        });

        it('rejects a wrong password', async () => {
            const hash = await hashPassword('Palet2026');

            await expect(verifyPassword(hash, 'Palet2027')).resolves.toBe(false);
        });

        it('is case, whitespace and unicode sensitive', async () => {
            const hash = await hashPassword('Palet2026');
            for (const candidate of ['palet2026', 'Palet2026 ', ' Palet2026']) {
                await expect(verifyPassword(hash, candidate)).resolves.toBe(false);
            }

            const accented = await hashPassword('Éléphant');
            await expect(verifyPassword(accented, 'Éléphant')).resolves.toBe(true);
            await expect(verifyPassword(accented, 'Elephant')).resolves.toBe(false);
        });

        it('produces a different hash each time for the same password (salt)', async () => {
            const first = await hashPassword('Palet2026');
            const second = await hashPassword('Palet2026');

            expect(first).not.toBe(second);
            await expect(verifyPassword(first, 'Palet2026')).resolves.toBe(true);
            await expect(verifyPassword(second, 'Palet2026')).resolves.toBe(true);
        });

        it('outputs a PHC argon2id string with the OWASP parameters', async () => {
            const hash = await hashPassword('Palet2026');

            expect(hash).toMatch(
                /^\$argon2id\$v=19\$m=19456,t=2,p=1\$[A-Za-z0-9+/]{22}\$[A-Za-z0-9+/]{43}$/,
            );
            expect(ARGON2_OPTIONS).toEqual({
                type: argon2.argon2id,
                memoryCost: 19456,
                timeCost: 2,
                parallelism: 1,
            });
        });

        it('rejects hashing an empty password', async () => {
            await expect(hashPassword('')).rejects.toThrow('Password must not be empty');
        });

        it('returns false for an empty candidate', async () => {
            const hash = await hashPassword('Palet2026');

            await expect(verifyPassword(hash, '')).resolves.toBe(false);
        });

        it('returns false without throwing on malformed stored values', async () => {
            const valid = await hashPassword('Palet2026');
            const malformed = [
                '',
                'Palet2026',
                '$argon2id$broken',
                valid.slice(0, -10),
                '$2b$10$abcdefghijklmnopqrstuuJ5x8vY1Qv3h1yq4gkq6eU8Qe2Sx3Y1e',
            ];

            for (const stored of malformed) {
                await expect(verifyPassword(stored, 'Palet2026')).resolves.toBe(false);
            }
        });

        it('verifies a hash created with other parameters', async () => {
            const hash = await argon2.hash('x', {
                type: argon2.argon2id,
                memoryCost: 8192,
                timeCost: 3,
                parallelism: 1,
            });

            await expect(verifyPassword(hash, 'x')).resolves.toBe(true);
        });

        it('uses the pepper', async () => {
            const peppered = await hashPassword('Palet2026', PEPPER);

            await expect(verifyPassword(peppered, 'Palet2026', PEPPER)).resolves.toBe(true);
            await expect(verifyPassword(peppered, 'Palet2026')).resolves.toBe(false);
            await expect(verifyPassword(peppered, 'Palet2026', 'q'.repeat(32))).resolves.toBe(
                false,
            );

            const unpeppered = await hashPassword('Palet2026');
            await expect(verifyPassword(unpeppered, 'Palet2026', PEPPER)).resolves.toBe(false);
        });
    });

    describe('isArgon2idHash', () => {
        it('recognises a real argon2id hash', async () => {
            expect(isArgon2idHash(await hashPassword('Palet2026'))).toBe(true);
        });

        it('rejects anything else', () => {
            for (const value of [
                '',
                'Palet2026',
                '$argon2i$v=19$m=19456,t=2,p=1$c2FsdHNhbHRzYWx0$aGFzaGhhc2g',
                '$argon2id$v=19$m=19456',
            ]) {
                expect(isArgon2idHash(value)).toBe(false);
            }
        });
    });
});
