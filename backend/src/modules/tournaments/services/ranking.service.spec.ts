import { NotFoundException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
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

describe('RankingService.getPlayerTeam', () => {
    const tournament = {
        id: 'T1',
        configuration: { competitionMode: 'standard' },
        teams: [{ id: 'team-1', code: 'AAA', name: 'Les Rouges', players: [] }],
    };

    function build(status: object): { service: RankingService; computeTeamStatus: Mock } {
        const computeTeamStatus = vi.fn().mockReturnValue(status);
        const service = new RankingService(
            { findWithRelations: vi.fn().mockResolvedValue(tournament) } as never,
            { findAllByTournament: vi.fn().mockResolvedValue([{ matches: [] }]) } as never,
            {} as RealtimeGateway,
            { create: vi.fn().mockReturnValue({ computeTeamStatus }) } as never,
        );
        return { service, computeTeamStatus };
    }

    it('adds the team status computed by the strategy to the team', async () => {
        const { service, computeTeamStatus } = build({
            eliminatedAfterQualifying: false,
        });

        const team = await service.getPlayerTeam('TRN', 'AAA');

        expect(team).toMatchObject({
            id: 'team-1',
            name: 'Les Rouges',
            eliminatedAfterQualifying: false,
        });
        expect(computeTeamStatus).toHaveBeenCalledWith(tournament, [], 'team-1');
    });

    it('refuses an unknown team code', async () => {
        const { service } = build({ eliminatedAfterQualifying: false });

        await expect(service.getPlayerTeam('TRN', 'ZZZ')).rejects.toBeInstanceOf(NotFoundException);
    });
});
