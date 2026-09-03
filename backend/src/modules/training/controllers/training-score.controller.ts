import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import { AdminUpdateTrainingScoreDto } from '../dto/admin-update-training-score.dto';
import { StartTrainingMatchDto } from '../dto/start-training-match.dto';
import { UpdateTrainingScoreDto } from '../dto/update-training-score.dto';
import { ValidateTrainingMatchDto } from '../dto/validate-training-match.dto';
import { TrainingMatchDto } from '../responses/training-round.dto';
import { TrainingScoreService } from '../services/training-score.service';

@Controller('trainings/sessions/:sessionCode/matches/:matchId')
export class TrainingScoreController {
    constructor(private readonly trainingScoreService: TrainingScoreService) {}

    @Post('start')
    start(
        @Param('sessionCode') sessionCode: string,
        @Param('matchId') matchId: string,
        @Body() dto: StartTrainingMatchDto,
    ): Promise<TrainingMatchDto> {
        return this.trainingScoreService.startMatch(sessionCode, matchId, dto.participantCode);
    }

    @Patch('score')
    updateScore(
        @Param('sessionCode') sessionCode: string,
        @Param('matchId') matchId: string,
        @Body() dto: UpdateTrainingScoreDto,
    ): Promise<TrainingMatchDto> {
        return this.trainingScoreService.updateScore(
            sessionCode,
            matchId,
            dto.participantCode,
            dto.scoreA,
            dto.scoreB,
        );
    }

    @Post('validate')
    validate(
        @Param('sessionCode') sessionCode: string,
        @Param('matchId') matchId: string,
        @Body() dto: ValidateTrainingMatchDto,
    ): Promise<TrainingMatchDto> {
        return this.trainingScoreService.validateMatch(
            sessionCode,
            matchId,
            dto.participantCode,
            dto.opponentParticipantCode,
        );
    }

    @Patch('score/admin')
    adminUpdateScore(
        @Param('sessionCode') sessionCode: string,
        @Param('matchId') matchId: string,
        @Body() dto: AdminUpdateTrainingScoreDto,
    ): Promise<TrainingMatchDto> {
        return this.trainingScoreService.adminUpdateScore(
            sessionCode,
            matchId,
            dto.password,
            dto.scoreA,
            dto.scoreB,
        );
    }
}
