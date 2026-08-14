import { MatchesSession } from 'src/entities/matches-session.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { Tournament } from 'src/entities/tournament.entity';

/**
 * Appends a freshly generated session (with its saved matches) to the
 * tournament's in-memory session/match lists. Relies on strategies passing
 * fully-hydrated Team entities (not `{ id }` stubs) when building matches,
 * so no re-lookup against `tournament.teams` is needed here.
 */
export function appendMatchesSessionToTournament(
    tournament: Tournament,
    session: Omit<MatchesSession, 'matches'>,
    matches: TournamentMatch[],
): Tournament {
    return {
        ...tournament,
        matchsSessions: [...(tournament.matchsSessions ?? []), { ...session, matches }],
        matches: [...(tournament.matches ?? []), ...matches],
    };
}

export function updateTournamentWithUpdatedSession(
    tournament: Tournament,
    session: MatchesSession,
): Tournament {
    return {
        ...tournament,
        matchsSessions: tournament.matchsSessions?.map((s) => (s.id === session.id ? session : s)),
    };
}
