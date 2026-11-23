import { describe, expect, it } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { hashPassword } from 'src/utils/password-hash.util';
import { AdminPasswordService } from './admin-password.service';

function makeService(): AdminPasswordService {
    const configService = {
        getOrThrow: () => ({ pepper: 'p'.repeat(32) }),
    } as unknown as ConfigService;
    return new AdminPasswordService(configService);
}

describe('AdminPasswordService', () => {
    it('verifies a password it hashed', async () => {
        const service = makeService();

        const hash = await service.hash('Palet2026');

        expect(hash.startsWith('$argon2id$')).toBe(true);
        await expect(service.verify(hash, 'Palet2026')).resolves.toBe(true);
    });

    it('rejects a wrong password', async () => {
        const service = makeService();
        const hash = await service.hash('Palet2026');

        await expect(service.verify(hash, 'Palet2027')).resolves.toBe(false);
    });

    it('returns false when there is no stored hash', async () => {
        const service = makeService();

        await expect(service.verify(undefined, 'x')).resolves.toBe(false);
        await expect(service.verify(null, 'x')).resolves.toBe(false);
    });

    it('applies the pepper: a hash made without it does not verify', async () => {
        const service = makeService();
        const unpeppered = await hashPassword('Palet2026');

        await expect(service.verify(unpeppered, 'Palet2026')).resolves.toBe(false);
    });
});
