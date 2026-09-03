import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Training } from '../../entities/training.entity';
import { TrainingMember } from '../../entities/training-member.entity';
import { TrainingSession } from '../../entities/training-session.entity';
import { TrainingParticipant } from '../../entities/training-participant.entity';
import { TrainingTeam } from '../../entities/training-team.entity';
import { TrainingTeamMember } from '../../entities/training-team-member.entity';
import { TrainingRound } from '../../entities/training-round.entity';
import { TrainingMatch } from '../../entities/training-match.entity';
import { TrainingController } from './controllers/training.controller';
import { TrainingRoundController } from './controllers/training-round.controller';
import { TrainingScoreController } from './controllers/training-score.controller';
import { TrainingSessionController } from './controllers/training-session.controller';
import { TrainingTeamController } from './controllers/training-team.controller';
import { DefaultMatchmakingStrategy } from './domain/matchmaking/default-matchmaking.strategy';
import { MATCHMAKING_PORT } from './domain/matchmaking/matchmaking.types';
import { TrainingMatchRepository } from './repositories/training-match.repository';
import { TrainingMemberRepository } from './repositories/training-member.repository';
import { TrainingParticipantRepository } from './repositories/training-participant.repository';
import { TrainingRoundRepository } from './repositories/training-round.repository';
import { TrainingSessionRepository } from './repositories/training-session.repository';
import { TrainingTeamMemberRepository } from './repositories/training-team-member.repository';
import { TrainingTeamRepository } from './repositories/training-team.repository';
import { TrainingRepository } from './repositories/training.repository';
import { TrainingAuthService } from './services/training-auth.service';
import { TrainingRoundsService } from './services/training-rounds.service';
import { TrainingScoreService } from './services/training-score.service';
import { TrainingSessionAuthService } from './services/training-session-auth.service';
import { TrainingSessionsService } from './services/training-sessions.service';
import { TrainingTeamsService } from './services/training-teams.service';
import { TrainingsService } from './services/trainings.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Training,
            TrainingMember,
            TrainingSession,
            TrainingParticipant,
            TrainingTeam,
            TrainingTeamMember,
            TrainingRound,
            TrainingMatch,
        ]),
    ],
    controllers: [
        TrainingController,
        TrainingSessionController,
        TrainingTeamController,
        TrainingRoundController,
        TrainingScoreController,
    ],
    providers: [
        TrainingRepository,
        TrainingMemberRepository,
        TrainingSessionRepository,
        TrainingParticipantRepository,
        TrainingTeamRepository,
        TrainingTeamMemberRepository,
        TrainingRoundRepository,
        TrainingMatchRepository,
        TrainingAuthService,
        TrainingSessionAuthService,
        TrainingsService,
        TrainingSessionsService,
        TrainingTeamsService,
        TrainingRoundsService,
        TrainingScoreService,
        { provide: MATCHMAKING_PORT, useClass: DefaultMatchmakingStrategy },
    ],
    exports: [
        TrainingRepository,
        TrainingMemberRepository,
        TrainingSessionRepository,
        TrainingParticipantRepository,
        TrainingTeamRepository,
        TrainingTeamMemberRepository,
        TrainingRoundRepository,
        TrainingMatchRepository,
        TrainingAuthService,
        TrainingSessionAuthService,
        TrainingsService,
        TrainingSessionsService,
        TrainingTeamsService,
        TrainingRoundsService,
        TrainingScoreService,
    ],
})
export class TrainingModule {}
