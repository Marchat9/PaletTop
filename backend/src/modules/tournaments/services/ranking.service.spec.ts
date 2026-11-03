import { NotFoundException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeGateway } from 'src/modules/realtime/realtime.gateway';
import { TournamentRepository } from '../repositories/tournament.repository';
import { SessionRepository } from '../repositories/session.repository';
import { TournamentStrategyFactory } from '../strategies/tournament-strategy.factory';
import { RankingService } from './ranking.service';

describe('RankingService.scheduleRankingUpdate', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('logs a failing ranking update instead of leaving an unhandled rejection', async () => {
        const tournamentRepo = {
            findWithRelations: vi.fn().mockResolvedValue(null),
        } as unknown as TournamentRepository;
        const gateway = { emitRankingUpdated: vi.fn() } as unknown as RealtimeGateway;
        const service = new RankingService(
            tournamentRepo,
            {} as SessionRepository,
            gateway,
            {} as TournamentStrategyFactory,
        );
        const getRanking = vi
            .spyOn(service, 'getGlobalRanking')
            .mockRejectedValue(new NotFoundException('Tournoi introuvable'));
        const onUnhandled = vi.fn();
        process.on('unhandledRejection', onUnhandled);

        service.scheduleRankingUpdate('GONE');
        await vi.runAllTimersAsync();
        await Promise.resolve();
        process.off('unhandledRejection', onUnhandled);

        expect(getRanking).toHaveBeenCalledWith('GONE');
        expect(gateway.emitRankingUpdated).not.toHaveBeenCalled();
        expect(onUnhandled).not.toHaveBeenCalled();
    });
});
