import { describe, expect, it, vi } from 'vitest';
import { TrainingRound } from 'src/entities/training-round.entity';
import { MatchStatus } from 'src/enum/status.enum';
import { TrainingRoundStatus } from 'src/enum/training.enum';
import { TrainingAutoCloseService } from './training-auto-close.service';

function round(statuses: MatchStatus[], status = TrainingRoundStatus.OPEN): TrainingRound {
    return {
        id: 'round-1',
        roundNumber: 1,
        status,
        matches: statuses.map((matchStatus) => ({ isBye: false, status: matchStatus })),
    } as unknown as TrainingRound;
}

function makeService(latestRound: TrainingRound | null) {
    const sessionRepo = {
        findExpiredOpen: vi.fn(() => Promise.resolve([{ id: 's1', code: '123456' }])),
        closeMany: vi.fn(() => Promise.resolve()),
        findAllByIdsWithRelations: vi.fn(() => Promise.resolve([])),
    };
    const roundRepo = {
        findLatestBySession: vi.fn(() => Promise.resolve(latestRound)),
        closeRound: vi.fn(() => Promise.resolve()),
    };
    const service = new TrainingAutoCloseService(
        {
            getOrThrow: vi.fn(() => ({ enabled: false, cronExpression: '', idleHours: 24 })),
        } as never,
        {} as never,
        sessionRepo as never,
        { emitSessionUpdatedFrom: vi.fn() } as never,
        roundRepo as never,
    );
    return { service, sessionRepo, roundRepo };
}

describe('TrainingAutoCloseService', () => {
    it('closes the round in progress with the idle session when all its matches are validated', async () => {
        const { service, sessionRepo, roundRepo } = makeService(
            round([MatchStatus.VALIDATED, MatchStatus.VALIDATED]),
        );

        await service.runAutoClose();

        expect(sessionRepo.closeMany).toHaveBeenCalledWith(['s1']);
        expect(roundRepo.closeRound).toHaveBeenCalledWith('round-1');
    });

    it('leaves the session and its round open while a match is not validated', async () => {
        const { service, sessionRepo, roundRepo } = makeService(
            round([MatchStatus.VALIDATED, MatchStatus.ENDED]),
        );

        await service.runAutoClose();

        expect(sessionRepo.closeMany).not.toHaveBeenCalled();
        expect(roundRepo.closeRound).not.toHaveBeenCalled();
    });

    it('closes the session when all its rounds are already closed', async () => {
        const { service, sessionRepo, roundRepo } = makeService(
            round([MatchStatus.VALIDATED], TrainingRoundStatus.CLOSED),
        );

        await service.runAutoClose();

        expect(sessionRepo.closeMany).toHaveBeenCalledWith(['s1']);
        expect(roundRepo.closeRound).not.toHaveBeenCalled();
    });

    it('closes a session without round', async () => {
        const { service, sessionRepo, roundRepo } = makeService(null);

        await service.runAutoClose();

        expect(sessionRepo.closeMany).toHaveBeenCalledWith(['s1']);
        expect(roundRepo.closeRound).not.toHaveBeenCalled();
    });
});
