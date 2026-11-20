import { describe, expect, it } from 'vitest';
import { Team } from 'src/entities/team.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { ScoreCalculation } from 'src/enum/tounament.enum';
import { computeTeamStats, isByeWin, rankTeams } from './ranking-calculation.utils';

function teams(...ids: string[]): Team[] {
    return ids.map((id) => ({ id, name: id }) as Team);
}

function match(teamA: string, teamB: string, scoreA: number, scoreB: number): TournamentMatch {
    return {
        teamA: { id: teamA },
        teamB: { id: teamB },
        scoreA,
        scoreB,
        isBye: false,
        byeWin: false,
    } as TournamentMatch;
}

function bye(team: string, byeWin: boolean, scoreA = 0): TournamentMatch {
    return { teamA: { id: team }, teamB: null, scoreA, scoreB: 0, isBye: true, byeWin } as never;
}

function statsOf(teamIds: Team[], matches: TournamentMatch[], id: string) {
    return computeTeamStats(teamIds, matches).find((s) => s.teamId === id)!;
}

describe('isByeWin', () => {
    it('counts flagged byes and legacy pointsPerGame-0 byes as wins, not the 0-0 ranking bye', () => {
        expect(isByeWin({ byeWin: true, scoreA: 0 })).toBe(true);
        expect(isByeWin({ byeWin: false, scoreA: 13 })).toBe(true);
        expect(isByeWin({ byeWin: false, scoreA: 0 })).toBe(false);
    });
});

describe('computeTeamStats', () => {
    const all = teams('A', 'B', 'C', 'D');

    it('gives a new bye one win and 6 tournament points, nothing to the goal average', () => {
        const stats = statsOf(all, [bye('A', true)], 'A');
        expect(stats).toMatchObject({
            wins: 1,
            pointsFor: 0,
            goalAverage: 0,
            tournamentPoints: 6,
            buchholz: 0,
            matchesPlayed: 1,
        });
    });

    it('keeps the effect of a legacy 13-0 bye', () => {
        expect(statsOf(all, [bye('A', false, 13)], 'A')).toMatchObject({
            wins: 1,
            pointsFor: 13,
            goalAverage: 13,
        });
    });

    it('gives nothing for the 0-0 ranking-round bye', () => {
        expect(statsOf(all, [bye('A', false)], 'A')).toMatchObject({ wins: 0, goalAverage: 0 });
    });

    it('sums the final wins of the opponents met into the Buchholz', () => {
        // A beat B and C; B beat D; C beat D. Wins: A 2, B 1, C 1, D 0.
        const matches = [
            match('A', 'B', 13, 5),
            match('A', 'C', 13, 7),
            match('B', 'D', 13, 2),
            match('C', 'D', 13, 9),
        ];
        const stats = computeTeamStats(all, matches);
        const buchholz = Object.fromEntries(stats.map((s) => [s.teamId, s.buchholz]));
        expect(buchholz).toEqual({ A: 2, B: 2, C: 2, D: 2 });
    });

    it('counts an opponent met twice twice, and ignores byes', () => {
        const matches = [
            match('A', 'B', 13, 5),
            match('A', 'B', 13, 5),
            match('B', 'C', 13, 0),
            bye('B', true),
        ];
        // Wins: A 2, B 2 (C + bye), C 0. A met B twice → 4; B met A twice + C → 4.
        expect(statsOf(teams('A', 'B', 'C'), matches, 'A').buchholz).toBe(4);
        expect(statsOf(teams('A', 'B', 'C'), matches, 'B').buchholz).toBe(4);
    });
});

describe('rankTeams', () => {
    // A and B both have 2 wins. A met stronger opponents (Bch.) but has a worse goal average.
    const all = teams('A', 'B', 'C', 'D', 'E', 'F');
    const matches = [
        match('C', 'E', 13, 0),
        match('D', 'F', 13, 0),
        match('C', 'F', 13, 0),
        match('D', 'E', 13, 0),
        match('A', 'C', 13, 12),
        match('A', 'D', 13, 12),
        match('B', 'E', 13, 0),
        match('B', 'F', 13, 0),
    ];
    const order = (calculation: ScoreCalculation) =>
        rankTeams(all, matches, calculation)
            .filter((s) => s.teamId === 'A' || s.teamId === 'B')
            .map((s) => s.teamId);

    it('breaks a tie on wins with the goal average in « Victoire & GA »', () => {
        expect(order(ScoreCalculation.VICTORY_AND_GOAL_AVERAGE)).toEqual(['B', 'A']);
    });

    it('breaks the same tie with the Buchholz in « Victoire, Bch. & GA »', () => {
        expect(order(ScoreCalculation.VICTORY_BUCHHOLZ_GOAL_AVERAGE)).toEqual(['A', 'B']);
    });

    it('ranks by points scored, then Buchholz, then GA in « Score, Bch. & GA »', () => {
        const ranked = rankTeams(
            teams('A', 'B', 'C'),
            [match('A', 'C', 13, 2), match('B', 'C', 13, 2), match('A', 'B', 10, 13)],
            ScoreCalculation.SCORE_BUCHHOLZ_GOAL_AVERAGE,
        );
        // A 23 points, B 26 points.
        expect(ranked.map((s) => s.teamId)).toEqual(['B', 'A', 'C']);
    });

    it('shares the rank only when every criterion is equal', () => {
        const ranked = rankTeams(
            teams('A', 'B'),
            [bye('A', true), bye('B', true)],
            ScoreCalculation.VICTORY_BUCHHOLZ_GOAL_AVERAGE,
        );
        expect(ranked.map((s) => s.rank)).toEqual([1, 1]);
    });

    it('ranks « Victoire & GA » by wins then goal average, without points scored', () => {
        const ranked = rankTeams(
            teams('A', 'B', 'C', 'D'),
            [match('A', 'C', 13, 0), match('B', 'D', 11, 0)],
            ScoreCalculation.VICTORY_AND_GOAL_AVERAGE,
        );
        // Same wins, A (+13) before B (+11).
        expect(ranked[0].teamId).toBe('A');
        expect(ranked[1].teamId).toBe('B');
    });

    it('breaks a tie on wins and goal average with the points scored in « Victoire & GA »', () => {
        const ranked = rankTeams(
            teams('A', 'B', 'C', 'D'),
            [match('A', 'C', 13, 5), match('B', 'D', 11, 3)],
            ScoreCalculation.VICTORY_AND_GOAL_AVERAGE,
        );
        // Same wins, same GA (+8): A scored 13, B 11.
        expect(ranked.slice(0, 2).map((s) => [s.teamId, s.rank])).toEqual([
            ['A', 1],
            ['B', 2],
        ]);
    });

    it('breaks a tie on points scored and goal average with the wins in « Somme des scores »', () => {
        const ranked = rankTeams(
            teams('A', 'B', 'C', 'D'),
            // A: 13 scored, GA +13, 1 win. B: 13 scored (7 + 6), GA +13, 2 wins.
            [match('A', 'C', 13, 0), match('B', 'D', 7, 0), match('B', 'D', 6, 0)],
            ScoreCalculation.SCORE,
        );
        expect(ranked.slice(0, 2).map((s) => s.teamId)).toEqual(['B', 'A']);
    });

    it('keeps teams on equal championship points tied', () => {
        const ranked = rankTeams(
            teams('A', 'B', 'C', 'D', 'E'),
            // A: one win (6 pts). B: two losses at 11 (4 pts) and 6 (2 pts) = 6 pts, no win.
            [match('A', 'C', 13, 0), match('D', 'B', 13, 11), match('E', 'B', 13, 6)],
            ScoreCalculation.TOURNAMENT_SCORE,
        );
        const a = ranked.find((s) => s.teamId === 'A');
        const b = ranked.find((s) => s.teamId === 'B');
        expect(a?.rank).toBe(b?.rank);
    });
});
