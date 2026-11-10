import { describe, expect, it, vi } from 'vitest';
import { TrainingMatch } from 'src/entities/training-match.entity';
import { TrainingSession } from 'src/entities/training-session.entity';
import { MatchStatus } from 'src/enum/status.enum';
import { TrainingLeaderboardService } from './training-leaderboard.service';

function player(participantId: string, memberId?: string) {
    return { participant: { id: participantId, member: memberId ? { id: memberId } : null } };
}

function match(
    a: ReturnType<typeof player>[],
    scoreA: number,
    b: ReturnType<typeof player>[],
    scoreB: number,
): TrainingMatch {
    return {
        isBye: false,
        status: MatchStatus.VALIDATED,
        scoreA,
        scoreB,
        teamA: { members: a },
        teamB: { members: b },
    } as unknown as TrainingMatch;
}

function makeService(historyMatches: TrainingMatch[]) {
    const sessionRepo = { findRecentIdsByTraining: vi.fn().mockResolvedValue(['prev-session']) };
    const matchRepo = { findValidatedBySessions: vi.fn().mockResolvedValue(historyMatches) };
    const service = new TrainingLeaderboardService(sessionRepo as never, matchRepo as never);
    return { service, sessionRepo, matchRepo };
}

const session = {
    id: 'S',
    pointsPerGame: 13,
    training: { id: 'T' },
    participants: [
        { id: 'P1', member: { id: 'M1' } },
        { id: 'P2', member: { id: 'M2' } },
        { id: 'G', member: null },
        { id: 'P3', member: { id: 'M3' } },
    ],
} as unknown as TrainingSession;

describe('TrainingLeaderboardService.getLevelByParticipant', () => {
    it('mêle la séance en cours et l’historique du membre, garde les invités sur la séance seule', async () => {
        // History (previous session, played in 11 points): M1 scored 11 (won), M2 scored 5.
        const history = [
            {
                ...match([player('h1', 'M1')], 11, [player('h2', 'M2')], 5),
                session: { pointsPerGame: 11 },
            },
        ] as TrainingMatch[];
        const { service, sessionRepo, matchRepo } = makeService(history);

        // Current session: P1 (M1) scored 13 against guest G who scored 5.
        const current = [match([player('P1', 'M1')], 13, [player('G')], 5)];

        const levels = await service.getLevelByParticipant(session, current, 5);

        expect(sessionRepo.findRecentIdsByTraining).toHaveBeenCalledWith('T', 'S', 5);
        expect(matchRepo.findValidatedBySessions).toHaveBeenCalledWith(['prev-session']);
        // Scores as a share of their session's target. P1: (13/13 + 11/11) / 2 = 1 - two wins weigh
        // the same whatever the target.
        expect(levels['P1']).toBe(1);
        // P2: only history via member M2 = 5/11
        expect(levels['P2']).toBeCloseTo(5 / 11);
        // Guest G: current session only = 5/13
        expect(levels['G']).toBeCloseTo(5 / 13);
        // P3: never played → unknown, absent from the map
        expect(levels['P3']).toBeUndefined();
    });

    it('ne va pas chercher d’historique quand la profondeur est nulle', async () => {
        const { matchRepo } = makeService([]);
        const sessionRepo = { findRecentIdsByTraining: vi.fn().mockResolvedValue([]) };
        const serviceNoHistory = new TrainingLeaderboardService(
            sessionRepo as never,
            matchRepo as never,
        );

        const current = [match([player('P1', 'M1')], 11, [player('G')], 4)];
        const levels = await serviceNoHistory.getLevelByParticipant(session, current, 0);

        expect(sessionRepo.findRecentIdsByTraining).toHaveBeenCalledWith('T', 'S', 0);
        // As a share of the session's 13-point target.
        expect(levels['P1']).toBeCloseTo(11 / 13);
        expect(levels['G']).toBeCloseTo(4 / 13);
    });
});

describe('TrainingLeaderboardService.getClubLeaderboard', () => {
    function named(participantId: string, memberId?: string, name = memberId ?? participantId) {
        return {
            participant: { id: participantId, member: memberId ? { id: memberId, name } : null },
        };
    }

    function makeClubService(matches: TrainingMatch[]) {
        const current = { id: 'S2', training: { id: 'T' } } as unknown as TrainingSession;
        const sessionRepo = {
            findByCodeOrThrow: vi.fn().mockResolvedValue(current),
            findIdsByTrainingUpTo: vi.fn().mockResolvedValue(['S1', 'S2']),
        };
        const matchRepo = { findValidatedBySessions: vi.fn().mockResolvedValue(matches) };
        const service = new TrainingLeaderboardService(sessionRepo as never, matchRepo as never);
        return { service, sessionRepo, matchRepo, current };
    }

    it('additionne victoires et points de chaque membre sur les séances du club', async () => {
        // Session 1: Jean (M1) wins 13-7 against Marie (M2). Session 2: Marie wins 13-11.
        // A member plays under a new participant row each session: the member id ties them.
        const { service, sessionRepo, matchRepo, current } = makeClubService([
            match([named('p1-s1', 'M1', 'Jean')], 13, [named('p2-s1', 'M2', 'Marie')], 7),
            match([named('p2-s2', 'M2', 'Marie')], 13, [named('p1-s2', 'M1', 'Jean')], 11),
            match([named('p2-s2b', 'M2', 'Marie')], 13, [named('p3', 'M3', 'Luc')], 2),
        ]);

        const leaderboard = await service.getClubLeaderboard('123456');

        expect(sessionRepo.findIdsByTrainingUpTo).toHaveBeenCalledWith(current);
        expect(matchRepo.findValidatedBySessions).toHaveBeenCalledWith(['S1', 'S2']);
        expect(leaderboard).toEqual([
            { memberId: 'M2', name: 'Marie', wins: 2, points: 33 },
            { memberId: 'M1', name: 'Jean', wins: 1, points: 24 },
            { memberId: 'M3', name: 'Luc', wins: 0, points: 2 },
        ]);
    });

    it('laisse les invités de côté, sans fausser les membres qui ont joué avec eux', async () => {
        const { service } = makeClubService([
            match([named('p1', 'M1', 'Jean'), named('guest')], 13, [named('p2', 'M2', 'Marie')], 4),
        ]);

        const leaderboard = await service.getClubLeaderboard('123456');

        expect(leaderboard).toEqual([
            { memberId: 'M1', name: 'Jean', wins: 1, points: 13 },
            { memberId: 'M2', name: 'Marie', wins: 0, points: 4 },
        ]);
    });
});
