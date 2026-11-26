import { Logger } from '@nestjs/common';
import { MatchesSession } from 'src/entities/matches-session.entity';
import { Team } from 'src/entities/team.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { StructuredCompetitionConfiguration } from 'src/entities/tournament-competition-configuration.entity';
import { TournamentPool } from 'src/entities/tournament-pool.entity';
import { Tournament } from 'src/entities/tournament.entity';
import { TournamentStatus } from 'src/enum/status.enum';
import { ConstraintConfig } from 'src/model/constraint.model';
import { PairingMode } from 'src/enum/tounament.enum';
import { ByeScore, NEUTRAL_BYE_WIN, selectByeTeam } from 'src/modules/tournaments/utils/bye.utils';
import {
    generateMatchesFromPairs,
    generateMatchesInPool,
    orderTeamsByRanking,
} from 'src/modules/tournaments/utils/match.utils';
import { pairDutch } from '../up-down/dutch-pairing.utils';
import { extractContraintConfig } from 'src/modules/tournaments/utils/tournament.utils';
import { buildSeed, seededRandom } from 'src/modules/tournaments/utils/seeded-random.utils';
import { toPoolRef } from 'src/modules/tournaments/utils/type-orm-ref.utils';
import { DeepPartial } from 'typeorm';
import { GlobalRankingEntry } from '../../../tournaments/responses/ranking.dto';
import { EliminationTeamsResolver } from './elimination-teams.utils';
import { PlanRound } from './plan/plan.types';

const logger = new Logger('StructuredSessionUtils');

/**
 * Permet de générer les matches de qualification suivant le nombre de pool.
 * @param tournament
 * @param session
 * @param pastMatches
 * @returns DeepPartial<TournamentMatch>[]
 */
export function generateQualifyingMatches(
    tournament: Tournament,
    session: MatchesSession,
    pastMatches: TournamentMatch[],
    byeScore: ByeScore,
): DeepPartial<TournamentMatch>[] {
    const constraintConfig: ConstraintConfig = extractContraintConfig(tournament.configuration);

    return tournament.pools
        .map((pool) => ({
            poolRef: toPoolRef(pool),
            poolPastMatches: pastMatches.filter((m) => m.pool?.id === pool.id),
            poolTeams: pool.teams,
        }))
        .flatMap(({ poolRef, poolPastMatches, poolTeams }) =>
            generateMatchesInPool(
                poolRef,
                poolTeams,
                tournament,
                session,
                constraintConfig,
                poolPastMatches,
                byeScore,
                seededRandom(buildSeed(tournament.id, 'draw', session.sessionNumber, poolRef.id)),
            ),
        );
}

/** The elimination round of the frozen plan played at `sessionNumber`, if any. */
export function eliminationPlanRound(
    config: StructuredCompetitionConfiguration,
    sessionNumber: number,
): PlanRound | undefined {
    return config.plan?.rounds.find(
        (round) => round.number === sessionNumber && round.kind === 'elimination',
    );
}

/** Group keys of the elimination round played at `sessionNumber` (one virtual pool each). */
export function eliminationGroupKeys(
    config: StructuredCompetitionConfiguration,
    sessionNumber: number,
): string[] {
    return eliminationPlanRound(config, sessionNumber)?.groups.map((group) => group.key) ?? [];
}

/**
 * Matches of an elimination round, following the frozen plan: each group of the plan round gets
 * its teams from the earlier results (see `EliminationTeamsResolver`) and is drawn in its own
 * virtual pool with the constrained draw; an odd group gives its bye to the team with the fewest
 * byes, then the best ranked. Groups come in the plan's order, which is the plate order.
 */
export function generateEliminationMatches(
    tournament: Tournament,
    config: StructuredCompetitionConfiguration,
    session: MatchesSession,
    pastMatches: TournamentMatch[],
    globalRanking: GlobalRankingEntry[],
    virtualPools: TournamentPool[],
): DeepPartial<TournamentMatch>[] {
    const round = eliminationPlanRound(config, session.sessionNumber);
    if (!config.plan || !round) {
        throw new Error(
            `No elimination round planned for session ${session.sessionNumber} of ${tournament.code}.`,
        );
    }
    const constraintConfig = extractContraintConfig(tournament.configuration);
    const resolver = new EliminationTeamsResolver({
        plan: config.plan,
        teams: tournament.teams,
        pastMatches,
        globalRanking,
        stoppedCount: config.eliminatedAfterQualifying ?? 0,
        random: seededRandom(buildSeed(tournament.id, 'bracket', round.number)),
    });

    return round.groups.flatMap((group) => {
        const teams = resolver.teamsOf(group, round.number);
        if (teams.length !== group.teamCount) {
            logger.warn(
                `${tournament.code} session ${round.number}: ${group.key} has ${teams.length} teams, ${group.teamCount} planned`,
            );
        }
        if (teams.length < 2) return [];
        logger.debug(
            `${tournament.code} session ${round.number}: ${group.key}, ${teams.length} teams`,
        );
        const pool = virtualPools.find((vp) => vp.name === group.key)!;
        const groupRandom = seededRandom(buildSeed(tournament.id, 'draw', round.number, group.key));
        if (config.eliminationPairingMode === PairingMode.DUTCH) {
            return generateDutchGroupMatches(
                pool,
                teams,
                tournament,
                session,
                constraintConfig,
                pastMatches,
                globalRanking,
                groupRandom,
            );
        }
        return generateMatchesInPool(
            pool,
            teams,
            tournament,
            session,
            constraintConfig,
            pastMatches,
            NEUTRAL_BYE_WIN,
            groupRandom,
            globalRanking,
        );
    });
}

/**
 * One elimination group paired by the Dutch Swiss system, from the ranking of every match played
 * so far. All the teams of a group are still in the running, so they share one score group: the
 * top half of the ranking plays the bottom half, within the club and rematch constraints when
 * possible. An odd group gives its bye the elimination way (fewest byes, then best ranked), not
 * the up-down way (worst ranked). Plates follow the pairing order, the best ranked team first.
 */
function generateDutchGroupMatches(
    pool: TournamentPool,
    teams: Team[],
    tournament: Tournament,
    session: MatchesSession,
    constraintConfig: ConstraintConfig,
    pastMatches: TournamentMatch[],
    globalRanking: GlobalRankingEntry[],
    random: () => number,
): DeepPartial<TournamentMatch>[] {
    const byeTeam =
        teams.length % 2 !== 0 ? selectByeTeam(teams, pastMatches, globalRanking, random) : null;
    const playing = orderTeamsByRanking(
        teams.filter((team) => team.id !== byeTeam?.id),
        globalRanking,
    );
    const pairs = pairDutch(playing, new Map(), pastMatches, constraintConfig);
    return generateMatchesFromPairs(pool, pairs, byeTeam, NEUTRAL_BYE_WIN, tournament, session);
}

/**
 * Phase name of the current session, from the frozen plan's round labels (« Phase qualificative
 * x/N », « Élimination n », « Quarts de finale », « Demi-finales », « Finale »); the final round
 * says « + Petite Finale » when the 3rd place match is played with it.
 */
export function computePhaseName(
    tournamentStatus: TournamentStatus,
    config: StructuredCompetitionConfiguration,
    currentSessionNumber: number,
): string {
    if (tournamentStatus === TournamentStatus.COMPLETED) return 'Tournoi terminé';
    if (tournamentStatus !== TournamentStatus.ACTIVE || currentSessionNumber === 0) return '';

    const round = config.plan?.rounds.find((r) => r.number === currentSessionNumber);
    if (!round) {
        return currentSessionNumber <= config.numberOfQualifyingRounds
            ? `Phase qualificative ${currentSessionNumber}/${config.numberOfQualifyingRounds}`
            : '';
    }
    const withThirdPlace = round.groups.some((group) => group.kind === 'third_place');
    return withThirdPlace ? `${round.label} + Petite Finale` : round.label;
}

/** Last round of the tournament: the plan's last one (the last qualifying one without a plan). */
export function lastRoundNumber(config: StructuredCompetitionConfiguration): number {
    return config.plan?.totalRounds ?? config.numberOfQualifyingRounds ?? 0;
}
