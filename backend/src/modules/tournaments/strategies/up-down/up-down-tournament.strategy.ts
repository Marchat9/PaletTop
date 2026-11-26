import { InternalServerErrorException, Logger } from '@nestjs/common';
import { MatchesSession } from 'src/entities/matches-session.entity';
import { Team } from 'src/entities/team.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { UpDownCompetitionConfiguration } from 'src/entities/tournament-competition-configuration.entity';
import { TournamentPool } from 'src/entities/tournament-pool.entity';
import { Tournament } from 'src/entities/tournament.entity';
import { MatchesSessionStatus, MatchStatus, TournamentStatus } from 'src/enum/status.enum';
import { ConstraintConfig } from 'src/model/constraint.model';
import { MatchRepository } from 'src/modules/tournaments/repositories/match.repository';
import { PoolService } from 'src/modules/tournaments/services/pool.service';
import {
    extractCompetitionConfiguration,
    extractContraintConfig,
} from 'src/modules/tournaments/utils/tournament.utils';
import { DeepPartial } from 'typeorm';
import { TournamentStatusInfo } from '../../../tournaments/responses/tournament-status.dto';
import { GenerationOptions, TournamentStrategy } from '../tournament-strategy.abstract';
import { ByeScore, qualifyingByeScore } from 'src/modules/tournaments/utils/bye.utils';
import {
    generateMatchesByRanking,
    generateMatchesFromPairs,
    generateMatchesInPool,
    orderFirstRoundMatches,
    orderMatchesByRanking,
    orderTeamsByRanking,
} from 'src/modules/tournaments/utils/match.utils';
import { buildSeed, seededRandom } from 'src/modules/tournaments/utils/seeded-random.utils';
import { generateDutchPairs } from './dutch-pairing.utils';
import { buildNeighborRound } from './neighbor-pairing.utils';
import {
    computeFrozenStandings,
    computePhaseName,
    isDutchRound,
    isNeighborRound,
    isRankingRound,
} from './up-down-session.utils';
import { GlobalRankingEntry } from '../../responses/ranking.dto';

export class UpDownTournamentStrategy extends TournamentStrategy {
    private readonly logger = new Logger(UpDownTournamentStrategy.name);

    constructor(
        private readonly poolService: PoolService,
        private readonly matchRepo: MatchRepository,
    ) {
        super();
    }
    override async generateSessionMatches(
        tournament: Tournament,
        session: MatchesSession,
        options: GenerationOptions,
    ): Promise<TournamentMatch[]> {
        this.logger.debug(
            'Starting generateSessionMatches with tournament code: ' + tournament.code,
        );
        const constraintConfig: ConstraintConfig = extractContraintConfig(tournament.configuration);
        const pastMatches = tournament.matches || [];

        const pool = tournament.pools[0] ?? null;
        if (!pool) {
            throw new InternalServerErrorException(
                "La compétition Montantes/Descendantes est sensée n'avoir qu'une pool.",
            );
        }

        const poolRef = { id: pool.id } as TournamentPool;
        const partialMatches = this.buildSessionMatches(
            tournament,
            session,
            poolRef,
            pool.teams,
            constraintConfig,
            pastMatches,
            qualifyingByeScore(tournament.configuration.pointsPerGame, options.byeLoserCap),
        );

        const matches = partialMatches.map((match) => this.matchRepo.create(match));

        const assignedMatches = this.assignPlateNumbers(matches);
        return await this.matchRepo.save(assignedMatches);
    }

    /**
     * Round 1 is drawn with the seed. The next ones follow the pairing mode (Dutch Swiss, ranking
     * neighbours or drawn) and their plates follow the ranking: plate 1 is the match of the best
     * ranked team. The frozen last round pairs ranking neighbours whatever the pairing mode,
     * constraints ignored, its bye worth nothing.
     */
    private buildSessionMatches(
        tournament: Tournament,
        session: MatchesSession,
        pool: TournamentPool,
        teams: Team[],
        constraintConfig: ConstraintConfig,
        pastMatches: TournamentMatch[],
        byeScore: ByeScore,
    ): DeepPartial<TournamentMatch>[] {
        const config = this.getConfig(tournament);
        const sessionNumber = session.sessionNumber;
        const drawRandom = seededRandom(buildSeed(tournament.id, 'draw', sessionNumber));

        if (sessionNumber === 1) {
            const drawn = generateMatchesInPool(
                pool,
                teams,
                tournament,
                session,
                constraintConfig,
                pastMatches,
                byeScore,
                drawRandom,
            );
            return orderFirstRoundMatches(
                drawn,
                seededRandom(buildSeed(tournament.id, 'draw', sessionNumber, 'plates')),
            );
        }

        const ranking = this.computeGlobalRanking(tournament, pastMatches);
        const rankedTeams = orderTeamsByRanking(teams, ranking);

        if (isRankingRound(config, sessionNumber)) {
            return generateMatchesByRanking(pool, rankedTeams, tournament, session);
        }

        if (isDutchRound(config, sessionNumber)) {
            const winsByTeam = new Map(ranking.map((entry) => [entry.teamId, entry.wins]));
            const { pairs, byeTeam } = generateDutchPairs(
                rankedTeams,
                winsByTeam,
                pastMatches,
                constraintConfig,
            );
            this.logger.log(
                `Tournament ${tournament.code}: session ${sessionNumber} paired by the Dutch Swiss system`,
            );
            return orderMatchesByRanking(
                generateMatchesFromPairs(pool, pairs, byeTeam, byeScore, tournament, session),
                ranking,
            );
        }

        if (isNeighborRound(config, sessionNumber)) {
            const { pairs, byeTeam } = buildNeighborRound(
                rankedTeams,
                pastMatches,
                constraintConfig,
                seededRandom(buildSeed(tournament.id, 'bye', sessionNumber)),
            );
            this.logger.log(
                `Tournament ${tournament.code}: session ${sessionNumber} paired by ranking neighbours`,
            );
            return orderMatchesByRanking(
                generateMatchesFromPairs(pool, pairs, byeTeam, byeScore, tournament, session),
                ranking,
            );
        }

        return orderMatchesByRanking(
            generateMatchesInPool(
                pool,
                teams,
                tournament,
                session,
                constraintConfig,
                pastMatches,
                byeScore,
                drawRandom,
            ),
            ranking,
        );
    }

    override async assignTeamsToFirstPools(tournament: Tournament): Promise<TournamentPool[]> {
        this.logger.debug('Starting assignTeamsToPools with tournament code: ' + tournament.code);

        // No Pool (1) in this monde, everyone is again everyone.
        return await this.poolService.assignTeamsToPools(tournament, 1);
    }

    override computeTournamentStatus(
        tournament: Tournament,
        sessions: MatchesSession[],
    ): TournamentStatusInfo {
        const config = this.getConfig(tournament);

        const numberOfRound: number | null = config.numberOfRound ?? null;
        const currentSessionNumber = this.currentSessionNumber(sessions);
        const hasAtLeastOneSessionClosed = sessions.some(
            (s) => s.status === MatchesSessionStatus.CLOSED,
        );
        const allValidated = this.allMatchesValidated(sessions);

        const canFinish: boolean =
            numberOfRound === null
                ? hasAtLeastOneSessionClosed
                : currentSessionNumber === numberOfRound;

        const newSessionValidAboutNumberOfRound: boolean =
            numberOfRound === null ? true : currentSessionNumber < numberOfRound;

        return {
            currentSession: currentSessionNumber,
            phaseName: computePhaseName(tournament.status, currentSessionNumber, config),
            canFinishTournament:
                tournament.status === TournamentStatus.ACTIVE && allValidated && canFinish,
            canGenerateNewSession:
                tournament.status === TournamentStatus.ACTIVE &&
                allValidated &&
                newSessionValidAboutNumberOfRound,
        };
    }

    /**
     * Drawn rounds only: the frozen last round, the Dutch rounds and the neighbour rounds (paired
     * from the results) are not, so their scores are locked once the round is closed.
     */
    override isDrawnSession(tournament: Tournament, sessionNumber: number): boolean {
        const config = this.getConfig(tournament);
        return (
            !isRankingRound(config, sessionNumber) &&
            !isDutchRound(config, sessionNumber) &&
            !isNeighborRound(config, sessionNumber)
        );
    }

    /**
     * Final standings. With a frozen last round, once it is validated, the plates give the order:
     * the winner of plate 1 first, its opponent second, and so on, the bye last. Before that, and
     * without a frozen round, it is the aggregate ranking.
     */
    override computeStandings(
        tournament: Tournament,
        matches: TournamentMatch[],
    ): GlobalRankingEntry[] {
        const aggregate = super.computeStandings(tournament, matches);
        const config = this.getConfig(tournament);
        const lastRound = config.numberOfRound;
        if (!lastRound || !isRankingRound(config, lastRound)) return aggregate;

        const lastRoundMatches = matches.filter((m) => m.sessionNumber === lastRound);
        const finished =
            lastRoundMatches.length > 0 &&
            lastRoundMatches.every((m) => m.status === MatchStatus.VALIDATED);
        return finished ? computeFrozenStandings(aggregate, lastRoundMatches) : aggregate;
    }

    private getConfig(tournament: Tournament): UpDownCompetitionConfiguration {
        return extractCompetitionConfiguration(
            tournament.configuration,
        ) as UpDownCompetitionConfiguration;
    }
}
