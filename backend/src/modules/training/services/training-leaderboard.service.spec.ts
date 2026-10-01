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
        // History (previous session): M1 scored 7, M2 scored 9.
        const history = [match([player('h1', 'M1')], 7, [player('h2', 'M2')], 9)];
        const { service, sessionRepo, matchRepo } = makeService(history);

        // Current session: P1 (M1) scored 13 against guest G who scored 5.
        const current = [match([player('P1', 'M1')], 13, [player('G')], 5)];

        const levels = await service.getLevelByParticipant(session, current, 5);

        expect(sessionRepo.findRecentIdsByTraining).toHaveBeenCalledWith('T', 'S', 5);
        expect(matchRepo.findValidatedBySessions).toHaveBeenCalledWith(['prev-session']);
        // P1: (13 current + 7 history) / 2 matches = 10
        expect(levels['P1']).toBe(10);
        // P2: only history via member M2 = 9 / 1
        expect(levels['P2']).toBe(9);
        // Guest G: current session only = 5 / 1
        expect(levels['G']).toBe(5);
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
        expect(levels['P1']).toBe(11);
        expect(levels['G']).toBe(4);
    });
});
