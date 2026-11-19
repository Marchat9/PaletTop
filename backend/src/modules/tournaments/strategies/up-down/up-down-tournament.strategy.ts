import { InternalServerErrorException, Logger } from '@nestjs/common';
import { MatchesSession } from 'src/entities/matches-session.entity';
import { Team } from 'src/entities/team.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { UpDownCompetitionConfiguration } from 'src/entities/tournament-competition-configuration.entity';
import { TournamentPool } from 'src/entities/tournament-pool.entity';
import { Tournament } from 'src/entities/tournament.entity';
import { MatchesSessionStatus, TournamentStatus } from 'src/enum/status.enum';
import { ConstraintConfig } from 'src/model/constraint.model';
import { MatchRepository } from 'src/modules/tournaments/repositories/match.repository';
import { PoolService } from 'src/modules/tournaments/services/pool.service';
import {
    extractCompetitionConfiguration,
    extractContraintConfig,
} from 'src/modules/tournaments/utils/tournament.utils';
import { DeepPartial } from 'typeorm';
import { TournamentStatusInfo } from '../../../tournaments/responses/tournament-status.dto';
import { TournamentStrategy } from '../tournament-strategy.abstract';
import {
    generateMatchesByRanking,
    generateMatchesFromPairs,
    generateMatchesInPool,
    orderTeamsByRanking,
} from 'src/modules/tournaments/utils/match.utils';
import { generateDutchPairs } from './dutch-pairing.utils';
import { computePhaseName, isDutchRound, isRankingRound } from './up-down-session.utils';

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
        );

        const matches = partialMatches.map((match) => this.matchRepo.create(match));

        const assignedMatches = this.assignPlateNumbers(matches);
        return await this.matchRepo.save(assignedMatches);
    }

    /**
     * Random draw, Dutch Swiss pairing, or ranking-based last round (1v2, 3v4... strictly by
     * ranking, whatever the pairing mode).
     */
    private buildSessionMatches(
        tournament: Tournament,
        session: MatchesSession,
        pool: TournamentPool,
        teams: Team[],
        constraintConfig: ConstraintConfig,
        pastMatches: TournamentMatch[],
    ): DeepPartial<TournamentMatch>[] {
        const config = this.getConfig(tournament);

        if (
            isRankingRound(config, session.sessionNumber) ||
            isDutchRound(config, session.sessionNumber)
        ) {
            const ranking = this.computeGlobalRanking(tournament, pastMatches);
            const rankedTeams = orderTeamsByRanking(teams, ranking);

            if (isDutchRound(config, session.sessionNumber)) {
                const winsByTeam = new Map(ranking.map((entry) => [entry.teamId, entry.wins]));
                const { pairs, byeTeam } = generateDutchPairs(
                    rankedTeams,
                    winsByTeam,
                    pastMatches,
                    constraintConfig,
                );
                this.logger.log(
                    `Tournament ${tournament.code}: session ${session.sessionNumber} paired by the Dutch Swiss system`,
                );
                return generateMatchesFromPairs(pool, pairs, byeTeam, true, tournament, session);
            }
            return generateMatchesByRanking(pool, rankedTeams, tournament, session);
        }

        return generateMatchesInPool(
            pool,
            teams,
            tournament,
            session,
            constraintConfig,
            pastMatches,
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
     * Drawn rounds only: the ranking-based last round and the Dutch rounds (paired from the
     * results) are not, so their scores are locked once the round is closed.
     */
    override isDrawnSession(tournament: Tournament, sessionNumber: number): boolean {
        const config = this.getConfig(tournament);
        return !isRankingRound(config, sessionNumber) && !isDutchRound(config, sessionNumber);
    }

    private getConfig(tournament: Tournament): UpDownCompetitionConfiguration {
        return extractCompetitionConfiguration(
            tournament.configuration,
        ) as UpDownCompetitionConfiguration;
    }
}
