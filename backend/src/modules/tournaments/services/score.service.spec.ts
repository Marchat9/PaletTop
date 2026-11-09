import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { MatchStatus, MatchesSessionStatus } from 'src/enum/status.enum';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { ScoreService } from './score.service';

function setup(match: Partial<TournamentMatch>) {
    const matchRepo = {
        findByIdInTournament: vi.fn(async () => match),
        update: vi.fn(async () => undefined),
    };
    const tournamentAuthService = {
        findWithAdminAuth: vi.fn(async () => ({
            id: 'T1',
            configuration: { pointsPerGame: 13 },
        })),
    };
    const service = new ScoreService(
        {} as never,
        matchRepo as never,
        {} as never,
        {} as never,
        {} as never,
        tournamentAuthService as never,
        {} as never,
        {} as never,
    );
    return { service, matchRepo };
}

const closedMatch: Partial<TournamentMatch> = {
    id: 'm1',
    scoreA: 13,
    scoreB: 7,
    status: MatchStatus.VALIDATED,
    session: { status: MatchesSessionStatus.CLOSED } as TournamentMatch['session'],
};

describe('ScoreService.adminUpdateScore on a closed round', () => {
    it('refuses a correction that changes the winner', async () => {
        const { service, matchRepo } = setup(closedMatch);

        await expect(service.adminUpdateScore('CODE', 'm1', 'pwd', 7, 13)).rejects.toBeInstanceOf(
            BadRequestException,
        );
        expect(matchRepo.update).not.toHaveBeenCalled();
    });

    it('accepts a correction that keeps the same winner', async () => {
        const { service, matchRepo } = setup(closedMatch);

        // The rest of the flow (ranking, broadcast) is out of the scope of this test.
        await service.adminUpdateScore('CODE', 'm1', 'pwd', 13, 9).catch(() => undefined);

        expect(matchRepo.update).toHaveBeenCalledWith(
            'm1',
            expect.objectContaining({ scoreA: 13, scoreB: 9 }),
        );
    });
});

describe('ScoreService.validateMatch against a stale score', () => {
    it('refuses to validate a score the player never saw', async () => {
        const matchRepo = {
            findByIdInTournament: vi.fn(async () => ({
                id: 'm1',
                status: MatchStatus.ENDED,
                scoreA: 13,
                scoreB: 9,
                teamA: { code: 'AAAA' },
                teamB: { code: 'BBBB' },
                session: { status: MatchesSessionStatus.OPEN },
            })),
            updateIfStatus: vi.fn(async () => true),
        };
        const service = new ScoreService(
            { findByCode: vi.fn(async () => ({ id: 'T1' })) } as never,
            matchRepo as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
        );

        await expect(
            service.validateMatch('CODE', 'm1', 'AAAA', 'BBBB', { scoreA: 12, scoreB: 9 }),
        ).rejects.toBeInstanceOf(ConflictException);
        expect(matchRepo.updateIfStatus).not.toHaveBeenCalled();
    });
});

describe('ScoreService.validateMatch racing a score change', () => {
    function setupRace(latestStatus: MatchStatus) {
        const read = {
            id: 'm1',
            status: MatchStatus.ENDED,
            scoreA: 13,
            scoreB: 9,
            teamA: { code: 'AAAA' },
            teamB: { code: 'BBBB' },
            session: { status: MatchesSessionStatus.OPEN },
        };
        const matchRepo = {
            findByIdInTournament: vi.fn(async () => read),
            updateIfStatus: vi.fn(async () => false),
            findByIdWithSession: vi.fn(async () => ({ ...read, scoreB: 10, status: latestStatus })),
        };
        return new ScoreService(
            { findByCode: vi.fn(async () => ({ id: 'T1' })) } as never,
            matchRepo as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
        );
    }

    it('refuses as stale a score changed between the read and the write', async () => {
        await expect(
            setupRace(MatchStatus.ENDED).validateMatch('CODE', 'm1', 'AAAA', 'BBBB', {
                scoreA: 13,
                scoreB: 9,
            }),
        ).rejects.toBeInstanceOf(ConflictException);
    });

    it('keeps the already validated message when the other team validated first', async () => {
        await expect(
            setupRace(MatchStatus.VALIDATED).validateMatch('CODE', 'm1', 'AAAA', 'BBBB', {
                scoreA: 13,
                scoreB: 9,
            }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });
});
