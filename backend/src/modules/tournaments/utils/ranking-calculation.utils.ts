import { Team } from 'src/entities/team.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { ScoreCalculation } from 'src/enum/tounament.enum';
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
    /** Sum of the wins of the opponents met (byes excluded). */
    buchholz: number;
}

export interface RankedTeamStats extends TeamRankingStats {
    rank: number;
}

/** A ranking criterion, always sorted in descending order. */
type RankingCriterion = 'wins' | 'pointsFor' | 'goalAverage' | 'tournamentPoints' | 'buchholz';

/**
 * Criteria of each score calculation, in priority order. The trailing criteria are tie-breakers
 * only, so that teams share a rank as rarely as possible.
 */
const CRITERIA_BY_SCORE_CALCULATION: Record<ScoreCalculation, RankingCriterion[]> = {
    [ScoreCalculation.VICTORY_AND_GOAL_AVERAGE]: ['wins', 'goalAverage', 'pointsFor'],
    [ScoreCalculation.SCORE]: ['pointsFor', 'goalAverage', 'wins'],
    [ScoreCalculation.TOURNAMENT_SCORE]: ['tournamentPoints'],
    [ScoreCalculation.VICTORY_BUCHHOLZ_GOAL_AVERAGE]: ['wins', 'buchholz', 'goalAverage'],
    [ScoreCalculation.SCORE_BUCHHOLZ_GOAL_AVERAGE]: ['pointsFor', 'buchholz', 'goalAverage'],
};

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
export function computeTeamStats(teams: Team[], matches: TournamentMatch[]): TeamRankingStats[] {
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
                buchholz: 0,
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

    for (const match of matches) {
        if (match.isBye || !match.teamB) {
            credit(match.teamA.id, match.scoreA, match.scoreB, isByeWin(match));
            continue;
        }
        credit(match.teamA.id, match.scoreA, match.scoreB, match.scoreA > match.scoreB);
        credit(match.teamB.id, match.scoreB, match.scoreA, match.scoreB > match.scoreA);
    }

    // Buchholz needs every team's final wins over the same matches: second pass.
    for (const match of matches) {
        if (match.isBye || !match.teamB) continue;
        const entryA = stats.get(match.teamA.id);
        const entryB = stats.get(match.teamB.id);
        if (entryA) entryA.buchholz += entryB?.wins ?? 0;
        if (entryB) entryB.buchholz += entryA?.wins ?? 0;
    }

    const result = [...stats.values()];
    for (const entry of result) {
        entry.goalAverage = entry.pointsFor - entry.pointsAgainst;
    }
    return result;
}

/** Negative when `a` ranks before `b`, 0 when they are tied on every criterion. */
export function compareByScoreCalculation(
    a: TeamRankingStats,
    b: TeamRankingStats,
    scoreCalculation: ScoreCalculation,
): number {
    const criteria =
        CRITERIA_BY_SCORE_CALCULATION[scoreCalculation] ??
        CRITERIA_BY_SCORE_CALCULATION[ScoreCalculation.VICTORY_AND_GOAL_AVERAGE];
    for (const criterion of criteria) {
        const difference = b[criterion] - a[criterion];
        if (difference !== 0) return difference;
    }
    return 0;
}

/** Ranked stats: teams tied on every criterion share the same rank. Stable for exact ties. */
export function rankTeams(
    teams: Team[],
    matches: TournamentMatch[],
    scoreCalculation: ScoreCalculation,
): RankedTeamStats[] {
    const sorted = computeTeamStats(teams, matches).sort((a, b) =>
        compareByScoreCalculation(a, b, scoreCalculation),
    );

    return sorted.reduce<RankedTeamStats[]>((ranked, stat, index) => {
        const isTiedWithPrevious =
            index > 0 && compareByScoreCalculation(stat, sorted[index - 1], scoreCalculation) === 0;
        ranked.push({ ...stat, rank: isTiedWithPrevious ? ranked[index - 1].rank : index + 1 });
        return ranked;
    }, []);
}
