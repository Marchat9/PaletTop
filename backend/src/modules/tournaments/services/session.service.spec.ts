import { describe, expect, it, vi } from 'vitest';
import { Tournament } from 'src/entities/tournament.entity';
import { BadRequestException } from '@nestjs/common';
import { MatchStatus, MatchesSessionStatus, TournamentStatus } from 'src/enum/status.enum';
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

function setupActive(status: { canGenerateNewSession: boolean; canFinishTournament: boolean }) {
    const validatedSession = {
        id: 'S1',
        sessionNumber: 1,
        status: MatchesSessionStatus.OPEN,
        matches: [{ status: MatchStatus.VALIDATED }],
    };
    const tournament = {
        id: 'T1',
        code: 'CODE',
        status: TournamentStatus.ACTIVE,
        teams: [],
        matchsSessions: [validatedSession],
        configuration: { competitionMode: CompetitionMode.STANDARD },
    } as unknown as Tournament;

    const sessionRepo = {
        findAllByTournament: vi.fn(async () => [validatedSession]),
        save: vi.fn(),
        updateStatus: vi.fn(),
    };
    const strategy = {
        canStartNextSession: vi.fn(() => true),
        canCompleteTournament: vi.fn(() => true),
        computeTournamentStatus: vi.fn(() => ({ currentSession: 1, phaseName: '', ...status })),
    };
    const service = new SessionService(
        {} as never,
        sessionRepo as never,
        { findWithAdminAuth: vi.fn(async () => tournament) } as never,
        {} as never,
        {} as never,
        { create: vi.fn(() => strategy) } as never,
    );
    return { service, sessionRepo };
}

describe('SessionService phase limits', () => {
    it('refuses a next session once the strategy says none is planned (after the final)', async () => {
        const { service, sessionRepo } = setupActive({
            canGenerateNewSession: false,
            canFinishTournament: true,
        });

        await expect(service.nextSession('CODE', 'pw')).rejects.toThrow(BadRequestException);
        expect(sessionRepo.save).not.toHaveBeenCalled();
    });

    it('refuses to complete a tournament whose phases are not all played', async () => {
        const { service, sessionRepo } = setupActive({
            canGenerateNewSession: true,
            canFinishTournament: false,
        });

        await expect(service.completeTournament('CODE', 'pw')).rejects.toThrow(BadRequestException);
        expect(sessionRepo.updateStatus).not.toHaveBeenCalled();
    });
});
