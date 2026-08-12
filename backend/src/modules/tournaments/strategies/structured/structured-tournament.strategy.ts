import { Logger } from '@nestjs/common';
import { MatchesSession } from 'src/entities/matches-session.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { StructuredCompetitionConfiguration } from 'src/entities/tournament-competition-configuration.entity';
import { TournamentPool } from 'src/entities/tournament-pool.entity';
import { Tournament } from 'src/entities/tournament.entity';
import { MatchGroupKey } from 'src/enum/tounament.enum';
import { TournamentRepository } from 'src/modules/tournaments/repositories/tournament.repository';
import { extractCompetitionConfiguration } from 'src/modules/tournaments/utils/tournament.utils';
import { DeepPartial } from 'typeorm';
import { MatchRepository } from '../../../tournaments/repositories/match.repository';
import { PoolRepository } from '../../../tournaments/repositories/pool.repository';
import { TournamentStatusInfo } from '../../../tournaments/responses/tournament-status.dto';
import { PoolService } from '../../../tournaments/services/pool.service';
import { computePrincipalBracketSize } from '../../../tournaments/utils/bracket.utils';
import { TournamentStrategy } from '../tournament-strategy.abstract';
import {
    computePhaseName,
    generateEliminationMatches,
    generateQualifyingMatches,
} from './structured-session.utils';

export class StructuredTournamentStrategy extends TournamentStrategy {
    private readonly logger = new Logger(StructuredTournamentStrategy.name);

    constructor(
        private readonly poolService: PoolService,
        private readonly matchRepo: MatchRepository,
        private readonly poolRepo: PoolRepository,
        private readonly tournamentRepo: TournamentRepository,
    ) {
        super();
    }

    override async prepareTournamentStart(tournament: Tournament): Promise<void> {
        this.logger.debug(
            'Starting prepareTournamentStart with tournament code: ' + tournament.code,
        );
        const config = this.getConfig(tournament);

        config.principalBracketSize =
            config.principalBracketSize ?? computePrincipalBracketSize(tournament.teams.length);

        await this.tournamentRepo.save({
            id: tournament.id,
            configuration: tournament.configuration,
        });
    }

    override async assignTeamsToPools(tournament: Tournament): Promise<TournamentPool[]> {
        this.logger.debug('Starting assignTeamsToPools with tournament code: ' + tournament.code);
        const config = this.getConfig(tournament);

        return await this.poolService.assignTeamsToPools(tournament, config.numberOfPools);
    }

    override async generateSessionMatches(
        tournament: Tournament,
        session: MatchesSession,
        pastMatches: TournamentMatch[],
    ): Promise<TournamentMatch[]> {
        this.logger.debug(
            'Starting generateSessionMatches with tournament code: ' + tournament.code,
        );
        const config = this.getConfig(tournament);

        const qualifyingRounds = config.numberOfQualifyingRounds ?? 0;
        const isElimination = session.sessionNumber > qualifyingRounds;

        let partialMatches: DeepPartial<TournamentMatch>[];
        const generationStartedAt = Date.now();
        if (isElimination) {
            const ranking = this.computeGlobalRanking(
                tournament,
                pastMatches.filter((m) => (m.sessionNumber ?? 0) <= qualifyingRounds),
            );
            const virtualPools: TournamentPool[] = await this.getOrCreateVirtualPools(
                tournament.id,
                Object.values(MatchGroupKey),
            );

            partialMatches = generateEliminationMatches(
                tournament,
                config,
                session,
                pastMatches,
                ranking,
                virtualPools,
            );
        } else {
            partialMatches = generateQualifyingMatches(tournament, session, pastMatches);
        }
        this.logger.debug(
            `generateSessionMatches: ${partialMatches.length} matches generated in ${Date.now() - generationStartedAt} ms`,
        );

        const matches = partialMatches.map((match) => this.matchRepo.create(match));

        const assignedMatches = this.assignPlateNumbers(matches);

        const saved = await this.matchRepo.save(assignedMatches);
        return saved;
    }

    override computeTournamentStatus(
        tournament: Tournament,
        sessions: MatchesSession[],
    ): TournamentStatusInfo {
        this.logger.debug(
            'Starting computeTournamentStatus with tournament code: ' + tournament.code,
        );
        const config = this.getConfig(tournament);

        const numberOfQualifyingRounds = config.numberOfQualifyingRounds ?? 0;
        const currentSessionNumber = this.currentSessionNumber(sessions);
        const isElimination = currentSessionNumber > numberOfQualifyingRounds;
        const allValidated = this.allMatchesValidated(sessions);
        const nbTeamStillInGame =
            (config.principalBracketSize ?? 0) /
            Math.pow(2, Math.max(currentSessionNumber - (numberOfQualifyingRounds ?? 0) - 1, 0));
        const isFinal = isElimination && nbTeamStillInGame <= 2;

        return {
            currentSession: currentSessionNumber,
            phaseName: computePhaseName(
                tournament.status,
                isElimination,
                nbTeamStillInGame,
                currentSessionNumber,
                config.hasThirdPlaceMatch,
                numberOfQualifyingRounds,
            ),
            canFinishTournament: isElimination && allValidated && isFinal,
            canGenerateNewSession: allValidated && !isFinal,
        };
    }

    private async getOrCreateVirtualPools(
        tournamentId: string,
        groupKeys: MatchGroupKey[],
    ): Promise<TournamentPool[]> {
        return Promise.all(
            groupKeys.map((groupKey) => this.getOrCreateVirtualPool(tournamentId, groupKey)),
        );
    }

    private async getOrCreateVirtualPool(
        tournamentId: string,
        groupKey: MatchGroupKey,
    ): Promise<TournamentPool> {
        const existing = await this.poolRepo.findVirtualPoolByName(tournamentId, groupKey);
        if (existing) return existing;
        return this.poolRepo.save(
            this.poolRepo.create({
                tournament: { id: tournamentId } as Tournament,
                poolNumber: 0,
                name: groupKey,
            }),
        );
    }

    private getConfig(tournament: Tournament): StructuredCompetitionConfiguration {
        return extractCompetitionConfiguration(
            tournament.configuration,
        ) as StructuredCompetitionConfiguration;
    }
}
