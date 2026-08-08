import { InternalServerErrorException, Logger } from '@nestjs/common';
import { MatchesSession } from 'src/entities/matches-session.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { UpDownCompetitionConfiguration } from 'src/entities/tournament-competition-configuration.entity';
import { TournamentPool } from 'src/entities/tournament-pool.entity';
import { Tournament } from 'src/entities/tournament.entity';
import { MatchesSessionStatus, TournamentStatus } from 'src/enum/status.enum';
import { ConstraintConfig } from 'src/model/constraint.model';
import { MatchRepository } from 'src/modules/tournaments/repositories/match.repository';
import { PoolService } from 'src/modules/tournaments/services/pool.service';
import { generateMatchesInPool } from 'src/modules/tournaments/strategies/structured/structured-session.utils';
import {
    extractCompetitionConfiguration,
    extractContraintConfig,
} from 'src/modules/tournaments/utils/tournament.utils';
import { DeepPartial } from 'typeorm';
import { TournamentStatusInfo } from '../../../tournaments/responses/tournament-status.dto';
import { TournamentStrategy } from '../tournament-strategy.abstract';

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
        pastMatches: TournamentMatch[],
    ): Promise<TournamentMatch[]> {
        this.logger.debug(
            'Starting generateSessionMatches with tournament code: ' + tournament.code,
        );
        // TODO: Logique montante-descendante (up-down / progressive)
        //
        // Principe :
        // - Session 1 : tirage aléatoire parmi toutes les équipes (pas de poules)
        // - Sessions suivantes : appariement par niveau selon classement courant
        //   → équipe 1 vs équipe 2, équipe 3 vs équipe 4, etc.
        //   → permet un affinage progressif du classement réel
        //
        // Différences avec STANDARD :
        // - Pas de poules (pool = null sur les matchs)
        // - assignTeamsToPools() n'est pas appelé (pas de pools)
        // - Le bye est possible (équipe exemptée si nombre impair)
        //
        // Inputs :
        // - tournament.configuration.numberOfPlaques → nombre de matchs simultanés
        // - pastMatches → classement courant pour l'appariement
        //
        // Output : liste de TournamentMatch[] à persister

        const constraintConfig: ConstraintConfig = extractContraintConfig(tournament.configuration);

        const pool = tournament.pools[0] ?? null;
        if (!pool) {
            throw new InternalServerErrorException(
                "La compétition Montantes/Descendantes est sensée n'avoir qu'une pool.",
            );
        }

        const partialMatches: DeepPartial<TournamentMatch>[] = generateMatchesInPool(
            { id: pool.id } as TournamentPool,
            pool.teams,
            tournament,
            session,
            constraintConfig,
            pastMatches,
        );

        const matches = partialMatches.map((match) => this.matchRepo.create(match));

        const assignedMatches = this.assignPlateNumbers(matches);
        return this.matchRepo.save(assignedMatches);
    }

    override async assignTeamsToPools(tournament: Tournament): Promise<TournamentPool[]> {
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
            phaseName: 'Montée / Descente',
            canFinishTournament:
                tournament.status === TournamentStatus.ACTIVE && allValidated && canFinish,
            canGenerateNewSession:
                tournament.status === TournamentStatus.ACTIVE &&
                allValidated &&
                newSessionValidAboutNumberOfRound,
        };
    }

    private getConfig(tournament: Tournament): UpDownCompetitionConfiguration {
        return extractCompetitionConfiguration(
            tournament.configuration,
        ) as UpDownCompetitionConfiguration;
    }
}
