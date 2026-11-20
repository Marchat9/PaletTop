import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { Training } from 'src/entities/training.entity';
import { AdminPasswordService } from 'src/modules/admin-password/admin-password.service';
import { TrainingRepository } from '../repositories/training.repository';
import { TrainingAuthService } from './training-auth.service';

const STORED_HASH = '$argon2id$stored';
const TRAINING = { id: 'training-1', code: 'CLUB-1' } as Training;
const AUTH_ERROR = 'Entraînement introuvable ou mot de passe invalide';

function makeService(options: {
    storedHash?: string | null;
    passwordValid?: boolean;
    training?: Training | null;
}) {
    const trainingRepo = {
        findAdminPasswordHash: vi.fn().mockResolvedValue(
            options.storedHash === undefined ? STORED_HASH : options.storedHash,
        ),
        findForAdmin: vi
            .fn()
            .mockResolvedValue(options.training === undefined ? TRAINING : options.training),
    };
    const adminPassword = { verify: vi.fn().mockResolvedValue(options.passwordValid ?? true) };
    const service = new TrainingAuthService(
        trainingRepo as unknown as TrainingRepository,
        adminPassword as unknown as AdminPasswordService,
    );
    return { service, trainingRepo, adminPassword };
}

describe('TrainingAuthService.findWithAdminAuth', () => {
    it('returns the training on a correct password', async () => {
        const { service, trainingRepo, adminPassword } = makeService({});

        await expect(service.findWithAdminAuth('CLUB-1', 'secret', true)).resolves.toBe(TRAINING);
        expect(trainingRepo.findAdminPasswordHash).toHaveBeenCalledWith('CLUB-1');
        expect(adminPassword.verify).toHaveBeenCalledWith(STORED_HASH, 'secret');
        expect(trainingRepo.findForAdmin).toHaveBeenCalledWith('CLUB-1', true);
    });

    it('rejects a wrong password without loading the members', async () => {
        const { service, trainingRepo } = makeService({ passwordValid: false });

        await expect(service.findWithAdminAuth('CLUB-1', 'wrong', true)).rejects.toThrow(
            new NotFoundException(AUTH_ERROR),
        );
        expect(trainingRepo.findForAdmin).not.toHaveBeenCalled();
    });

    it('rejects an unknown training with the same error', async () => {
        const { service, trainingRepo } = makeService({ storedHash: null, passwordValid: false });

        await expect(service.findWithAdminAuth('NOPE', 'secret')).rejects.toThrow(
            new NotFoundException(AUTH_ERROR),
        );
        expect(trainingRepo.findForAdmin).not.toHaveBeenCalled();
    });

    it('rejects a stored value that is not a hash with the same error, not a 500', async () => {
        const { service } = makeService({ storedHash: 'clear-text', passwordValid: false });

        await expect(service.findWithAdminAuth('CLUB-1', 'clear-text')).rejects.toThrow(
            new NotFoundException(AUTH_ERROR),
        );
    });

    it('rejects a training deleted between both queries with the same error', async () => {
        const { service } = makeService({ training: null });

        await expect(service.findWithAdminAuth('CLUB-1', 'secret')).rejects.toThrow(
            new NotFoundException(AUTH_ERROR),
        );
    });
});
