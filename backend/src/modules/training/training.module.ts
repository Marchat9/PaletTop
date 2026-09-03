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
import { TrainingSessionController } from './controllers/training-session.controller';
import { TrainingMemberRepository } from './repositories/training-member.repository';
import { TrainingParticipantRepository } from './repositories/training-participant.repository';
import { TrainingSessionRepository } from './repositories/training-session.repository';
import { TrainingRepository } from './repositories/training.repository';
import { TrainingAuthService } from './services/training-auth.service';
import { TrainingSessionsService } from './services/training-sessions.service';
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
    controllers: [TrainingController, TrainingSessionController],
    providers: [
        TrainingRepository,
        TrainingMemberRepository,
        TrainingSessionRepository,
        TrainingParticipantRepository,
        TrainingAuthService,
        TrainingsService,
        TrainingSessionsService,
    ],
    exports: [
        TrainingRepository,
        TrainingMemberRepository,
        TrainingSessionRepository,
        TrainingParticipantRepository,
        TrainingAuthService,
        TrainingsService,
        TrainingSessionsService,
    ],
})
export class TrainingModule {}
