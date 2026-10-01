import { describe, expect, it, vi } from 'vitest';
import { TrainingMatch } from 'src/entities/training-match.entity';
import { TrainingSession } from 'src/entities/training-session.entity';
import { MatchStatus } from 'src/enum/status.enum';
import { TrainingSessionStatus } from 'src/enum/training.enum';
import { TrainingScoreService } from './training-score.service';

function makeService(match: TrainingMatch) {
    const session = {
        id: 'session-1',
        code: '1234',
        status: TrainingSessionStatus.OPEN,
        pointsPerGame: 13,
    } as unknown as TrainingSession;

    const gateway = {
        emitMatchUpdated: vi.fn(),
        emitLeaderboardUpdated: vi.fn(),
    };

    const service = new TrainingScoreService(
        {
            findByIdInSession: vi.fn(() => Promise.resolve(match)),
            save: vi.fn((rows: TrainingMatch[]) => Promise.resolve(rows)),
        } as never,
        { touchLastActivity: vi.fn() } as never,
        { findWithAdminAuth: vi.fn(() => Promise.resolve(session)) } as never,
        { getLeaderboardBySessionId: vi.fn(() => Promise.resolve([])) } as never,
        gateway as never,
    );

    return { service, gateway };
}

function match(overrides: Partial<TrainingMatch>): TrainingMatch {
    return {
        id: 'm1',
        status: MatchStatus.PENDING,
        isBye: false,
        scoreA: 0,
        scoreB: 0,
        startedAt: null,
        finishedAt: null,
        teamA: { members: [] },
        teamB: { members: [] },
        ...overrides,
    } as unknown as TrainingMatch;
}

describe('TrainingScoreService.adminUpdateScore', () => {
    it('rediffuse le classement quand un score atteint la cible et valide le match', async () => {
        const { service, gateway } = makeService(match({ status: MatchStatus.ONGOING }));

        await service.adminUpdateScore('1234', 'm1', 'pwd', 13, 5);

        expect(gateway.emitLeaderboardUpdated).toHaveBeenCalledTimes(1);
    });

    // Reopening a validated match removes its points from the leaderboard: the broadcast has to
    // fire on the way out too, not only on the way in.
    it('rediffuse le classement quand une correction rouvre un match validé', async () => {
        const { service, gateway } = makeService(
            match({ status: MatchStatus.VALIDATED, scoreA: 13, scoreB: 5, finishedAt: new Date() }),
        );

        await service.adminUpdateScore('1234', 'm1', 'pwd', 10, 5);

        expect(gateway.emitLeaderboardUpdated).toHaveBeenCalledTimes(1);
    });

    it('ne rediffuse pas le classement pour une correction qui laisse le match en cours', async () => {
        const { service, gateway } = makeService(match({ status: MatchStatus.ONGOING }));

        await service.adminUpdateScore('1234', 'm1', 'pwd', 8, 5);

        expect(gateway.emitLeaderboardUpdated).not.toHaveBeenCalled();
    });
});
