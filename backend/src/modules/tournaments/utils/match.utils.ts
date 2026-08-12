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

import { Logger } from '@nestjs/common';
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

const logger = new Logger('MatchUtils');

export function generateMatchesInPool(
    poll: TournamentPool,
    teams: Team[],
    tournament: Tournament,
    session: MatchesSession,
    constraintConfig: ConstraintConfig,
    pastMatches: TournamentMatch[],
): DeepPartial<TournamentMatch>[] {
    logger.debug(`generateMatchesInPool: pool=${poll.id ?? '(virtual)'} — ${teams.length} teams`);
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
    const pairingStartedAt = Date.now();
    const pairs = generatePairsWithContraints(constraintConfig, currentTeams, pastMatches);
    logger.debug(
        `generateMatchesInPool: generatePairsWithContraints returned ${pairs.length} pairs in ${Date.now() - pairingStartedAt} ms`,
    );

    for (const [teamA, teamB] of pairs) {
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
