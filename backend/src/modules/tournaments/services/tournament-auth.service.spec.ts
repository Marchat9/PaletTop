import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { Tournament } from 'src/entities/tournament.entity';
import { AdminPasswordService } from 'src/modules/admin-password/admin-password.service';
import { TournamentRepository } from '../repositories/tournament.repository';
import { TournamentAuthService } from './tournament-auth.service';

const STORED_HASH = '$argon2id$stored';
const TOURNAMENT = { id: 't1', code: 'ABCD' } as Tournament;

function makeService(options: {
    storedHash?: string | null;
    passwordValid?: boolean;
    tournament?: Tournament | null;
}) {
    const tournamentRepo = {
        findAdminPasswordHash: vi
            .fn()
            .mockResolvedValue(options.storedHash === undefined ? STORED_HASH : options.storedHash),
        findForAdmin: vi
            .fn()
            .mockResolvedValue(options.tournament === undefined ? TOURNAMENT : options.tournament),
    };
    const adminPassword = {
        verify: vi.fn().mockResolvedValue(options.passwordValid ?? true),
    };
    const service = new TournamentAuthService(
        tournamentRepo as unknown as TournamentRepository,
        adminPassword as unknown as AdminPasswordService,
    );
    return { service, tournamentRepo, adminPassword };
}

const AUTH_ERROR = 'Tournoi introuvable ou mot de passe invalide';

describe('TournamentAuthService.findWithAdminAuth', () => {
    it('returns the fully loaded tournament on a correct password', async () => {
        const { service, tournamentRepo, adminPassword } = makeService({});
        const options = { withTeams: true, withMatches: true };

        const result = await service.findWithAdminAuth({ code: 'ABCD' }, 'secret', options);

        expect(result).toBe(TOURNAMENT);
        expect(tournamentRepo.findAdminPasswordHash).toHaveBeenCalledWith({ code: 'ABCD' });
        expect(adminPassword.verify).toHaveBeenCalledWith(STORED_HASH, 'secret');
        expect(tournamentRepo.findForAdmin).toHaveBeenCalledWith({ code: 'ABCD' }, options);
    });

    it('rejects a wrong password without loading teams, matches or pools', async () => {
        const { service, tournamentRepo } = makeService({ passwordValid: false });

        await expect(
            service.findWithAdminAuth({ code: 'ABCD' }, 'wrong', { withMatches: true }),
        ).rejects.toThrow(new NotFoundException(AUTH_ERROR));
        expect(tournamentRepo.findForAdmin).not.toHaveBeenCalled();
    });

    it('rejects an unknown tournament with the same error', async () => {
        const { service, tournamentRepo } = makeService({ storedHash: null, passwordValid: false });

        await expect(service.findWithAdminAuth({ id: 'missing' }, 'secret')).rejects.toThrow(
            new NotFoundException(AUTH_ERROR),
        );
        expect(tournamentRepo.findForAdmin).not.toHaveBeenCalled();
    });

    it('rejects a stored value that is not a hash with the same error, not a 500', async () => {
        const { service } = makeService({ storedHash: 'clear-text', passwordValid: false });

        await expect(service.findWithAdminAuth({ code: 'ABCD' }, 'clear-text')).rejects.toThrow(
            new NotFoundException(AUTH_ERROR),
        );
    });

    it('rejects a tournament deleted between both queries with the same error', async () => {
        const { service } = makeService({ tournament: null });

        await expect(service.findWithAdminAuth({ code: 'ABCD' }, 'secret')).rejects.toThrow(
            new NotFoundException(AUTH_ERROR),
        );
    });
});
