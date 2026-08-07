import { Logger } from '@nestjs/common';
import { MatchesSession } from 'src/entities/matches-session.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { TournamentPool } from 'src/entities/tournament-pool.entity';
import { Tournament } from 'src/entities/tournament.entity';
import { TournamentStatus } from 'src/enum/status.enum';
import { MatchGroupKey } from 'src/enum/tounament.enum';
import { TournamentRepository } from 'src/modules/tournaments/repositories/tournament.repository';
import { DeepPartial } from 'typeorm';
import { MatchRepository } from '../../../tournaments/repositories/match.repository';
import { PoolRepository } from '../../../tournaments/repositories/pool.repository';
import { TournamentStatusInfo } from '../../../tournaments/responses/tournament-status.dto';
import { PoolService } from '../../../tournaments/services/pool.service';
import { computePrincipalBracketSize } from '../../../tournaments/utils/bracket.utils';
import { TournamentStrategy } from '../tournament-strategy.abstract';
import {
    extractCompetitionConfiguration,
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
        const config = extractCompetitionConfiguration(tournament.configuration);

        config.principalBracketSize =
            config.principalBracketSize ?? computePrincipalBracketSize(tournament.teams.length);

        await this.tournamentRepo.save({
            id: tournament.id,
            configuration: tournament.configuration,
        });
    }

    override async assignTeamsToPools(tournament: Tournament): Promise<TournamentPool[]> {
        this.logger.debug('Starting assignTeamsToPools with tournament code: ' + tournament.code);
        const config = extractCompetitionConfiguration(tournament.configuration);

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
        const config = extractCompetitionConfiguration(tournament.configuration);

        const qualifyingRounds = config.numberOfQualifyingRounds ?? 0;
        const isElimination = session.sessionNumber > qualifyingRounds;

        let partialMatches: DeepPartial<TournamentMatch>[];
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
                session,
                pastMatches,
                ranking,
                virtualPools,
            );
        } else {
            partialMatches = generateQualifyingMatches(tournament, session, pastMatches);
        }

        const matches = partialMatches.map((match) => this.matchRepo.create(match));

        const assignedMatches = this.assignPlateNumbers(matches);
        return this.matchRepo.save(assignedMatches);
    }

    override computeTournamentStatus(
        tournament: Tournament,
        sessions: MatchesSession[],
    ): TournamentStatusInfo {
        this.logger.debug(
            'Starting computeTournamentStatus with tournament code: ' + tournament.code,
        );
        const config = extractCompetitionConfiguration(tournament.configuration);

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
            phaseName: this.computePhaseName(tournament, sessions),
            canFinishTournament: isElimination && allValidated && isFinal,
            canGenerateNewSession: allValidated && !isFinal,
        };
    }

    private computePhaseName(tournament: Tournament, sessions: MatchesSession[]): string {
        const config = extractCompetitionConfiguration(tournament.configuration);

        const numberOfQualifyingRounds = config.numberOfQualifyingRounds ?? 0;
        const currentSessionNumber = this.currentSessionNumber(sessions);
        const isElimination = currentSessionNumber > numberOfQualifyingRounds;
        const nbTeamStillInGame =
            (config.principalBracketSize ?? 0) /
            Math.pow(2, Math.max(currentSessionNumber - (numberOfQualifyingRounds ?? 0) - 1, 0));

        switch (true) {
            case tournament.status === TournamentStatus.DRAFT:
            case tournament.status === TournamentStatus.CANCELLED:
            case tournament.status === TournamentStatus.COMPLETED:
            default:
                return '';

            case tournament.status === TournamentStatus.ACTIVE && !isElimination:
                return 'Phase qualificative';

            case tournament.status === TournamentStatus.ACTIVE &&
                isElimination &&
                nbTeamStillInGame === 2:
                return 'Finale';

            case tournament.status === TournamentStatus.ACTIVE &&
                isElimination &&
                nbTeamStillInGame === 4:
                return 'Demi-Finale';

            case tournament.status === TournamentStatus.ACTIVE &&
                isElimination &&
                nbTeamStillInGame > 4:
                return 'Phase éliminatoire';
        }
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
}
