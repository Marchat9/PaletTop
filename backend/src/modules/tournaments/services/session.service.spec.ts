import { describe, expect, it, vi } from 'vitest';
import { Tournament } from 'src/entities/tournament.entity';
import { TournamentStatus } from 'src/enum/status.enum';
import { CompetitionMode } from 'src/enum/tounament.enum';
import { SessionService } from './session.service';

function setup(prepareTournamentStart: () => Promise<Tournament>) {
    const tournament = {
        id: 'T1',
        code: 'CODE',
        status: TournamentStatus.DRAFT,
        teams: [{ id: 'team-1' }],
        configuration: {
            competitionMode: CompetitionMode.CHAMPIONSHIP,
            maxTeamCapacity: 64,
        },
    } as unknown as Tournament;

    const tournamentRepo = {
        updateStatus: vi.fn(async (t: Tournament, status: TournamentStatus) => ({ ...t, status })),
        revertStart: vi.fn(async (_tournament: Tournament) => undefined),
    };
    const sessionRepo = {
        create: vi.fn((data: object) => data),
        save: vi.fn(async (data: object) => ({ id: 'S1', ...data })),
    };
    const authService = { findWithAdminAuth: vi.fn(async () => tournament) };
    const strategy = { prepareTournamentStart: vi.fn(prepareTournamentStart) };
    const strategyFactory = { create: vi.fn(() => strategy) };

    const service = new SessionService(
        tournamentRepo as never,
        sessionRepo as never,
        authService as never,
        {} as never,
        {} as never,
        strategyFactory as never,
    );
    return { service, tournament, tournamentRepo };
}

describe('SessionService.startTournament', () => {
    it('reverts the tournament to its original state when a start step fails', async () => {
        const { service, tournament, tournamentRepo } = setup(async () => {
            // Strategies may change the configuration in place before failing.
            tournament.configuration.maxTeamCapacity = 8;
            throw new Error('Il faut exactement 8 équipes');
        });

        await expect(service.startTournament('CODE', 'pw')).rejects.toThrow('exactement 8');

        expect(tournamentRepo.revertStart).toHaveBeenCalledTimes(1);
        const reverted = tournamentRepo.revertStart.mock.calls[0][0];
        expect(reverted.id).toBe('T1');
        expect(reverted.configuration.maxTeamCapacity).toBe(64);
    });
});
