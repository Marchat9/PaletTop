import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { MatchStatus, MatchesSessionStatus } from 'src/enum/status.enum';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { ScoreService } from './score.service';

function setup(match: Partial<TournamentMatch>, drawnRound = true) {
    const matchRepo = {
        findByIdInTournament: vi.fn(async () => match),
        update: vi.fn(async () => undefined),
        updateIfStatus: vi.fn(async () => true),
    };
    const tournament = {
        id: 'T1',
        status: 'ACTIVE',
        configuration: { pointsPerGame: 13, competitionMode: 'standard' },
    };
    const tournamentAuthService = { findWithAdminAuth: vi.fn(async () => tournament) };
    const isDrawnSession = vi.fn(() => drawnRound);
    const strategyFactory = { create: vi.fn(() => ({ isDrawnSession })) };
    const service = new ScoreService(
        { findByCode: vi.fn(async () => tournament) } as never,
        matchRepo as never,
        {} as never,
        {} as never,
        {} as never,
        tournamentAuthService as never,
        {} as never,
        strategyFactory as never,
    );
    return { service, matchRepo, isDrawnSession };
}

const closedMatch: Partial<TournamentMatch> = {
    id: 'm1',
    scoreA: 13,
    scoreB: 7,
    isBye: false,
    status: MatchStatus.VALIDATED,
    session: {
        status: MatchesSessionStatus.CLOSED,
        sessionNumber: 2,
    } as TournamentMatch['session'],
};

describe('ScoreService.adminUpdateScore on a closed round', () => {
    it('accepts a correction that changes the winner of a drawn round', async () => {
        const { service, matchRepo, isDrawnSession } = setup(closedMatch, true);

        // The rest of the flow (ranking, broadcast) is out of the scope of this test.
        await service.adminUpdateScore('CODE', 'm1', 'pwd', 7, 13).catch(() => undefined);

        expect(isDrawnSession).toHaveBeenCalledWith(expect.objectContaining({ id: 'T1' }), 2);
        expect(matchRepo.update).toHaveBeenCalledWith(
            'm1',
            expect.objectContaining({ scoreA: 7, scoreB: 13 }),
        );
    });

    it('refuses any correction of a round built from earlier results (bracket, ranking round)', async () => {
        const { service, matchRepo } = setup(closedMatch, false);

        await expect(service.adminUpdateScore('CODE', 'm1', 'pwd', 13, 9)).rejects.toThrow(
            "Ce round n'est pas un tirage au sort",
        );
        expect(matchRepo.update).not.toHaveBeenCalled();
    });

    it("refuses to correct a bye's score", async () => {
        const { service, matchRepo } = setup({ ...closedMatch, isBye: true }, true);

        await expect(service.adminUpdateScore('CODE', 'm1', 'pwd', 13, 0)).rejects.toBeInstanceOf(
            BadRequestException,
        );
        expect(matchRepo.update).not.toHaveBeenCalled();
    });

    it('still refuses a score that is not final', async () => {
        const { service, matchRepo } = setup(closedMatch, true);

        await expect(service.adminUpdateScore('CODE', 'm1', 'pwd', 9, 7)).rejects.toThrow(
            'doit rester final',
        );
        expect(matchRepo.update).not.toHaveBeenCalled();
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

describe('ScoreService scores in an elimination session', () => {
    const eliminationMatch: Partial<TournamentMatch> = {
        id: 'm1',
        scoreA: 0,
        scoreB: 0,
        isBye: false,
        status: MatchStatus.ONGOING,
        startedAt: new Date(),
        teamA: { code: 'AAAA' } as TournamentMatch['teamA'],
        teamB: { code: 'BBBB' } as TournamentMatch['teamB'],
        session: {
            status: MatchesSessionStatus.OPEN,
            sessionNumber: 3,
        } as TournamentMatch['session'],
    };

    it('accepts an in-progress equal score from a team', async () => {
        const { service, matchRepo } = setup(eliminationMatch, false);

        await service.updateScore('CODE', 'm1', 'AAAA', 3, 3).catch(() => undefined);

        expect(matchRepo.updateIfStatus).toHaveBeenCalledWith(
            'm1',
            expect.anything(),
            expect.objectContaining({ scoreA: 3, scoreB: 3, status: MatchStatus.ONGOING }),
            null,
        );
    });

    it('accepts an in-progress equal score forced by the admin', async () => {
        const { service, matchRepo } = setup(eliminationMatch, false);

        await service.adminUpdateScore('CODE', 'm1', 'pwd', 3, 3).catch(() => undefined);

        expect(matchRepo.update).toHaveBeenCalledWith(
            'm1',
            expect.objectContaining({ scoreA: 3, scoreB: 3 }),
        );
    });

    it('refuses both teams at the maximum, from a team and from the admin', async () => {
        const { service, matchRepo } = setup(eliminationMatch, false);

        await expect(service.updateScore('CODE', 'm1', 'AAAA', 13, 13)).rejects.toBeInstanceOf(
            BadRequestException,
        );
        await expect(service.adminUpdateScore('CODE', 'm1', 'pwd', 13, 13)).rejects.toBeInstanceOf(
            BadRequestException,
        );
        expect(matchRepo.update).not.toHaveBeenCalled();
    });

    it('keeps the qualifying behaviour: equal in-progress score accepted, both at max refused', async () => {
        const qualifying = {
            ...eliminationMatch,
            session: { status: MatchesSessionStatus.OPEN, sessionNumber: 1 },
        } as Partial<TournamentMatch>;
        const { service, matchRepo } = setup(qualifying, true);

        await service.adminUpdateScore('CODE', 'm1', 'pwd', 4, 4).catch(() => undefined);
        expect(matchRepo.update).toHaveBeenCalledWith(
            'm1',
            expect.objectContaining({ scoreA: 4, scoreB: 4 }),
        );
        await expect(service.adminUpdateScore('CODE', 'm1', 'pwd', 13, 13)).rejects.toBeInstanceOf(
            BadRequestException,
        );
    });
});
