import { describe, expect, it, vi } from 'vitest';
import { Tournament } from 'src/entities/tournament.entity';
import { AppSettingKey } from 'src/enum/app-setting.enum';
import { TournamentStatus } from 'src/enum/status.enum';
import { CompetitionMode } from 'src/enum/tounament.enum';
import { TournamentStrategyFactory } from '../strategies/tournament-strategy.factory';
import { TournamentPlanService } from './tournament-plan.service';

function setup() {
    const appSettings = {
        get: vi.fn(async (key: AppSettingKey) =>
            key === AppSettingKey.MAX_CONSOLATION_COUNT ? 4 : { okRatio: 0.9, warningRatio: 0.75 },
        ),
    };
    const factory = new TournamentStrategyFactory(
        {} as never,
        {} as never,
        {} as never,
        {} as never,
    );
    return { service: new TournamentPlanService(appSettings as never, factory), appSettings };
}

function draft(competitionMode: CompetitionMode, teamCount: number, consolationCount: number) {
    return {
        code: 'OPEN',
        status: TournamentStatus.DRAFT,
        teams: Array.from({ length: teamCount }, (_, i) => ({ id: `t${i}` })),
        configuration: {
            maxTeamCapacity: 32,
            competitionMode,
            competitionConfiguration: {
                numberOfQualifyingRounds: 4,
                consolationCount,
                hasChallenges: false,
                hasThirdPlaceMatch: false,
            },
        },
    } as unknown as Tournament;
}

describe('TournamentPlanService.buildPlan', () => {
    it('computes a draft plan with the registered teams and the settings', async () => {
        const { service, appSettings } = setup();
        const plan = await service.buildPlan(draft(CompetitionMode.STANDARD, 24, 1));

        expect(plan?.teamCount).toBe(24);
        expect(appSettings.get).toHaveBeenCalledWith(AppSettingKey.MAX_CONSOLATION_COUNT);
        expect(appSettings.get).toHaveBeenCalledWith(AppSettingKey.BRACKET_FILL_THRESHOLDS);
    });

    // Review focus: teams removed after the configuration was saved, the admin page still loads.
    it('reports a consolation count that no longer fits as a warning', async () => {
        const { service } = setup();
        const plan = await service.buildPlan(draft(CompetitionMode.STANDARD, 7, 3));

        expect(plan?.warnings.map((w) => w.code)).toContain('IMPOSSIBLE');
    });

    it('has no plan for the modes without one', async () => {
        const { service } = setup();
        expect(await service.buildPlan(draft(CompetitionMode.UP_DOWN, 8, 0))).toBeNull();
    });
});
