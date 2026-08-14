import { MatchesSession } from 'src/entities/matches-session.entity';
import { Team } from 'src/entities/team.entity';
import { TournamentPool } from 'src/entities/tournament-pool.entity';
import { Tournament } from 'src/entities/tournament.entity';

export function toTeamRef(team: Team): Team {
    return { id: team.id, name: team.name, code: team.code } as Team;
}

export function toPoolRef(pool: TournamentPool): TournamentPool {
    return {
        ...pool,
        tournament: (pool.tournament ? { id: pool.tournament.id } : undefined) as Tournament,
        teams: pool.teams.map(toTeamRef),
    };
}
export function toSessionRef(session: MatchesSession): MatchesSession {
    return {
        ...session,
        tournament: (session.tournament ? { id: session.tournament.id } : undefined) as Tournament,
    };
}

export function toTournamentRef(tournament: Tournament): Tournament {
    return { id: tournament.id } as Tournament;
}
