import { BadRequestException, Injectable } from '@nestjs/common';
import { CompetitionMode } from 'src/enum/tounament.enum';
import { TournamentRepository } from 'src/modules/tournaments/repositories/tournament.repository';
import { MatchRepository } from '../../tournaments/repositories/match.repository';
import { PoolRepository } from '../../tournaments/repositories/pool.repository';
import { PoolService } from '../../tournaments/services/pool.service';
import { ChampionshipTournamentStrategy } from './championship/championship-tournament.strategy';
import { StructuredTournamentStrategy } from './structured/structured-tournament.strategy';
import { TournamentStrategy } from './tournament-strategy.abstract';
import { UpDownTournamentStrategy } from './up-down/up-down-tournament.strategy';

@Injectable()
export class TournamentStrategyFactory {
    constructor(
        private readonly poolService: PoolService,
        private readonly matchRepo: MatchRepository,
        private readonly poolRepo: PoolRepository,
        private readonly tournamentRepo: TournamentRepository,
    ) {}

    create(mode: CompetitionMode): TournamentStrategy {
        switch (mode) {
            case CompetitionMode.STANDARD:
                return new StructuredTournamentStrategy(
                    this.poolService,
                    this.matchRepo,
                    this.poolRepo,
                    this.tournamentRepo,
                );
            case CompetitionMode.UP_DOWN:
                return new UpDownTournamentStrategy(this.poolService, this.matchRepo);
            case CompetitionMode.CHAMPIONSHIP:
                return new ChampionshipTournamentStrategy();
            default:
                throw new BadRequestException(`Type de tournoi non supporté : ${mode}`);
        }
    }
}
