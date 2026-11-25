import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { StructuredCompetitionConfiguration } from 'src/entities/tournament-competition-configuration.entity';
import { Tournament } from 'src/entities/tournament.entity';
import { TournamentStatus } from 'src/enum/status.enum';
import { CompetitionMode } from 'src/enum/tounament.enum';
import { PlanSettings, StartChoice } from '../tournament-strategy.abstract';
import { TournamentStrategyFactory } from '../tournament-strategy.factory';
import { StructuredPlanInput } from './plan/plan.types';
import { computeStructuredPlan } from './plan/structured-plan';

const settings: PlanSettings = {
    maxConsolations: 4,
    thresholds: { okRatio: 0.9, warningRatio: 0.75 },
};

/** 136 teams registered for a 128-team target (64 · 32 · 32): 8 teams more than planned. */
const planInput: StructuredPlanInput = {
    teamCount: 136,
    targetCount: 128,
    consolationCount: 2,
    numberOfQualifyingRounds: 4,
    hasChallenges: true,
    hasThirdPlaceMatch: true,
    eliminatedAfterQualifying: 0,
    maxConsolations: settings.maxConsolations,
    thresholds: settings.thresholds,
};

function setup() {
    const tournamentRepo = { save: vi.fn(async (t: Tournament) => t) };
    const factory = new TournamentStrategyFactory(
        {} as never,
        {} as never,
        {} as never,
        tournamentRepo as never,
    );
    const strategy = factory.create(CompetitionMode.STANDARD);
    const tournament = {
        code: 'OPEN',
        status: TournamentStatus.ACTIVE,
        teams: Array.from({ length: planInput.teamCount }, (_, i) => ({ id: `team-${i}` })),
        configuration: {
            maxTeamCapacity: planInput.targetCount,
            competitionMode: CompetitionMode.STANDARD,
            competitionConfiguration: {
                numberOfQualifyingRounds: planInput.numberOfQualifyingRounds,
                consolationCount: planInput.consolationCount,
                hasChallenges: planInput.hasChallenges,
                hasThirdPlaceMatch: planInput.hasThirdPlaceMatch,
            },
        },
    } as unknown as Tournament;

    const start = async (choice: StartChoice): Promise<StructuredCompetitionConfiguration> => {
        const saved = await strategy.prepareTournamentStart(tournament, { settings, choice });
        return saved.configuration.competitionConfiguration as StructuredCompetitionConfiguration;
    };
    return { start, tournamentRepo };
}

describe('StructuredTournamentStrategy.prepareTournamentStart', () => {
    const offered = computeStructuredPlan(planInput).options;

    it('freezes the plan of the launch option the admin confirmed', async () => {
        const { start } = setup();
        const addConsolation = offered.find((o) => o.id === 'add_consolation')!;

        const config = await start({ consolationCount: 3, eliminatedAfterQualifying: 0 });

        expect(addConsolation.consolationCount).toBe(3);
        expect(config.consolationCount).toBe(3);
        expect(config.plan).toEqual({ ...addConsolation.plan, options: undefined });
        expect(config.plan!.brackets.length).toBe(4);
        expect(config.plan!.brackets[3].extra).toBe(true);
    });

    // The « recalculate » option was computed for a 136-team target: recomputing it from the
    // stored 128-team target would bring the extra consolation back.
    it('freezes an option that recomputation from the stored target cannot reproduce', async () => {
        const { start } = setup();
        const recalculate = offered.find((o) => o.id === 'recalculate')!;

        const config = await start({ consolationCount: 2, eliminatedAfterQualifying: 0 });

        expect(config.plan!.brackets).toEqual(recalculate.plan.brackets);
        expect(config.plan!.brackets.some((b) => b.extra)).toBe(false);
        expect(config.plan!.brackets.length).toBe(3);
    });

    it('recomputes with the stored target a choice that matches no option', async () => {
        const { start } = setup();
        const choice = { consolationCount: 1, eliminatedAfterQualifying: 0 };
        expect(
            offered.some(
                (o) =>
                    o.consolationCount === choice.consolationCount &&
                    o.eliminatedAfterQualifying === choice.eliminatedAfterQualifying,
            ),
        ).toBe(false);

        const config = await start(choice);

        const { options: _options, ...expected } = computeStructuredPlan({
            ...planInput,
            ...choice,
        });
        expect(config.consolationCount).toBe(1);
        expect(config.plan).toEqual(expected);
    });

    it('refuses more consolations than the setting allows', async () => {
        const { start, tournamentRepo } = setup();

        await expect(start({ consolationCount: 5 })).rejects.toThrow(BadRequestException);
        expect(tournamentRepo.save).not.toHaveBeenCalled();
    });
});
