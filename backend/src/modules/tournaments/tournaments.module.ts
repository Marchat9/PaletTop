import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RealtimeModule } from '../realtime/realtime.module';
import { MatchesSession } from '../../entities/matches-session.entity';
import { Player } from '../../entities/player.entity';
import { PlayerClub } from '../../entities/player_club.entity';
import { TournamentMatch } from '../../entities/tounament-match.entity';
import { TournamentPool } from '../../entities/tournament-pool.entity';
import { Team } from '../../entities/team.entity';
import { Tournament } from '../../entities/tournament.entity';
import { PoolRepository } from './repositories/pool.repository';
import { PoolService } from './services/pool.service';
import { RankingService } from './services/ranking.service';
import { ScoreService } from './services/score.service';
import { SessionService } from './services/session.service';
import { TeamController } from './controllers/team.controller';
import { ScoreController } from './controllers/score.controller';
import { TournamentsController } from './controllers/tournaments.controller';
import { MatchRepository } from './repositories/match.repository';
import { PlayerClubRepository } from './repositories/player-club.repository';
import { SessionRepository } from './repositories/session.repository';
import { TeamRepository } from './repositories/team.repository';
import { TournamentRepository } from './repositories/tournament.repository';
import { TournamentAuthService } from './services/tournament-auth.service';
import { TournamentsService } from './services/tournaments.service';
import { TournamentStrategyFactory } from './strategies/tournament-strategy.factory';
import { SessionController } from 'src/modules/tournaments/controllers/session.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Tournament,
            Team,
            Player,
            PlayerClub,
            TournamentMatch,
            TournamentPool,
            MatchesSession,
        ]),
        RealtimeModule,
    ],
    controllers: [TournamentsController, TeamController, ScoreController, SessionController],
    providers: [
        TournamentRepository,
        TeamRepository,
        PlayerClubRepository,
        MatchRepository,
        SessionRepository,
        PoolRepository,
        TournamentAuthService,
        TournamentsService,
        PoolService,
        SessionService,
        RankingService,
        ScoreService,
        TournamentStrategyFactory,
    ],
    exports: [
        TournamentRepository,
        MatchRepository,
        SessionRepository,
        PoolRepository,
        TournamentAuthService,
        TournamentsService,
        PoolService,
        SessionService,
        RankingService,
        ScoreService,
        TournamentStrategyFactory,
    ],
})
export class TournamentsModule {}
