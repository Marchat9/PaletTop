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

/**
 * A bye is stored 0-0: `isWin` makes it worth one win (drawn rounds) without touching the goal
 * average nor the sum of scores; otherwise it is worth nothing (up-down ranking round).
 */
export function buildByeMatchData(
    team: Team,
    tournament: Tournament,
    pool: TournamentPool | null,
    session: MatchesSession,
    sessionNumber: number,
    isWin: boolean,
): DeepPartial<TournamentMatch> {
    return {
        tournament,
        pool,
        session,
        sessionNumber,
        teamA: team,
        teamB: null,
        isBye: true,
        byeWin: isWin,
        scoreA: 0,
        scoreB: 0,
        status: MatchStatus.VALIDATED,
    };
}
