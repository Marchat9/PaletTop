import { describe, expect, it, vi } from 'vitest';
import { Tournament } from 'src/entities/tournament.entity';
import { TournamentStatus } from 'src/enum/status.enum';
import { CompetitionMode } from 'src/enum/tounament.enum';
import { SessionService } from './session.service';

// The rollback itself is done by the database; here @Transactional() just runs the method.
vi.mock('typeorm-transactional', () => ({
    Transactional: () => () => undefined,
}));

function setup(prepareTournamentStart: () => Promise<Tournament>) {
    const tournament = {
        id: 'T1',
        code: 'CODE',
        status: TournamentStatus.DRAFT,
        teams: [{ id: 'team-1' }],
        configuration: { competitionMode: CompetitionMode.CHAMPIONSHIP },
    } as unknown as Tournament;

    const tournamentRepo = {
        updateStatus: vi.fn(async (t: Tournament, status: TournamentStatus) => ({ ...t, status })),
    };
    const sessionRepo = {
        create: vi.fn((data: object) => data),
        save: vi.fn(async (data: object) => ({ id: 'S1', ...data })),
    };
    const authService = { findWithAdminAuth: vi.fn(async () => tournament) };
    const gateway = {
        emitSessionUpdated: vi.fn(),
        emitTournamentUpdated: vi.fn(),
        emitMatchUpdated: vi.fn(),
    };
    const rankingService = { scheduleRankingUpdate: vi.fn() };
    const strategy = { prepareTournamentStart: vi.fn(prepareTournamentStart) };
    const strategyFactory = { create: vi.fn(() => strategy) };

    const service = new SessionService(
        tournamentRepo as never,
        sessionRepo as never,
        authService as never,
        gateway as never,
        rankingService as never,
        strategyFactory as never,
    );
    return { service, gateway, rankingService };
}

describe('SessionService.startTournament', () => {
    it('lets a failed start step reach the caller without telling anyone it started', async () => {
        const { service, gateway, rankingService } = setup(async () => {
            throw new Error('Il faut exactement 8 équipes');
        });

        await expect(service.startTournament('CODE', 'pw')).rejects.toThrow('exactement 8');

        // Events go out only once the transaction is committed.
        expect(gateway.emitSessionUpdated).not.toHaveBeenCalled();
        expect(gateway.emitTournamentUpdated).not.toHaveBeenCalled();
        expect(gateway.emitMatchUpdated).not.toHaveBeenCalled();
        expect(rankingService.scheduleRankingUpdate).not.toHaveBeenCalled();
    });
});
