import { DeepPartial } from 'typeorm';
import { MatchesSession } from 'src/entities/matches-session.entity';
import { Team } from 'src/entities/team.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { Tournament } from 'src/entities/tournament.entity';
import { TournamentPool } from 'src/entities/tournament-pool.entity';
import { MatchStatus } from 'src/enum/status.enum';
import { GlobalRankingEntry } from 'src/modules/tournaments/responses/ranking.dto';

/**
 * The team getting the bye: the one with the fewest byes so far. On a tie, the best ranked of
 * `ranking` when given (elimination rounds), otherwise one drawn with `random` (seeded, so the
 * same round always gives the same bye).
 */
export function selectByeTeam(
    teams: Team[],
    pastMatches: TournamentMatch[],
    ranking: GlobalRankingEntry[] | undefined,
    random: () => number,
): Team {
    const byeCountByTeam = new Map<string, number>(teams.map((t) => [t.id, 0]));

    for (const match of pastMatches) {
        if (match.isBye && byeCountByTeam.has(match.teamA.id)) {
            byeCountByTeam.set(match.teamA.id, byeCountByTeam.get(match.teamA.id)! + 1);
        }
    }

    const minByes = Math.min(...byeCountByTeam.values());
    const candidates = teams
        .filter((t) => byeCountByTeam.get(t.id) === minByes)
        .sort((a, b) => a.id.localeCompare(b.id));
    if (ranking) {
        const position = new Map(
            [...ranking].sort((a, b) => a.rank - b.rank).map((e, index) => [e.teamId, index]),
        );
        const positionOf = (team: Team): number => position.get(team.id) ?? Number.MAX_SAFE_INTEGER;
        return candidates.reduce((best, team) =>
            positionOf(team) < positionOf(best) ? team : best,
        );
    }
    return candidates[Math.floor(random() * candidates.length)];
}

/** Score stored on a bye, and whether it counts as a win. */
export interface ByeScore {
    own: number;
    against: number;
    isWin: boolean;
}

/** Elimination bye: a win worth no point at all. */
export const NEUTRAL_BYE_WIN: ByeScore = { own: 0, against: 0, isWin: true };

/** Last round frozen by ranking: the bye is worth nothing, not even a win. */
export const NO_VALUE_BYE: ByeScore = { own: 0, against: 0, isWin: false };

/**
 * Score of a qualifying bye: the target score against the loser's score, `pointsPerGame − 1` up to
 * `cap` (13-6 at 13 points, 11-6 at 11). `pointsPerGame` is at least 1 (validated at creation).
 */
export function computeByeScore(
    pointsPerGame: number,
    cap: number,
): { own: number; against: number } {
    return { own: pointsPerGame, against: Math.min(Math.max(pointsPerGame - 1, 0), cap) };
}

/** The bye of a qualifying round for a tournament: won, with the capped score. */
export function qualifyingByeScore(pointsPerGame: number, cap: number): ByeScore {
    return { ...computeByeScore(pointsPerGame, cap), isWin: true };
}

/**
 * A bye is a won match against nobody: `score` gives what is stored (13-6 in qualifying rounds,
 * 0-0 for the neutral ones) and whether it is a win. Never a draw, never a played match.
 */
export function buildByeMatchData(
    team: Team,
    tournament: Tournament,
    pool: TournamentPool | null,
    session: MatchesSession,
    sessionNumber: number,
    score: ByeScore,
): DeepPartial<TournamentMatch> {
    return {
        tournament,
        pool,
        session,
        sessionNumber,
        teamA: team,
        teamB: null,
        isBye: true,
        byeWin: score.isWin,
        scoreA: score.own,
        scoreB: score.against,
        status: MatchStatus.VALIDATED,
    };
}
