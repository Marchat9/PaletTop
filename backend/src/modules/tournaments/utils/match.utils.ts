/**
 * Function to generation tournament matches for a pool
 *
 * @param pool
 * @param teams
 * @param tournament
 * @param session
 * @param constraintConfig
 * @param pastMatches
 * @returns DeepPartial<TournamentMatch>[]
 */

import { MatchesSession } from 'src/entities/matches-session.entity';
import { Team } from 'src/entities/team.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { TournamentPool } from 'src/entities/tournament-pool.entity';
import { Tournament } from 'src/entities/tournament.entity';
import { MatchStatus } from 'src/enum/status.enum';
import { ConstraintConfig } from 'src/model/constraint.model';
import { buildByeMatchData, selectByeTeam } from 'src/modules/tournaments/utils/bye.utils';
import { generatePairsWithContraints } from 'src/modules/tournaments/utils/draw.utils';
import { DeepPartial } from 'typeorm';

export function generateMatchesInPool(
    poll: TournamentPool,
    teams: Team[],
    tournament: Tournament,
    session: MatchesSession,
    constraintConfig: ConstraintConfig,
    pastMatches: TournamentMatch[],
): DeepPartial<TournamentMatch>[] {
    const allMatches: DeepPartial<TournamentMatch>[] = [];

    const tournamentRef: Tournament = { id: tournament.id } as Tournament;
    const sessionRef: MatchesSession = { id: session.id } as MatchesSession;
    const currentTeams = [...teams];

    // Byes
    if (currentTeams.length % 2 !== 0) {
        const byeTeam = selectByeTeam(currentTeams, []);
        allMatches.push(
            buildByeMatchData(
                { id: byeTeam.id } as Team,
                tournamentRef,
                poll,
                sessionRef,
                tournament.configuration.pointsPerGame,
                session.sessionNumber,
            ),
        );
        currentTeams.splice(
            currentTeams.findIndex((t) => t.id === byeTeam.id),
            1,
        );
    }

    // Matches
    for (const [teamA, teamB] of generatePairsWithContraints(
        constraintConfig,
        currentTeams,
        pastMatches,
    )) {
        allMatches.push({
            tournament: tournamentRef,
            session: sessionRef,
            sessionNumber: session.sessionNumber,
            pool: poll,
            teamA: { id: teamA.id } as Team,
            teamB: { id: teamB.id } as Team,
            isBye: false,
            status: MatchStatus.PENDING,
        });
    }
    return allMatches;
}
