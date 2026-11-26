import { describe, expect, it } from 'vitest';
import {
    bracketKey,
    bracketLabel,
    challengeKey,
    challengeLabel,
    computeStructuredPlan,
} from './structured-plan';
import { PlanGroup, PlanRound, StructuredPlanInput, TournamentPlan } from './plan.types';

function input(overrides: Partial<StructuredPlanInput>): StructuredPlanInput {
    return {
        teamCount: 128,
        targetCount: 128,
        consolationCount: 2,
        numberOfQualifyingRounds: 4,
        hasChallenges: false,
        hasThirdPlaceMatch: false,
        eliminatedAfterQualifying: 0,
        maxConsolations: 4,
        thresholds: { okRatio: 0.9, warningRatio: 0.75 },
        ...overrides,
    };
}

/** Compact view of a round: `key start-end` per group. */
function plates(round: PlanRound): string[] {
    return round.groups.map((g) => `${g.key} ${g.plateStart}-${g.plateEnd}`);
}

function eliminationRound(plan: TournamentPlan, n: number): PlanRound {
    return plan.rounds.filter((r) => r.kind === 'elimination')[n - 1];
}

function warningCodes(plan: TournamentPlan): string[] {
    return plan.warnings.map((w) => w.code);
}

describe('keys and labels', () => {
    it('builds index-based keys', () => {
        expect(bracketKey(0)).toBe('principale');
        expect(bracketKey(2)).toBe('consolante_2');
        expect(challengeKey(0)).toBe('challenge_principale');
        expect(challengeKey(1)).toBe('challenge_consolante_1');
    });

    it('builds French labels', () => {
        expect(bracketLabel(0)).toBe('Principale');
        expect(bracketLabel(1)).toBe('Consolante A');
        expect(bracketLabel(26)).toBe('Consolante Z');
        expect(challengeLabel(0)).toBe('Challenge principale');
        expect(challengeLabel(1)).toBe('Challenge consolante A');
    });
});

describe('computeStructuredPlan', () => {
    describe('120 teams, target 120, 2 consolations, challenges and 3rd place', () => {
        const plan = computeStructuredPlan(
            input({
                teamCount: 120,
                targetCount: 120,
                hasChallenges: true,
                hasThirdPlaceMatch: true,
            }),
        );

        it('plays 4 qualifying rounds on plates 1-60', () => {
            const qualifying = plan.rounds.filter((r) => r.kind === 'qualifying');
            expect(qualifying).toHaveLength(4);
            expect(qualifying.map((r) => r.label)).toEqual([
                'Phase qualificative 1/4',
                'Phase qualificative 2/4',
                'Phase qualificative 3/4',
                'Phase qualificative 4/4',
            ]);
            for (const round of qualifying) {
                expect(round.groups).toHaveLength(1);
                expect(round.groups[0]).toMatchObject({
                    kind: 'qualifying',
                    teamCount: 120,
                    matchCount: 60,
                    byeCount: 0,
                    plateStart: 1,
                    plateEnd: 60,
                });
            }
        });

        it('matches the round-by-round example of the spec', () => {
            expect(plates(eliminationRound(plan, 1))).toEqual([
                'principale 1-32',
                'consolante_1 33-48',
                'consolante_2 49-56',
            ]);
            expect(plates(eliminationRound(plan, 2))).toEqual([
                'principale 1-16',
                'challenge_principale 17-32',
                'consolante_1 33-40',
                'challenge_consolante_1 41-48',
                'consolante_2 49-56',
                'challenge_consolante_2 57-60',
            ]);
            expect(plates(eliminationRound(plan, 3))).toEqual([
                'principale 1-8',
                'challenge_principale 9-16',
                'consolante_1 17-20',
                'challenge_consolante_1 21-24',
                'consolante_2 25-28',
                'challenge_consolante_2 29-30',
            ]);
            expect(plates(eliminationRound(plan, 4))).toEqual([
                'principale 1-4',
                'challenge_principale 5-8',
                'consolante_1 9-10',
                'challenge_consolante_1 11-12',
                'consolante_2 13-14',
                'challenge_consolante_2 15-15',
            ]);
            expect(plates(eliminationRound(plan, 5))).toEqual([
                'principale 1-2',
                'challenge_principale 3-4',
                'consolante_1 5-5',
                'challenge_consolante_1 6-6',
                'consolante_2 7-7',
            ]);
            expect(plates(eliminationRound(plan, 6))).toEqual([
                'principale 1-1',
                'third_place_match 2-2',
                'challenge_principale 3-3',
            ]);
        });

        it('fills the challenge of B with its first-round losers', () => {
            const challengeB = eliminationRound(plan, 2).groups.find(
                (g) => g.key === 'challenge_consolante_2',
            ) as PlanGroup;
            expect(challengeB).toMatchObject({
                kind: 'challenge',
                label: 'Challenge consolante B',
                teamCount: 8,
                matchCount: 4,
            });
        });

        it('labels the rounds', () => {
            expect(plan.totalRounds).toBe(10);
            expect(plan.rounds.map((r) => r.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
            expect(plan.rounds.slice(4).map((r) => r.label)).toEqual([
                'Élimination 1',
                'Élimination 2',
                'Élimination 3',
                'Quarts de finale',
                'Demi-finales',
                'Finale',
            ]);
            expect(eliminationRound(plan, 6).groups[1]).toMatchObject({
                kind: 'third_place',
                teamCount: 2,
                matchCount: 1,
            });
        });

        it('describes the brackets', () => {
            expect(plan.brackets).toEqual([
                {
                    key: 'principale',
                    label: 'Principale',
                    capacity: 64,
                    teamCount: 64,
                    fillRatio: 1,
                    fillLevel: 'ok',
                    extra: false,
                },
                {
                    key: 'consolante_1',
                    label: 'Consolante A',
                    capacity: 32,
                    teamCount: 32,
                    fillRatio: 1,
                    fillLevel: 'ok',
                    extra: false,
                },
                {
                    key: 'consolante_2',
                    label: 'Consolante B',
                    capacity: 32,
                    teamCount: 24,
                    fillRatio: 0.75,
                    fillLevel: 'mid',
                    extra: false,
                },
            ]);
            expect(plan.maxPlates).toBe(60);
            expect(warningCodes(plan)).toEqual(['MID_FILL']);
        });
    });

    it('needs no choice for the exact planned count', () => {
        const plan = computeStructuredPlan(input({ teamCount: 128, targetCount: 128 }));
        expect(plan.maxPlates).toBe(64);
        expect(plan.totalRounds).toBe(10);
        expect(plan.brackets.map((b) => b.fillLevel)).toEqual(['ok', 'ok', 'ok']);
        expect(plan.warnings).toEqual([]);
        expect(plan.options).toHaveLength(1);
        expect(plan.options[0]).toMatchObject({
            id: 'keep',
            recommended: true,
            consolationCount: 2,
            eliminatedAfterQualifying: 0,
        });
        expect(plan.options[0].plan.brackets).toEqual(plan.brackets);
    });

    describe('fewer teams than planned (117 for 128)', () => {
        const plan = computeStructuredPlan(input({ teamCount: 117, targetCount: 128 }));

        it('warns about the low fill of Consolante B', () => {
            expect(plan.brackets.map((b) => b.teamCount)).toEqual([64, 32, 21]);
            const low = plan.warnings.find((w) => w.code === 'LOW_FILL');
            expect(low).toEqual({
                code: 'LOW_FILL',
                level: 'warning',
                bracketKey: 'consolante_2',
                message: 'Consolante B : 21 équipes sur 32. 11 équipes exemptées au 1er tour.',
            });
        });

        it('offers to keep, recalculate or stop the last teams', () => {
            expect(plan.options.map((o) => o.id)).toEqual(['keep', 'recalculate', 'stop_last']);
            const [keep, recalculate, stopLast] = plan.options;
            expect(keep.recommended).toBe(false);
            expect(keep.plan.brackets).toEqual(plan.brackets);
            expect(recalculate.consolationCount).toBe(1);
            expect(recalculate.plan.brackets.map((b) => [b.teamCount, b.capacity])).toEqual([
                [64, 64],
                [53, 64],
            ]);
            expect(stopLast.eliminatedAfterQualifying).toBe(5);
            expect(stopLast.consolationCount).toBe(2);
            expect(stopLast.label).toBe('Arrêter les 5 derniers après les qualifs');
            expect(stopLast.plan.teamCount).toBe(112);
            expect(stopLast.plan.eliminatedAfterQualifying).toBe(5);
            expect(stopLast.plan.brackets.map((b) => b.fillLevel)).toEqual(['ok', 'ok', 'ok']);
        });

        it('keeps every registered team in the qualifiers of the stop_last plan', () => {
            const stopLast = plan.options[2].plan;
            const qualifying = stopLast.rounds[0];
            expect(qualifying.groups[0]).toMatchObject({
                teamCount: 117,
                matchCount: 58,
                byeCount: 1,
            });
        });

        it('does not nest options', () => {
            for (const option of plan.options) {
                expect((option.plan as TournamentPlan).options).toEqual([]);
            }
        });
    });

    describe('more teams than planned (136 for 128)', () => {
        const plan = computeStructuredPlan(input({ teamCount: 136, targetCount: 128 }));

        it('adds an extra consolation for the surplus', () => {
            expect(plan.brackets.map((b) => [b.key, b.teamCount, b.capacity, b.extra])).toEqual([
                ['principale', 64, 64, false],
                ['consolante_1', 32, 32, false],
                ['consolante_2', 32, 32, false],
                ['consolante_3', 8, 8, true],
            ]);
            expect(plan.brackets[3].label).toBe('Consolante C');
            expect(warningCodes(plan)).toEqual(['EXTRA_BRACKET']);
        });

        it('recommends the extra consolation', () => {
            expect(plan.options.map((o) => o.id)).toEqual([
                'add_consolation',
                'recalculate',
                'stop_last',
            ]);
            const [add, recalculate, stopLast] = plan.options;
            expect(add.recommended).toBe(true);
            expect(add.consolationCount).toBe(3);
            expect(add.plan.brackets).toHaveLength(4);
            expect(recalculate.recommended).toBe(false);
            expect(recalculate.consolationCount).toBe(2);
            expect(recalculate.plan.brackets.map((b) => b.capacity)).toEqual([64, 64, 8]);
            expect(stopLast.eliminatedAfterQualifying).toBe(8);
            expect(stopLast.plan.teamCount).toBe(128);
            expect(stopLast.plan.brackets.map((b) => b.capacity)).toEqual([64, 32, 32]);
        });
    });

    it('re-splits when the maximum of consolations is reached', () => {
        const plan = computeStructuredPlan(
            input({ teamCount: 136, targetCount: 128, maxConsolations: 2 }),
        );
        expect(plan.brackets.map((b) => b.capacity)).toEqual([64, 64, 8]);
        expect(plan.warnings[0].code).toBe('EXTRA_BRACKET');
        expect(plan.options.map((o) => o.id)).toEqual(['keep', 'stop_last']);
    });

    it('never builds an extra consolation bigger than the main bracket', () => {
        const plan = computeStructuredPlan(input({ teamCount: 250, targetCount: 128 }));
        expect(plan.brackets.map((b) => [b.capacity, b.teamCount, b.extra])).toEqual([
            [128, 128, false],
            [64, 64, false],
            [64, 58, false],
        ]);
        const warning = plan.warnings.find((w) => w.code === 'EXTRA_BRACKET');
        expect(warning?.message).toContain('plus grande que le tableau principal');
        expect(plan.options.map((o) => o.id)).toEqual(['keep', 'stop_last']);
        expect(plan.options[1].eliminatedAfterQualifying).toBe(122);
    });

    it('reports a lone surplus team', () => {
        const plan = computeStructuredPlan(input({ teamCount: 129, targetCount: 128 }));
        expect(warningCodes(plan)).toContain('BRACKET_TOO_SMALL');
        expect(plan.options.map((o) => o.id)).toContain('stop_last');
    });

    describe('impossible configurations', () => {
        it('reports 3 teams on 2 brackets without throwing', () => {
            const plan = computeStructuredPlan(
                input({ teamCount: 3, targetCount: 3, consolationCount: 1 }),
            );
            expect(warningCodes(plan)).toEqual(['IMPOSSIBLE']);
            expect(plan.warnings[0].level).toBe('error');
            expect(plan.warnings[0].validConsolationCounts).toEqual([0]);
            expect(plan.brackets).toEqual([]);
            expect(plan.rounds).toEqual([]);
            expect(plan.comfort).toBeNull();
        });

        it('reports a single team', () => {
            const plan = computeStructuredPlan(
                input({ teamCount: 1, targetCount: 8, consolationCount: 0 }),
            );
            expect(warningCodes(plan)).toEqual(['IMPOSSIBLE']);
            expect(plan.warnings[0].validConsolationCounts).toEqual([]);
            expect(plan.brackets).toEqual([]);
            expect(plan.comfort).toBeNull();
        });

        it('proposes recalculating with fewer brackets', () => {
            const plan = computeStructuredPlan(
                input({ teamCount: 3, targetCount: 64, consolationCount: 1 }),
            );
            expect(plan.options.map((o) => o.id)).toEqual(['keep', 'recalculate']);
            expect(plan.options[1].plan.brackets.map((b) => b.capacity)).toEqual([4]);
        });
    });

    describe('main bracket of 4 with challenges and a 3rd place match', () => {
        const plan = computeStructuredPlan(
            input({
                teamCount: 4,
                targetCount: 4,
                consolationCount: 0,
                hasChallenges: true,
                hasThirdPlaceMatch: true,
            }),
        );

        it('keeps the 3rd place match but drops the main challenge: they would use the same two teams', () => {
            const keys = plan.rounds.flatMap((round) => round.groups.map((group) => group.key));
            expect(keys).toContain('third_place_match');
            expect(keys).not.toContain('challenge_principale');
        });

        it('says why the challenge is missing', () => {
            const warning = plan.warnings.find(
                (w) => w.code === 'BRACKET_TOO_SMALL' && w.bracketKey === 'challenge_principale',
            );
            expect(warning?.message).toContain('match pour la 3e place');
        });

        it('has no group twice in the same round for the same teams: the last round holds 2 matches', () => {
            const last = plan.rounds[plan.rounds.length - 1];
            expect(last.groups.map((g) => g.key)).toEqual(['principale', 'third_place_match']);
        });
    });

    it('still gives a challenge to a main bracket of 4 without a 3rd place match', () => {
        const plan = computeStructuredPlan(
            input({
                teamCount: 4,
                targetCount: 4,
                consolationCount: 0,
                hasChallenges: true,
                hasThirdPlaceMatch: false,
            }),
        );
        const keys = plan.rounds.flatMap((round) => round.groups.map((group) => group.key));
        expect(keys).toContain('challenge_principale');
    });

    describe('small brackets', () => {
        const plan = computeStructuredPlan(
            input({
                teamCount: 4,
                targetCount: 4,
                consolationCount: 1,
                hasChallenges: true,
                hasThirdPlaceMatch: true,
            }),
        );

        it('has no 3rd place match with a main bracket of capacity 2', () => {
            expect(plan.brackets.map((b) => b.capacity)).toEqual([2, 2]);
            expect(warningCodes(plan)).toContain('NO_THIRD_PLACE');
        });

        it('gives no challenge to a bracket of capacity 2', () => {
            const keys = plan.rounds.flatMap((r) => r.groups.map((g) => g.key));
            expect(keys.some((k) => k.startsWith('challenge') || k === 'third_place_match')).toBe(
                false,
            );
            expect(plan.totalRounds).toBe(5);
        });
    });

    it('has a 3rd place match with a main bracket of capacity 4', () => {
        const plan = computeStructuredPlan(
            input({
                teamCount: 4,
                targetCount: 4,
                consolationCount: 0,
                hasThirdPlaceMatch: true,
            }),
        );
        expect(warningCodes(plan)).toEqual([]);
        expect(plates(eliminationRound(plan, 2))).toEqual([
            'principale 1-1',
            'third_place_match 2-2',
        ]);
    });

    describe('comfort range', () => {
        it('explains the target layout in plain words', () => {
            const plan = computeStructuredPlan(input({ teamCount: 117, targetCount: 128 }));
            expect(plan.comfort).toEqual({
                optimalCount: 128,
                okFrom: 120,
                text:
                    'Configuration optimale : 128 équipes (chaque tableau est une puissance de 2 : 64 + 32 + 32). ' +
                    'De 120 à 127 équipes, les tableaux restent les mêmes : la consolante B a des équipes exemptées au 1er tour. ' +
                    "En dessous de 120, la consolante B serait trop peu remplie : l'app vous proposera une autre configuration. " +
                    'Au-delà de 128, les équipes en plus forment une consolante C.',
            });
        });

        it('adapts the text to a single bracket and no room for an extra one', () => {
            const plan = computeStructuredPlan(
                input({ teamCount: 64, targetCount: 64, consolationCount: 0, maxConsolations: 0 }),
            );
            expect(plan.comfort?.text).toBe(
                'Configuration optimale : 64 équipes (le tableau est une puissance de 2 : 64). ' +
                    'De 48 à 63 équipes, le tableau reste le même : des équipes sont exemptées au 1er tour. ' +
                    "En dessous de 48, le tableau principal serait trop peu rempli : l'app vous proposera une autre configuration. " +
                    "Au-delà de 64, il n'y a plus de place pour une consolante : les équipes sont réparties autrement.",
            );
        });
    });
});
