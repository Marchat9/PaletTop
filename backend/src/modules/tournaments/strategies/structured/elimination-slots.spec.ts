import { describe, expect, it } from 'vitest';
import { Team } from 'src/entities/team.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { EliminationSeeding } from 'src/enum/tounament.enum';
import { ConstraintConfig } from 'src/model/constraint.model';
import { GlobalRankingEntry } from '../../responses/ranking.dto';
import { BracketSlot } from './bracket/bracket.utils';
import { EliminationContext, EliminationTeamsResolver } from './elimination-teams.utils';
import { PlanGroup } from './plan/plan.types';
import { computeStructuredPlan } from './plan/structured-plan';

const QUALIFYING_ROUNDS = 2;
const FIRST_ELIMINATION_ROUND = QUALIFYING_ROUNDS + 1;

const plan = computeStructuredPlan({
    teamCount: 12,
    targetCount: 12,
    consolationCount: 0,
    numberOfQualifyingRounds: QUALIFYING_ROUNDS,
    hasChallenges: true,
    hasThirdPlaceMatch: true,
    eliminatedAfterQualifying: 0,
    maxConsolations: 4,
    thresholds: { okRatio: 0.9, warningRatio: 0.75 },
});

const teams = Array.from(
    { length: 12 },
    (_, i) => ({ id: `team-${i}`, name: `Team ${i}`, players: [] }) as unknown as Team,
);

/** Ranking of the qualifiers: team-0 is first. */
const qualifyingRanking: GlobalRankingEntry[] = teams.map((team, index) => ({
    rank: index + 1,
    teamId: team.id,
    teamName: team.name,
    wins: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    goalAverage: 0,
    matchesPlayed: 0,
    tournamentPoints: 0,
    losses: 0,
}));

const ALL_ALLOWED: ConstraintConfig = {
    allowMatchAgainstFullSameClub: true,
    allowMatchAgainstPartialSameClub: true,
    allowRematch: true,
};

function context(overrides: Partial<EliminationContext> = {}): EliminationContext {
    return {
        plan,
        teams,
        pastMatches: [],
        qualifyingRanking,
        stoppedCount: 0,
        seeding: EliminationSeeding.PYRAMIDAL,
        tournamentId: 't1',
        constraintConfig: ALL_ALLOWED,
        ...overrides,
    };
}

function group(round: number, key: string): PlanGroup {
    return plan.rounds.find((r) => r.number === round)!.groups.find((g) => g.key === key)!;
}

function teamIndex(team: Team | null): number | null {
    return team ? Number(team.id.replace('team-', '')) : null;
}

/** Played match: the lower team index wins 13 to 5. A bye is stored 0-0. */
function played(
    round: number,
    key: string,
    position: number,
    a: number,
    b: number | null,
): TournamentMatch {
    const isBye = b === null;
    const aWins = isBye || a < b;
    return {
        sessionNumber: round,
        pool: { name: key },
        bracketPosition: position,
        teamA: { id: `team-${a}` },
        teamB: isBye ? null : { id: `team-${b}` },
        isBye,
        byeWin: isBye,
        scoreA: isBye ? 0 : aWins ? 13 : 5,
        scoreB: isBye ? 0 : aWins ? 5 : 13,
    } as unknown as TournamentMatch;
}

/** Plays a whole round of slots: the lower team index wins. */
function playRound(round: number, key: string, slots: BracketSlot[]): TournamentMatch[] {
    return slots.map((slot) =>
        played(round, key, slot.position, teamIndex(slot.teamA)!, teamIndex(slot.teamB)),
    );
}

/** The matchups of the real matches as « lower index v higher index », sorted. */
function matchups(slots: BracketSlot[]): string[] {
    return slots
        .filter((slot) => slot.teamB)
        .map((slot) => [teamIndex(slot.teamA)!, teamIndex(slot.teamB)!].sort((a, b) => a - b))
        .map(([a, b]) => `${a}v${b}`)
        .sort();
}

describe('EliminationTeamsResolver.slotsOf', () => {
    it('pyramidal, first round of a 12-team bracket: byes for seeds 1 to 4', () => {
        const slots = new EliminationTeamsResolver(context()).slotsOf(
            group(FIRST_ELIMINATION_ROUND, 'principale'),
            FIRST_ELIMINATION_ROUND,
        );

        const byes = slots
            .filter((slot) => !slot.teamB)
            .map((slot) => teamIndex(slot.teamA))
            .sort((a, b) => a! - b!);
        expect(byes).toEqual([0, 1, 2, 3]);
        // Seeds 8v9, 5v12, 6v11, 7v10 are the team indexes 7v8, 4v11, 5v10, 6v9.
        expect(matchups(slots)).toEqual(['4v11', '5v10', '6v9', '7v8']);
    });

    it('feeds the next round from the winners by position, no new draw', () => {
        const first = new EliminationTeamsResolver(context()).slotsOf(
            group(FIRST_ELIMINATION_ROUND, 'principale'),
            FIRST_ELIMINATION_ROUND,
        );
        const pastMatches = playRound(FIRST_ELIMINATION_ROUND, 'principale', first);

        const second = new EliminationTeamsResolver(context({ pastMatches })).slotsOf(
            group(FIRST_ELIMINATION_ROUND + 1, 'principale'),
            FIRST_ELIMINATION_ROUND + 1,
        );

        // S1–W(8v9), S4–W(5v12), S3–W(6v11), S2–W(7v10): the team indexes (0, 7), (3, 4), (2, 5), (1, 6).
        expect(matchups(second)).toEqual(['0v7', '1v6', '2v5', '3v4']);
        expect(second.map((slot) => slot.position)).toEqual([0, 1, 2, 3]);
    });

    it('seeds the challenge with the real-match losers of the first round, by qualifying rank', () => {
        const first = new EliminationTeamsResolver(context()).slotsOf(
            group(FIRST_ELIMINATION_ROUND, 'principale'),
            FIRST_ELIMINATION_ROUND,
        );
        const pastMatches = playRound(FIRST_ELIMINATION_ROUND, 'principale', first);

        const challenge = new EliminationTeamsResolver(context({ pastMatches })).slotsOf(
            group(FIRST_ELIMINATION_ROUND + 1, 'challenge_principale'),
            FIRST_ELIMINATION_ROUND + 1,
        );

        // Losers: team 8, 11, 10, 9 → seeds 1 to 4 → 1v4 (8v11) and 2v3 (9v10).
        expect(matchups(challenge)).toEqual(['8v11', '9v10']);
    });

    it('puts the two semi-final losers in the 3rd-place match', () => {
        let pastMatches: TournamentMatch[] = [];
        for (const round of [FIRST_ELIMINATION_ROUND, FIRST_ELIMINATION_ROUND + 1]) {
            const slots = new EliminationTeamsResolver(context({ pastMatches })).slotsOf(
                group(round, 'principale'),
                round,
            );
            pastMatches = [...pastMatches, ...playRound(round, 'principale', slots)];
        }
        const semiRound = FIRST_ELIMINATION_ROUND + 2;
        const semis = new EliminationTeamsResolver(context({ pastMatches })).slotsOf(
            group(semiRound, 'principale'),
            semiRound,
        );
        expect(semis).toHaveLength(2);
        pastMatches = [...pastMatches, ...playRound(semiRound, 'principale', semis)];

        const finalRound = semiRound + 1;
        const third = new EliminationTeamsResolver(context({ pastMatches })).slotsOf(
            group(finalRound, 'third_place_match'),
            finalRound,
        );

        expect(third).toHaveLength(1);
        expect(third[0].position).toBe(0);
        expect(third[0].teamB).not.toBeNull();
        const losers = semis
            .map((slot) => Math.max(teamIndex(slot.teamA)!, teamIndex(slot.teamB)!))
            .sort((a, b) => a - b);
        const thirdTeams = [teamIndex(third[0].teamA)!, teamIndex(third[0].teamB)!].sort(
            (a, b) => a - b,
        );
        expect(thirdTeams).toEqual(losers);
    });

    it('random seeding: same tree for the same tournament, 4 byes and 4 matches', () => {
        const run = () =>
            new EliminationTeamsResolver(context({ seeding: EliminationSeeding.RANDOM }))
                .slotsOf(group(FIRST_ELIMINATION_ROUND, 'principale'), FIRST_ELIMINATION_ROUND)
                .map((slot) => `${slot.position}:${slot.teamA.id}-${slot.teamB?.id ?? 'bye'}`);

        expect(run()).toEqual(run());
        const slots = new EliminationTeamsResolver(
            context({ seeding: EliminationSeeding.RANDOM }),
        ).slotsOf(group(FIRST_ELIMINATION_ROUND, 'principale'), FIRST_ELIMINATION_ROUND);
        expect(slots).toHaveLength(8);
        expect(slots.filter((slot) => !slot.teamB)).toHaveLength(4);
        expect(slots.filter((slot) => slot.teamB)).toHaveLength(4);
    });

    it('random seeding avoids a rematch in the first round when another pairing exists', () => {
        const qualifyingMeetings = [
            { teamA: { id: 'team-0' }, teamB: { id: 'team-1' }, sessionNumber: 1, isBye: false },
            { teamA: { id: 'team-2' }, teamB: { id: 'team-3' }, sessionNumber: 1, isBye: false },
        ] as unknown as TournamentMatch[];

        const slots = new EliminationTeamsResolver(
            context({
                seeding: EliminationSeeding.RANDOM,
                pastMatches: qualifyingMeetings,
                constraintConfig: { ...ALL_ALLOWED, allowRematch: false },
            }),
        ).slotsOf(group(FIRST_ELIMINATION_ROUND, 'principale'), FIRST_ELIMINATION_ROUND);

        const pairs = matchups(slots);
        expect(pairs).not.toContain('0v1');
        expect(pairs).not.toContain('2v3');
    });

    it('leaves out the teams stopped after the qualifiers', () => {
        const slots = new EliminationTeamsResolver(context({ stoppedCount: 2 })).slotsOf(
            group(FIRST_ELIMINATION_ROUND, 'principale'),
            FIRST_ELIMINATION_ROUND,
        );
        const used = slots.flatMap((slot) => [teamIndex(slot.teamA), teamIndex(slot.teamB)]);
        expect(used).not.toContain(10);
        expect(used).not.toContain(11);
    });
});
