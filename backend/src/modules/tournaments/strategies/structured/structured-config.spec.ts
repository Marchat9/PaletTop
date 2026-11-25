import { describe, expect, it } from 'vitest';
import { StructuredCompetitionConfiguration } from 'src/entities/tournament-competition-configuration.entity';
import { Tournament } from 'src/entities/tournament.entity';
import { TournamentStatus } from 'src/enum/status.enum';
import { CompetitionMode, PairingMode, ScoreCalculation } from 'src/enum/tounament.enum';
import { TournamentConfigurationDto } from '../../dto/tournament-configuration.dto';
import { extractCompetitionConfiguration } from '../../utils/tournament.utils';
import { PlanSettings } from '../tournament-strategy.abstract';
import { TournamentStrategyFactory } from '../tournament-strategy.factory';
import { TournamentPlan } from './plan/plan.types';
import { StructuredTournamentStrategy } from './structured-tournament.strategy';

const settings: PlanSettings = {
    maxConsolations: 4,
    thresholds: { okRatio: 0.9, warningRatio: 0.75 },
};

const factory = new TournamentStrategyFactory({} as never, {} as never, {} as never, {} as never);
const strategy = factory.create(CompetitionMode.STANDARD);

function structuredConfig(
    overrides: Partial<StructuredCompetitionConfiguration> = {},
): StructuredCompetitionConfiguration {
    return {
        numberOfQualifyingRounds: 4,
        consolationCount: 1,
        hasChallenges: false,
        hasThirdPlaceMatch: false,
        ...overrides,
    };
}

function tournament(
    config: StructuredCompetitionConfiguration,
    options: { status?: TournamentStatus; maxTeamCapacity?: number; teamCount?: number } = {},
): Tournament {
    return {
        code: 'OPEN',
        status: options.status ?? TournamentStatus.DRAFT,
        teams: Array.from({ length: options.teamCount ?? 0 }, (_, i) => ({ id: `team-${i}` })),
        configuration: {
            maxTeamCapacity: options.maxTeamCapacity ?? 16,
            scoreCalculation: ScoreCalculation.VICTORY_GOAL_AVERAGE,
            pointsPerGame: 13,
            competitionMode: CompetitionMode.STANDARD,
            competitionConfiguration: config,
        },
    } as unknown as Tournament;
}

describe('StructuredTournamentStrategy configuration', () => {
    it('is the strategy built for the standard mode, with a soft team capacity', () => {
        expect(strategy).toBeInstanceOf(StructuredTournamentStrategy);
        expect(strategy.isTeamCapacityHard()).toBe(false);
    });

    it('keeps a hard team capacity and no plan for the other modes', () => {
        for (const mode of [CompetitionMode.UP_DOWN, CompetitionMode.CHAMPIONSHIP]) {
            const other = factory.create(mode);
            expect(other.isTeamCapacityHard()).toBe(true);
            expect(other.computePlan(tournament(structuredConfig()), 8, settings)).toBeNull();
        }
    });

    describe('computePlan', () => {
        it('computes the plan of a draft with the target team count', () => {
            const plan = strategy.computePlan(
                tournament(structuredConfig({ consolationCount: 1 }), { maxTeamCapacity: 16 }),
                16,
                settings,
            )!;
            expect(plan.teamCount).toBe(16);
            expect(plan.brackets.map((b) => b.capacity)).toEqual([8, 8]);
            expect(plan.warnings).toEqual([]);
        });

        // Review focus: a team removed after the configuration was saved must not break the page.
        it('returns an IMPOSSIBLE warning instead of throwing when the count no longer fits', () => {
            const draft = tournament(structuredConfig({ consolationCount: 3 }), {
                maxTeamCapacity: 32,
                teamCount: 7,
            });
            const plan = strategy.computePlan(draft, 7, settings)!;
            expect(plan.warnings.map((w) => w.code)).toContain('IMPOSSIBLE');
        });

        it.each([
            ['no team registered yet', 0, 3, 16],
            ['a single team', 1, 1, 16],
            ['a target smaller than the brackets', 6, 3, 2],
            ['more consolations than the setting now allows', 20, 6, 32],
        ])('does not throw with %s', (_label, teamCount, consolationCount, maxTeamCapacity) => {
            const draft = tournament(structuredConfig({ consolationCount }), { maxTeamCapacity });
            expect(() => strategy.computePlan(draft, teamCount, settings)).not.toThrow();
        });

        it('exposes the frozen plan once the tournament has started, without recomputing', () => {
            const frozen = {
                teamCount: 99,
                eliminatedAfterQualifying: 0,
                brackets: [],
                rounds: [],
                totalRounds: 7,
                maxPlates: 1,
                warnings: [],
                comfort: null,
            } as Omit<TournamentPlan, 'options'>;
            const active = tournament(structuredConfig({ plan: frozen }), {
                status: TournamentStatus.ACTIVE,
            });
            expect(strategy.computePlan(active, 12, settings)).toEqual({ ...frozen, options: [] });
        });

        it('has no plan for a started tournament without a frozen one', () => {
            const active = tournament(structuredConfig(), { status: TournamentStatus.ACTIVE });
            expect(strategy.computePlan(active, 12, settings)).toBeNull();
        });
    });

    describe('extractCompetitionConfiguration', () => {
        it('keeps only the configuration fields, never the ones written at launch', () => {
            const input = {
                maxTeamCapacity: 16,
                competitionMode: CompetitionMode.STANDARD,
                competitionConfiguration: {
                    ...structuredConfig({ consolationCount: 2, hasChallenges: true }),
                    eliminatedAfterQualifying: 3,
                    plan: { teamCount: 8 },
                    hasConsolanteTable: true,
                },
            } as unknown as TournamentConfigurationDto;

            expect(extractCompetitionConfiguration(input)).toEqual({
                numberOfQualifyingRounds: 4,
                consolationCount: 2,
                hasChallenges: true,
                hasThirdPlaceMatch: false,
                eliminationPairingMode: 'random',
            });
        });

        it('keeps the elimination pairing mode, random when missing', () => {
            const extract = (competitionConfiguration: object): unknown =>
                extractCompetitionConfiguration({
                    competitionMode: CompetitionMode.STANDARD,
                    competitionConfiguration,
                } as unknown as TournamentConfigurationDto);

            expect(
                extract(structuredConfig({ eliminationPairingMode: PairingMode.DUTCH })),
            ).toMatchObject({
                eliminationPairingMode: 'dutch',
            });
            expect(extract(structuredConfig())).toMatchObject({
                eliminationPairingMode: 'random',
            });
        });
    });
});
