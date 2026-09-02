import { Logger } from '@nestjs/common';
import { MatchesSession } from 'src/entities/matches-session.entity';
import { Team } from 'src/entities/team.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { ChampionShipCompetitionConfiguration } from 'src/entities/tournament-competition-configuration.entity';
import { TournamentPool } from 'src/entities/tournament-pool.entity';
import { Tournament } from 'src/entities/tournament.entity';
import { MatchStatus } from 'src/enum/status.enum';
import { DeepPartial } from 'typeorm';
import { TournamentStatusInfo } from '../../../tournaments/responses/tournament-status.dto';
import { MatchRepository } from '../../repositories/match.repository';
import { PoolService } from '../../services/pool.service';
import { extractCompetitionConfiguration } from '../../utils/tournament.utils';
import { toPoolRef, toSessionRef, toTeamRef, toTournamentRef } from '../../utils/type-orm-ref.utils';
import { TournamentStrategy } from '../tournament-strategy.abstract';
import { computePhaseName } from './championship-session.utils';

export class ChampionshipTournamentStrategy extends TournamentStrategy {
    private readonly logger = new Logger(ChampionshipTournamentStrategy.name);

    private readonly nbTotalTeam: number = 8;

    constructor(
        private readonly poolService: PoolService,
        private readonly matchRepo: MatchRepository,
    ) {
        super();
    }

    override async prepareTournamentStart(tournament: Tournament): Promise<Tournament> {
        if (tournament.teams.length !== this.nbTotalTeam) {
            throw new Error(`Il faut exactement ${this.nbTotalTeam} équipes pour un championats`);
        }

        const config = this.getConfig(tournament);

        const homeTeam = tournament.teams.filter(t => t.club === config.homeClub);
        const awayTeam = tournament.teams.filter(t => t.club === config.awayClub);
        // Si il n'y a pas le même nombre d'equipe ou que ce n'est pas pair
        if (homeTeam.length !== awayTeam.length) {
            throw new Error(`Il n'y a pas le même nombre d'équipe dans les deux clubs`);
        }

        return tournament;
    }

    override async assignTeamsToFirstPools(tournament: Tournament): Promise<TournamentPool[]> {
        this.logger.debug('Starting assignTeamsToPools with tournament code: ' + tournament.code);
        return await this.poolService.assignTeamsToPools(tournament, 1);
    }

    override async generateSessionMatches(
        tournament: Tournament,
        session: MatchesSession,
    ): Promise<TournamentMatch[]> {
        const config = this.getConfig(tournament);

        // ref 
        const tournamentRef: Tournament = toTournamentRef(tournament);
        const sessionRef: MatchesSession = toSessionRef(session);
        const poolRef = toPoolRef(tournament.pools[0]);

        // Data 
        const homeClubTeams: Team[] = tournament.teams.filter(t => t.club === config.homeClub).sort((a, b) => a.id.localeCompare(b.id));
        const awayClubTeams: Team[] = tournament.teams.filter(t => t.club === config.awayClub).sort((a, b) => a.id.localeCompare(b.id));

        const currentSessionNumber: number = session.sessionNumber;
        const sessionIndex: number = currentSessionNumber - 1;


        const partialMatchs: DeepPartial<TournamentMatch[]> = homeClubTeams.map((homeTeam, index) => ({
            tournament: tournamentRef,
            session: sessionRef,
            sessionNumber: session.sessionNumber,
            pool: poolRef,
            teamA: toTeamRef(homeTeam),
            teamB: toTeamRef(awayClubTeams[(sessionIndex + index) % awayClubTeams.length]),
            isBye: false,
            status: MatchStatus.PENDING,
        })
        );

        const matches = partialMatchs.map((match) => this.matchRepo.create(match));
        const assignedMatches = this.assignPlateNumbers(matches);
        return await this.matchRepo.save(assignedMatches);
    }

    override computeTournamentStatus(
        tournament: Tournament,
        sessions: MatchesSession[],
    ): TournamentStatusInfo {
        const currentSessionNumber = this.currentSessionNumber(sessions);
        const allValidated = this.allMatchesValidated(sessions);
        const isFinal = currentSessionNumber === this.nbTotalTeam / 2;

        return {
            currentSession: currentSessionNumber,
            phaseName: computePhaseName(
                tournament.status,
                currentSessionNumber
            ),
            canFinishTournament: allValidated && isFinal,
            canGenerateNewSession: allValidated && !isFinal,
        };
    }

    private getConfig(tournament: Tournament): ChampionShipCompetitionConfiguration {
        return extractCompetitionConfiguration(
            tournament.configuration,
        ) as ChampionShipCompetitionConfiguration;
    }
}
