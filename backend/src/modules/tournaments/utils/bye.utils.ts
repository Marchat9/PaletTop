import { DeepPartial } from 'typeorm';
import { MatchesSession } from 'src/entities/matches-session.entity';
import { Team } from 'src/entities/team.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { Tournament } from 'src/entities/tournament.entity';
import { TournamentPool } from 'src/entities/tournament-pool.entity';
import { MatchStatus } from 'src/enum/status.enum';

export function selectByeTeam(teams: Team[], pastMatches: TournamentMatch[]): Team {
    const byeCountByTeam = new Map<string, number>(teams.map((t) => [t.id, 0]));

    for (const match of pastMatches) {
        if (match.isBye && byeCountByTeam.has(match.teamA.id)) {
            byeCountByTeam.set(match.teamA.id, byeCountByTeam.get(match.teamA.id)! + 1);
        }
    }

    const minByes = Math.min(...byeCountByTeam.values());
    const candidates = teams.filter((t) => byeCountByTeam.get(t.id) === minByes);
    return candidates[Math.floor(Math.random() * candidates.length)];
}

export function buildByeMatchData(
    team: Team,
    tournament: Tournament,
    pool: TournamentPool | null,
    session: MatchesSession,
    tournamentPointsPerGame: number,
    sessionNumber: number,
): DeepPartial<TournamentMatch> {
    return {
        tournament,
        pool,
        session,
        sessionNumber,
        teamA: team,
        teamB: null,
        isBye: true,
        scoreA: tournamentPointsPerGame,
        scoreB: 0,
        status: MatchStatus.VALIDATED,
    };
}
