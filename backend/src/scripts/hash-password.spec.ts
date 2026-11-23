import { describe, expect, it, vi } from 'vitest';
import { isArgon2idHash, verifyPassword } from 'src/utils/password-hash.util';
import { runHashPassword } from './hash-password';

describe('runHashPassword', () => {
    it('prints an argon2id hash of the argument, without pepper, and exits 0', async () => {
        const prompt = vi.fn();
        const lines: string[] = [];

        const code = await runHashPassword(['MonMotDePasse'], prompt, (line) => lines.push(line));

        expect(code).toBe(0);
        expect(prompt).not.toHaveBeenCalled();
        expect(lines).toHaveLength(1);
        expect(isArgon2idHash(lines[0])).toBe(true);
        await expect(verifyPassword(lines[0], 'MonMotDePasse')).resolves.toBe(true);
    });

    it('asks for the password with the hidden prompt when no argument is given', async () => {
        const prompt = vi.fn(() => Promise.resolve('Saisi'));
        const lines: string[] = [];

        const code = await runHashPassword([], prompt, (line) => lines.push(line));

        expect(code).toBe(0);
        expect(prompt).toHaveBeenCalledOnce();
        await expect(verifyPassword(lines[0], 'Saisi')).resolves.toBe(true);
    });

    it('prints a usage line and exits 1 on an empty password', async () => {
        const lines: string[] = [];

        const code = await runHashPassword(
            [],
            () => Promise.resolve(''),
            (line) => lines.push(line),
        );

        expect(code).toBe(1);
        expect(lines).toHaveLength(1);
        expect(lines[0]).toContain('Usage');
    });
});
