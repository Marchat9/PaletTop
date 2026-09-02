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
import {
    toSessionRef,
    toTeamRef,
    toTournamentRef,
} from 'src/modules/tournaments/utils/type-orm-ref.utils';
import { DeepPartial } from 'typeorm';

// A match only ever needs id/name/code from its teams (see toSessionMatchResponseDto,
// toPlayerMatchDto). Passing the full Team entity is unsafe: Team's @BeforeInsert/@BeforeUpdate
// hook (validatePlayers) sets `player.team = this` on every player, so a team fetched with its
// players loaded becomes self-referencing (team.players[i].team === team) the moment it's
// saved — and that cycle sends matchRepo.create() into infinite recursion once a match carries
// that team as teamA/teamB.

export function generateMatchesInPool(
    pool: TournamentPool,
    teams: Team[],
    tournament: Tournament,
    session: MatchesSession,
    constraintConfig: ConstraintConfig,
    pastMatches: TournamentMatch[],
): DeepPartial<TournamentMatch>[] {
    const allMatches: DeepPartial<TournamentMatch>[] = [];

    const tournamentRef: Tournament = toTournamentRef(tournament);
    const sessionRef: MatchesSession = toSessionRef(session);
    const currentTeams = [...teams];

    // Byes
    if (currentTeams.length % 2 !== 0) {
        const byeTeam = selectByeTeam(currentTeams, []);
        allMatches.push(
            buildByeMatchData(
                toTeamRef(byeTeam),
                tournamentRef,
                pool,
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
    const pairs = generatePairsWithContraints(constraintConfig, currentTeams, pastMatches);

    for (const [teamA, teamB] of pairs) {
        allMatches.push({
            tournament: tournamentRef,
            session: sessionRef,
            sessionNumber: session.sessionNumber,
            pool: pool,
            teamA: toTeamRef(teamA),
            teamB: toTeamRef(teamB),
            isBye: false,
            status: MatchStatus.PENDING,
        });
    }
    return allMatches;
}
