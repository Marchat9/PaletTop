import { Team } from 'src/entities/team.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { ScoreCalculation } from 'src/enum/tounament.enum';
import { fixedDraw } from './fixed-draw.utils';
import { computeTournamentScorePoints } from './score-calculation.utils';

/** Everything a team's rank can depend on, whatever the score calculation. */
export interface TeamRankingStats {
    teamId: string;
    teamName: string;
    wins: number;
    pointsFor: number;
    pointsAgainst: number;
    goalAverage: number;
    matchesPlayed: number;
    tournamentPoints: number;
    /** Matches lost: never a bye, never a draw. */
    losses: number;
    /** Largest losing margin, 0 without any loss. Lower is better. */
    worstLoss: number;
    /**
     * Gap (own score minus the opponent's) of every played match, in session order. Byes are not
     * part of it.
     */
    gaps: number[];
    /** Frozen draw of the team in its tournament: the lower value ranks first on a perfect tie. */
    tiebreak: number;
}

export interface RankedTeamStats extends TeamRankingStats {
    rank: number;
}

/** A numeric ranking criterion of the stats. */
type RankingCriterion =
    'wins' | 'pointsFor' | 'pointsAgainst' | 'goalAverage' | 'worstLoss' | 'tournamentPoints';

interface CriterionRule {
    criterion: RankingCriterion;
    /** True when the lower value ranks first (worst loss, points conceded). */
    ascending: boolean;
}

const higher = (criterion: RankingCriterion): CriterionRule => ({ criterion, ascending: false });
const lower = (criterion: RankingCriterion): CriterionRule => ({ criterion, ascending: true });

/** Numeric criteria of each score calculation, in priority order. */
const CRITERIA_BY_SCORE_CALCULATION: Record<ScoreCalculation, CriterionRule[]> = {
    [ScoreCalculation.VICTORY_GOAL_AVERAGE]: [
        higher('wins'),
        higher('goalAverage'),
        higher('pointsFor'),
    ],
    [ScoreCalculation.VICTORY_BEST_DEFEATS]: [
        higher('wins'),
        lower('worstLoss'),
        higher('goalAverage'),
        higher('pointsFor'),
    ],
    [ScoreCalculation.VICTORY_POINTS_SCORED]: [
        higher('wins'),
        higher('pointsFor'),
        lower('pointsAgainst'),
    ],
    [ScoreCalculation.TOURNAMENT_SCORE]: [higher('tournamentPoints')],
};

/**
 * Calculations that go on after their numeric criteria with the game-by-game gaps, then the frozen
 * draw: two teams never share a rank. The others (championship points) keep their ties.
 */
const FROZEN_DRAW_CALCULATIONS: ReadonlySet<ScoreCalculation> = new Set([
    ScoreCalculation.VICTORY_GOAL_AVERAGE,
    ScoreCalculation.VICTORY_BEST_DEFEATS,
    ScoreCalculation.VICTORY_POINTS_SCORED,
]);

const DEFAULT_SCORE_CALCULATION = ScoreCalculation.VICTORY_GOAL_AVERAGE;

/**
 * A bye counts as a win when flagged so (`byeWin`, stored 0-0 since the neutral-GA rule), or for
 * the legacy byes stored `pointsPerGame`-0. The 0-0 bye of the up-down ranking round is worth
 * nothing.
 */
export function isByeWin(match: Pick<TournamentMatch, 'byeWin' | 'scoreA'>): boolean {
    return !!match.byeWin || match.scoreA > 0;
}

/**
 * Stats of every team over the given matches. The caller picks the matches (status, pool,
 * qualifying only…): this function knows nothing about the competition mode.
 */
export function computeTeamStats(
    teams: Team[],
    matches: TournamentMatch[],
    tournamentId: string,
): TeamRankingStats[] {
    const stats = new Map<string, TeamRankingStats>(
        teams.map((team) => [
            team.id,
            {
                teamId: team.id,
                teamName: team.name,
                wins: 0,
                pointsFor: 0,
                pointsAgainst: 0,
                goalAverage: 0,
                matchesPlayed: 0,
                tournamentPoints: 0,
                losses: 0,
                worstLoss: 0,
                gaps: [],
                tiebreak: fixedDraw(`${tournamentId}:${team.id}`),
            },
        ]),
    );

    const credit = (teamId: string, own: number, opponent: number, won: boolean): void => {
        const entry = stats.get(teamId);
        if (!entry) return;
        entry.matchesPlayed++;
        entry.pointsFor += own;
        entry.pointsAgainst += opponent;
        if (won) entry.wins++;
        entry.tournamentPoints += computeTournamentScorePoints(won, own);
    };

    // Gaps and losses only concern played matches, not byes.
    const creditPlayed = (teamId: string, own: number, opponent: number): void => {
        const entry = stats.get(teamId);
        if (!entry) return;
        entry.gaps.push(own - opponent);
        if (own < opponent) {
            entry.losses++;
            entry.worstLoss = Math.max(entry.worstLoss, opponent - own);
        }
    };

    // Session order, so that `gaps` reads game after game (the sort is stable).
    const chronological = [...matches].sort(
        (a, b) => (a.sessionNumber ?? 0) - (b.sessionNumber ?? 0),
    );
    for (const match of chronological) {
        if (match.isBye || !match.teamB) {
            credit(match.teamA.id, match.scoreA, match.scoreB, isByeWin(match));
            continue;
        }
        credit(match.teamA.id, match.scoreA, match.scoreB, match.scoreA > match.scoreB);
        credit(match.teamB.id, match.scoreB, match.scoreA, match.scoreB > match.scoreA);
        creditPlayed(match.teamA.id, match.scoreA, match.scoreB);
        creditPlayed(match.teamB.id, match.scoreB, match.scoreA);
    }

    const result = [...stats.values()];
    for (const entry of result) {
        entry.goalAverage = entry.pointsFor - entry.pointsAgainst;
    }
    return result;
}

/**
 * Negative when the team with gaps `a` ranks before the one with gaps `b`. Gaps are compared from
 * the last game back: the higher gap goes first. When one list runs out, the team with more games
 * goes first.
 */
export function compareGaps(a: number[], b: number[]): number {
    const common = Math.min(a.length, b.length);
    for (let back = 1; back <= common; back++) {
        const difference = b[b.length - back] - a[a.length - back];
        if (difference !== 0) return difference;
    }
    return b.length - a.length;
}

/**
 * Negative when `a` ranks before `b`. 0 only when they are tied on every criterion of a calculation
 * without frozen draw (championship points); the others always end on the draw, then the team id.
 */
export function compareByScoreCalculation(
    a: TeamRankingStats,
    b: TeamRankingStats,
    scoreCalculation: ScoreCalculation,
): number {
    const calculation = CRITERIA_BY_SCORE_CALCULATION[scoreCalculation]
        ? scoreCalculation
        : DEFAULT_SCORE_CALCULATION;
    for (const { criterion, ascending } of CRITERIA_BY_SCORE_CALCULATION[calculation]) {
        const difference = ascending ? a[criterion] - b[criterion] : b[criterion] - a[criterion];
        if (difference !== 0) return difference;
    }
    if (!FROZEN_DRAW_CALCULATIONS.has(calculation)) return 0;
    const byTeamId = a.teamId < b.teamId ? -1 : a.teamId > b.teamId ? 1 : 0;
    return compareGaps(a.gaps, b.gaps) || a.tiebreak - b.tiebreak || byTeamId;
}

/**
 * Ranked stats: teams tied on every criterion share the same rank (championship points only, the
 * other calculations never tie). Stable for exact ties.
 */
export function rankTeams(
    teams: Team[],
    matches: TournamentMatch[],
    scoreCalculation: ScoreCalculation,
    tournamentId: string,
): RankedTeamStats[] {
    const sorted = computeTeamStats(teams, matches, tournamentId).sort((a, b) =>
        compareByScoreCalculation(a, b, scoreCalculation),
    );

    return sorted.reduce<RankedTeamStats[]>((ranked, stat, index) => {
        const isTiedWithPrevious =
            index > 0 && compareByScoreCalculation(stat, sorted[index - 1], scoreCalculation) === 0;
        ranked.push({ ...stat, rank: isTiedWithPrevious ? ranked[index - 1].rank : index + 1 });
        return ranked;
    }, []);
}
