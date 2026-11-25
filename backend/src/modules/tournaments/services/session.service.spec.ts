import { describe, expect, it, vi } from 'vitest';
import { Tournament } from 'src/entities/tournament.entity';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { StructuredCompetitionConfiguration } from 'src/entities/tournament-competition-configuration.entity';
import { MatchStatus, MatchesSessionStatus, TournamentStatus } from 'src/enum/status.enum';
import { CompetitionMode } from 'src/enum/tounament.enum';
import { PlanSettings } from '../strategies/tournament-strategy.abstract';
import { TournamentStrategyFactory } from '../strategies/tournament-strategy.factory';
import { SessionService } from './session.service';

// The rollback itself is done by the database; here @Transactional() just runs the method.
vi.mock('typeorm-transactional', () => ({
    Transactional: () => () => undefined,
}));
// The tournament DTO mappers are out of the scope of these tests.
vi.mock('../responses/admin-tournament.dto', () => ({
    toAdminTournamentDto: vi.fn(() => ({})),
    toTournamentMetaDto: vi.fn(() => ({})),
}));

const planSettings: PlanSettings = {
    maxConsolations: 4,
    thresholds: { okRatio: 0.9, warningRatio: 0.75 },
};

function setup(
    prepareTournamentStart: () => Promise<Tournament>,
    competitionMode = CompetitionMode.CHAMPIONSHIP,
) {
    const tournament = {
        id: 'T1',
        code: 'CODE',
        status: TournamentStatus.DRAFT,
        teams: [{ id: 'team-1' }],
        configuration: { competitionMode },
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
        {
            buildPlan: vi.fn(async () => null),
            getPlanSettings: vi.fn(async () => planSettings),
        } as never,
    );
    return { service, gateway, rankingService, tournamentRepo, sessionRepo, strategy };
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

    // Review focus: a team added or removed between the launch check and « Lancer ».
    it('refuses with a 409 when the team count changed since the launch check, before any write', async () => {
        const { service, tournamentRepo, sessionRepo, strategy } = setup(async () => {
            throw new Error('must not be called');
        });

        const start = service.startTournament('CODE', 'pw', { expectedTeamCount: 2 });
        await expect(start).rejects.toThrow(ConflictException);
        await expect(start).rejects.toThrow(
            "Le nombre d'équipes a changé, relancez la vérification.",
        );
        expect(sessionRepo.save).not.toHaveBeenCalled();
        expect(tournamentRepo.updateStatus).not.toHaveBeenCalled();
        expect(strategy.prepareTournamentStart).not.toHaveBeenCalled();
    });

    it('passes the plan settings and the confirmed choice to the strategy', async () => {
        const { service, strategy } = setup(async () => {
            throw new Error('stop after prepare');
        }, CompetitionMode.STANDARD);

        await expect(
            service.startTournament('CODE', 'pw', {
                expectedTeamCount: 1,
                consolationCount: 3,
                eliminatedAfterQualifying: 5,
            }),
        ).rejects.toThrow('stop after prepare');
        expect(strategy.prepareTournamentStart).toHaveBeenCalledWith(
            expect.objectContaining({ status: TournamentStatus.ACTIVE }),
            {
                settings: planSettings,
                choice: { consolationCount: 3, eliminatedAfterQualifying: 5 },
            },
        );
    });
});

describe('SessionService.startTournament (mode without a launch choice)', () => {
    it('refuses a structured choice before any write', async () => {
        const { service, sessionRepo, strategy } = setup(async () => {
            throw new Error('must not be called');
        });

        await expect(
            service.startTournament('CODE', 'pw', { expectedTeamCount: 1, consolationCount: 1 }),
        ).rejects.toThrow(BadRequestException);
        expect(sessionRepo.save).not.toHaveBeenCalled();
        expect(strategy.prepareTournamentStart).not.toHaveBeenCalled();
    });
});

/** A draft structured tournament started with the real strategy (its repositories mocked). */
function setupStructured(teamCount: number, consolationCount: number, maxTeamCapacity = 128) {
    const tournament = {
        id: 'T1',
        code: 'CODE',
        status: TournamentStatus.DRAFT,
        teams: Array.from({ length: teamCount }, (_, i) => ({ id: `team-${i}` })),
        configuration: {
            maxTeamCapacity,
            competitionMode: CompetitionMode.STANDARD,
            competitionConfiguration: {
                numberOfQualifyingRounds: 4,
                consolationCount,
                hasChallenges: false,
                hasThirdPlaceMatch: false,
            },
        },
    } as unknown as Tournament;

    const tournamentRepo = {
        updateStatus: vi.fn(async (t: Tournament, status: TournamentStatus) => ({ ...t, status })),
        save: vi.fn(async (t: Tournament) => t),
    };
    const sessionRepo = {
        create: vi.fn((data: object) => data),
        save: vi.fn(async (data: object) => ({ id: 'S1', ...data })),
    };
    const gateway = {
        emitSessionUpdated: vi.fn(),
        emitTournamentUpdated: vi.fn(),
        emitMatchUpdated: vi.fn(),
    };
    const rankingService = { scheduleRankingUpdate: vi.fn() };
    const factory = new TournamentStrategyFactory(
        {} as never,
        {} as never,
        {} as never,
        tournamentRepo as never,
    );
    const strategy = factory.create(CompetitionMode.STANDARD);
    // Pools and matches are out of scope: only the configuration written at launch matters here.
    vi.spyOn(strategy, 'assignTeamsToFirstPools').mockResolvedValue([]);
    vi.spyOn(strategy, 'generateSessionMatches').mockResolvedValue([]);

    const service = new SessionService(
        tournamentRepo as never,
        sessionRepo as never,
        { findWithAdminAuth: vi.fn(async () => tournament) } as never,
        gateway as never,
        rankingService as never,
        { create: vi.fn(() => strategy) } as never,
        {
            buildPlan: vi.fn(async () => null),
            getPlanSettings: vi.fn(async () => planSettings),
        } as never,
    );
    const storedConfig = (): StructuredCompetitionConfiguration =>
        tournamentRepo.save.mock.calls[0][0].configuration
            .competitionConfiguration as StructuredCompetitionConfiguration;
    return { service, tournament, tournamentRepo, gateway, storedConfig };
}

describe('SessionService.startTournament (structured plan frozen at launch)', () => {
    it('freezes the extra consolation chosen for 136 teams on a 128-team target', async () => {
        const { service, storedConfig } = setupStructured(136, 2);

        await service.startTournament('CODE', 'pw', {
            expectedTeamCount: 136,
            consolationCount: 3,
            eliminatedAfterQualifying: 0,
        });

        const config = storedConfig();
        expect(config.consolationCount).toBe(3);
        expect(config.eliminatedAfterQualifying).toBe(0);
        expect(config.plan!.brackets.length).toBe(4);
        expect(config.plan!.brackets.map((b) => b.teamCount)).toEqual([64, 32, 32, 8]);
        expect(config.plan!.brackets[3].extra).toBe(true);
    });

    it('keeps the stored configuration when an old client sends no choice', async () => {
        const { service, storedConfig } = setupStructured(128, 2);

        await service.startTournament('CODE', 'pw');

        const config = storedConfig();
        expect(config.consolationCount).toBe(2);
        expect(config.eliminatedAfterQualifying).toBe(0);
        expect(config.plan!.brackets.map((b) => b.capacity)).toEqual([64, 32, 32]);
    });

    it('stores the teams stopped after the qualifiers', async () => {
        const { service, storedConfig } = setupStructured(136, 2);

        await service.startTournament('CODE', 'pw', {
            consolationCount: 2,
            eliminatedAfterQualifying: 5,
        });

        const config = storedConfig();
        expect(config.eliminatedAfterQualifying).toBe(5);
        expect(config.plan!.eliminatedAfterQualifying).toBe(5);
        expect(config.plan!.teamCount).toBe(131);
    });

    // Review focus: 2 or 3 teams cannot fill a main bracket and a consolation.
    it.each([2, 3])(
        'refuses an impossible plan for %i teams with a consolation, without starting',
        async (teamCount) => {
            const { service, tournament, tournamentRepo, gateway } = setupStructured(
                teamCount,
                0,
                8,
            );

            await expect(
                service.startTournament('CODE', 'pw', { consolationCount: 1 }),
            ).rejects.toThrow(BadRequestException);
            // Nothing is saved by the strategy; the status change is rolled back with the
            // transaction, and nobody is told the tournament started.
            expect(tournamentRepo.save).not.toHaveBeenCalled();
            expect(tournament.status).toBe(TournamentStatus.DRAFT);
            expect(gateway.emitSessionUpdated).not.toHaveBeenCalled();
            expect(gateway.emitTournamentUpdated).not.toHaveBeenCalled();
        },
    );
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
        isDrawnSession: vi.fn(() => true),
        canCompleteTournament: vi.fn(() => true),
        computeTournamentStatus: vi.fn(() => ({ currentSession: 1, phaseName: '', ...status })),
    };
    const gateway = { emitSessionUpdated: vi.fn(), emitTournamentUpdated: vi.fn() };
    const rankingService = { scheduleRankingUpdate: vi.fn() };
    const service = new SessionService(
        {} as never,
        sessionRepo as never,
        { findWithAdminAuth: vi.fn(async () => tournament) } as never,
        gateway as never,
        rankingService as never,
        { create: vi.fn(() => strategy) } as never,
        { buildPlan: vi.fn(async () => null) } as never,
    );
    return { service, sessionRepo, tournament, validatedSession, rankingService };
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

describe('SessionService.nextSession', () => {
    // A bye of the new round is validated at once: its win must reach the ranking without waiting
    // for the next score.
    it('schedules a ranking update once the next round is created', async () => {
        const { service, tournament, validatedSession, rankingService } = setupActive({
            canGenerateNewSession: true,
            canFinishTournament: false,
        });
        const newSession = {
            id: 'S2',
            sessionNumber: 2,
            status: MatchesSessionStatus.OPEN,
            matches: [],
        };
        const internals = service as unknown as Record<string, unknown>;
        internals.writeNextSession = vi.fn(async () => ({
            currentSessionClosed: { ...validatedSession, matches: [] },
            newSession,
            tournamentWithMatches: {
                ...tournament,
                matchsSessions: [validatedSession, newSession],
            },
        }));
        internals.emitHistoryForSession = vi.fn(async () => undefined);
        internals.emitNewMatchForEachTeam = vi.fn();

        await service.nextSession('CODE', 'pw');

        expect(rankingService.scheduleRankingUpdate).toHaveBeenCalledWith('CODE');
    });
});
