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
})
export class TrainingModule {}
