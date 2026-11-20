import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { TrainingSession } from 'src/entities/training-session.entity';
import { AdminPasswordService } from 'src/modules/admin-password/admin-password.service';
import { TrainingSessionRepository } from '../repositories/training-session.repository';
import { TrainingSessionAuthService } from './training-session-auth.service';

const STORED_HASH = '$argon2id$stored';
const SESSION = { id: 'session-1', code: '123456' } as TrainingSession;
const AUTH_ERROR = 'Séance introuvable ou mot de passe invalide.';

function makeService(options: {
    storedHash?: string | null;
    passwordValid?: boolean;
    session?: TrainingSession | null;
}) {
    const sessionRepo = {
        findTrainingAdminPasswordHash: vi.fn().mockResolvedValue(
            options.storedHash === undefined ? STORED_HASH : options.storedHash,
        ),
        findForAdmin: vi
            .fn()
            .mockResolvedValue(options.session === undefined ? SESSION : options.session),
    };
    const adminPassword = { verify: vi.fn().mockResolvedValue(options.passwordValid ?? true) };
    const service = new TrainingSessionAuthService(
        sessionRepo as unknown as TrainingSessionRepository,
        adminPassword as unknown as AdminPasswordService,
    );
    return { service, sessionRepo, adminPassword };
}

describe('TrainingSessionAuthService.findWithAdminAuth', () => {
    it("returns the session on a correct training admin password", async () => {
        const { service, sessionRepo, adminPassword } = makeService({});

        await expect(service.findWithAdminAuth('123456', 'secret')).resolves.toBe(SESSION);
        expect(sessionRepo.findTrainingAdminPasswordHash).toHaveBeenCalledWith('123456');
        expect(adminPassword.verify).toHaveBeenCalledWith(STORED_HASH, 'secret');
        expect(sessionRepo.findForAdmin).toHaveBeenCalledWith('123456');
    });

    it('rejects a wrong password without loading participants and teams', async () => {
        const { service, sessionRepo } = makeService({ passwordValid: false });

        await expect(service.findWithAdminAuth('123456', 'wrong')).rejects.toThrow(
            new NotFoundException(AUTH_ERROR),
        );
        expect(sessionRepo.findForAdmin).not.toHaveBeenCalled();
    });

    it('rejects an unknown session with the same error', async () => {
        const { service, sessionRepo } = makeService({ storedHash: null, passwordValid: false });

        await expect(service.findWithAdminAuth('000000', 'secret')).rejects.toThrow(
            new NotFoundException(AUTH_ERROR),
        );
        expect(sessionRepo.findForAdmin).not.toHaveBeenCalled();
    });

    it('rejects a stored value that is not a hash with the same error, not a 500', async () => {
        const { service } = makeService({ storedHash: 'clear-text', passwordValid: false });

        await expect(service.findWithAdminAuth('123456', 'clear-text')).rejects.toThrow(
            new NotFoundException(AUTH_ERROR),
        );
    });

    it('rejects a session deleted between both queries with the same error', async () => {
        const { service } = makeService({ session: null });

        await expect(service.findWithAdminAuth('123456', 'secret')).rejects.toThrow(
            new NotFoundException(AUTH_ERROR),
        );
    });
});
