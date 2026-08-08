import { describe, expect, it } from 'vitest';
import { ConstraintLevel } from 'src/enum/constraint-level.enum';
import { ConstraintConfig } from 'src/model/constraint.model';
import { buildConstraintLadder } from './constraint.utils';

const ALL_LEVELS = [
    ConstraintLevel.NO_SAME_CLUB,
    ConstraintLevel.NO_PARTIAL_SAME_CLUB,
    ConstraintLevel.NO_REMATCH_NO_SAME_CLUB,
    ConstraintLevel.NO_REMATCH_NO_PARTIAL_SAME_CLUB,
    ConstraintLevel.NO_REMATCH,
    ConstraintLevel.NO_CONTRAINTE,
];

function config(overrides: Partial<ConstraintConfig>): ConstraintConfig {
    return {
        allowMatchAgainstFullSameClub: false,
        allowMatchAgainstPartialSameClub: false,
        allowRematch: false,
        ...overrides,
    };
}

describe('buildConstraintLadder', () => {
    it('always returns every constraint level exactly once, regardless of config', () => {
        const combos: ConstraintConfig[] = [];
        for (const full of [true, false]) {
            for (const partial of [true, false]) {
                for (const rematch of [true, false]) {
                    combos.push(
                        config({
                            allowMatchAgainstFullSameClub: full,
                            allowMatchAgainstPartialSameClub: partial,
                            allowRematch: rematch,
                        }),
                    );
                }
            }
        }

        for (const c of combos) {
            const ladder = buildConstraintLadder(c);
            expect([...ladder].sort()).toEqual([...ALL_LEVELS].sort());
        }
    });

    it('always ends with NO_CONTRAINTE as the last-resort fallback', () => {
        const combos: ConstraintConfig[] = [
            config({}),
            config({ allowRematch: true }),
            config({ allowMatchAgainstFullSameClub: true }),
            config({ allowMatchAgainstPartialSameClub: true }),
            config({
                allowMatchAgainstFullSameClub: true,
                allowMatchAgainstPartialSameClub: true,
                allowRematch: true,
            }),
        ];

        for (const c of combos) {
            const ladder = buildConstraintLadder(c);
            expect(ladder.at(-1)).toBe(ConstraintLevel.NO_CONTRAINTE);
        }
    });

    it('when everything is disallowed (strictest, default config), tries the fully-compliant level first, then relaxes club before rematch', () => {
        const ladder = buildConstraintLadder(config({}));

        expect(ladder).toEqual([
            ConstraintLevel.NO_REMATCH_NO_PARTIAL_SAME_CLUB,
            ConstraintLevel.NO_REMATCH_NO_SAME_CLUB,
            ConstraintLevel.NO_REMATCH,
            ConstraintLevel.NO_PARTIAL_SAME_CLUB,
            ConstraintLevel.NO_SAME_CLUB,
            ConstraintLevel.NO_CONTRAINTE,
        ]);
    });

    it('when everything is allowed, still prefers stricter levels first as a soft preference', () => {
        const ladder = buildConstraintLadder(
            config({
                allowMatchAgainstFullSameClub: true,
                allowMatchAgainstPartialSameClub: true,
                allowRematch: true,
            }),
        );

        expect(ladder).toEqual([
            ConstraintLevel.NO_REMATCH_NO_PARTIAL_SAME_CLUB,
            ConstraintLevel.NO_REMATCH_NO_SAME_CLUB,
            ConstraintLevel.NO_REMATCH,
            ConstraintLevel.NO_PARTIAL_SAME_CLUB,
            ConstraintLevel.NO_SAME_CLUB,
            ConstraintLevel.NO_CONTRAINTE,
        ]);
    });

    it('partial club disallowed but rematch allowed: club-compliant levels come first, ordered by strictness', () => {
        const ladder = buildConstraintLadder(
            config({
                allowMatchAgainstFullSameClub: true,
                allowMatchAgainstPartialSameClub: false,
                allowRematch: true,
            }),
        );

        expect(ladder).toEqual([
            ConstraintLevel.NO_REMATCH_NO_PARTIAL_SAME_CLUB,
            ConstraintLevel.NO_PARTIAL_SAME_CLUB,
            ConstraintLevel.NO_REMATCH_NO_SAME_CLUB,
            ConstraintLevel.NO_REMATCH,
            ConstraintLevel.NO_SAME_CLUB,
            ConstraintLevel.NO_CONTRAINTE,
        ]);
    });

    it('rematch disallowed but club fully allowed: rematch-compliant levels come first, ordered by strictness', () => {
        const ladder = buildConstraintLadder(
            config({
                allowMatchAgainstFullSameClub: true,
                allowMatchAgainstPartialSameClub: true,
                allowRematch: false,
            }),
        );

        expect(ladder).toEqual([
            ConstraintLevel.NO_REMATCH_NO_PARTIAL_SAME_CLUB,
            ConstraintLevel.NO_REMATCH_NO_SAME_CLUB,
            ConstraintLevel.NO_REMATCH,
            ConstraintLevel.NO_PARTIAL_SAME_CLUB,
            ConstraintLevel.NO_SAME_CLUB,
            ConstraintLevel.NO_CONTRAINTE,
        ]);
    });

    it('only full club match disallowed (partial and rematch allowed): both full-club-compliant levels come first', () => {
        const ladder = buildConstraintLadder(
            config({
                allowMatchAgainstFullSameClub: false,
                allowMatchAgainstPartialSameClub: true,
                allowRematch: true,
            }),
        );

        // NO_PARTIAL_SAME_CLUB/NO_REMATCH_NO_PARTIAL_SAME_CLUB also satisfy "at least full club check",
        // since forbidding a partial overlap forbids a full-club match too.
        expect(ladder).toEqual([
            ConstraintLevel.NO_REMATCH_NO_PARTIAL_SAME_CLUB,
            ConstraintLevel.NO_REMATCH_NO_SAME_CLUB,
            ConstraintLevel.NO_PARTIAL_SAME_CLUB,
            ConstraintLevel.NO_SAME_CLUB,
            ConstraintLevel.NO_REMATCH,
            ConstraintLevel.NO_CONTRAINTE,
        ]);
    });
});
