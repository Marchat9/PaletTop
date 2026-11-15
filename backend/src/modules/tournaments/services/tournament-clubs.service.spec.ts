import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TournamentClubsService } from './tournament-clubs.service';

describe('TournamentClubsService', () => {
    const authService = { findWithAdminAuth: vi.fn() };
    const clubRepo = { searchNamesForTournament: vi.fn() };
    let service: TournamentClubsService;

    beforeEach(() => {
        vi.resetAllMocks();
        authService.findWithAdminAuth.mockResolvedValue({ id: 't-1' });
        clubRepo.searchNamesForTournament.mockResolvedValue([]);
        service = new TournamentClubsService(authService as never, clubRepo as never);
    });

    it('authenticates before searching', async () => {
        await service.searchClubNames('ABC123', { password: 'pwd', search: 'pal' });

        expect(authService.findWithAdminAuth).toHaveBeenCalledWith({ code: 'ABC123' }, 'pwd');
        expect(clubRepo.searchNamesForTournament).toHaveBeenCalledWith('t-1', 'pal');
        expect(authService.findWithAdminAuth.mock.invocationCallOrder[0]).toBeLessThan(
            clubRepo.searchNamesForTournament.mock.invocationCallOrder[0],
        );
    });

    it('normalises the code from the URL', async () => {
        await service.searchClubNames(' abc123 ', { password: 'pwd' });

        expect(authService.findWithAdminAuth).toHaveBeenCalledWith({ code: 'ABC123' }, 'pwd');
    });

    it('does not query clubs when auth fails', async () => {
        const error = new NotFoundException('Tournoi introuvable ou mot de passe invalide');
        authService.findWithAdminAuth.mockRejectedValue(error);

        await expect(service.searchClubNames('ABC123', { password: 'bad' })).rejects.toBe(error);
        expect(clubRepo.searchNamesForTournament).not.toHaveBeenCalled();
    });

    it('treats a missing search as empty', async () => {
        await service.searchClubNames('ABC123', { password: 'pwd', search: undefined });

        expect(clubRepo.searchNamesForTournament).toHaveBeenCalledWith('t-1', '');
    });

    it('returns names wrapped in { names }', async () => {
        clubRepo.searchNamesForTournament.mockResolvedValue(['Nantes', 'Paris']);

        await expect(service.searchClubNames('ABC123', { password: 'pwd' })).resolves.toEqual({
            names: ['Nantes', 'Paris'],
        });
    });
});
