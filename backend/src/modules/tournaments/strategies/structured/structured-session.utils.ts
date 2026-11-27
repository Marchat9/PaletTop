import { Logger } from '@nestjs/common';
import { MatchesSession } from 'src/entities/matches-session.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { StructuredCompetitionConfiguration } from 'src/entities/tournament-competition-configuration.entity';
import { TournamentPool } from 'src/entities/tournament-pool.entity';
import { Tournament } from 'src/entities/tournament.entity';
import { MatchStatus, TournamentStatus } from 'src/enum/status.enum';
import { ConstraintConfig } from 'src/model/constraint.model';
import { EliminationSeeding } from 'src/enum/tounament.enum';
import {
    buildByeMatchData,
    ByeScore,
    NEUTRAL_BYE_WIN,
} from 'src/modules/tournaments/utils/bye.utils';
import { generateMatchesInPool } from 'src/modules/tournaments/utils/match.utils';
import { extractContraintConfig } from 'src/modules/tournaments/utils/tournament.utils';
import { buildSeed, seededRandom } from 'src/modules/tournaments/utils/seeded-random.utils';
import {
    toPoolRef,
    toSessionRef,
    toTeamRef,
    toTournamentRef,
} from 'src/modules/tournaments/utils/type-orm-ref.utils';
import { DeepPartial } from 'typeorm';
import { GlobalRankingEntry } from '../../../tournaments/responses/ranking.dto';
import { BracketSlot } from './bracket/bracket.utils';
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

/** A slot of a bracket as a match: a bye (neutral win, 0-0) or a match to play, at its position. */
function slotToMatch(
    slot: BracketSlot,
    pool: TournamentPool,
    tournament: Tournament,
    session: MatchesSession,
): DeepPartial<TournamentMatch> {
    const tournamentRef = toTournamentRef(tournament);
    const sessionRef = toSessionRef(session);
    if (!slot.teamB) {
        return {
            ...buildByeMatchData(
                toTeamRef(slot.teamA),
                tournamentRef,
                pool,
                sessionRef,
                session.sessionNumber,
                NEUTRAL_BYE_WIN,
            ),
            bracketPosition: slot.position,
        };
    }
    return {
        tournament: tournamentRef,
        session: sessionRef,
        sessionNumber: session.sessionNumber,
        pool,
        teamA: toTeamRef(slot.teamA),
        teamB: toTeamRef(slot.teamB),
        isBye: false,
        status: MatchStatus.PENDING,
        bracketPosition: slot.position,
    };
}

/**
 * Matches of an elimination round, following the frozen plan: each group of the plan round gets
 * the slots of its bracket tree (see `EliminationTeamsResolver`), in its own virtual pool. The
 * matches come by position inside a group and the groups in the plan's order, which is the plate
 * order; the byes get no plate.
 */
export function generateEliminationMatches(
    tournament: Tournament,
    config: StructuredCompetitionConfiguration,
    session: MatchesSession,
    pastMatches: TournamentMatch[],
    qualifyingRanking: GlobalRankingEntry[],
    virtualPools: TournamentPool[],
): DeepPartial<TournamentMatch>[] {
    const round = eliminationPlanRound(config, session.sessionNumber);
    if (!config.plan || !round) {
        throw new Error(
            `No elimination round planned for session ${session.sessionNumber} of ${tournament.code}.`,
        );
    }
    const resolver = new EliminationTeamsResolver({
        plan: config.plan,
        teams: tournament.teams,
        pastMatches,
        qualifyingRanking,
        stoppedCount: config.eliminatedAfterQualifying ?? 0,
        seeding: config.eliminationSeeding ?? EliminationSeeding.PYRAMIDAL,
        tournamentId: tournament.id,
        constraintConfig: extractContraintConfig(tournament.configuration),
    });

    return round.groups.flatMap((group) => {
        const slots = resolver.slotsOf(group, round.number);
        const expected = group.matchCount + group.byeCount;
        if (slots.length !== expected) {
            logger.warn(
                `${tournament.code} session ${round.number}: ${group.key} has ${slots.length} slots, ${expected} planned`,
            );
        }
        logger.debug(
            `${tournament.code} session ${round.number}: ${group.key}, ${slots.length} slots`,
        );
        const pool = virtualPools.find((vp) => vp.name === group.key)!;
        return slots.map((slot) => slotToMatch(slot, pool, tournament, session));
    });
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
