import { Body, Controller, Logger, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { runGuarded } from 'src/common/http/run-guarded.util';
import { AdminUpdateTrainingScoreDto } from '../dto/admin-update-training-score.dto';
import { StartTrainingMatchDto } from '../dto/start-training-match.dto';
import { UpdateTrainingScoreDto } from '../dto/update-training-score.dto';
import { ValidateTrainingMatchDto } from '../dto/validate-training-match.dto';
import { TrainingMatchDto } from '../responses/training-round.dto';
import { TrainingScoreService } from '../services/training-score.service';

@Controller('trainings/sessions/:sessionCode/matches/:matchId')
export class TrainingScoreController {
    private readonly logger = new Logger(TrainingScoreController.name);

    constructor(private readonly trainingScoreService: TrainingScoreService) {}

    @Post('start')
    start(
        @Param('sessionCode') sessionCode: string,
        @Param('matchId', ParseUUIDPipe) matchId: string,
        @Body() dto: StartTrainingMatchDto,
    ): Promise<TrainingMatchDto> {
        return runGuarded(this.logger, 'Erreur lors du démarrage du match.', () =>
            this.trainingScoreService.startMatch(sessionCode, matchId, dto.participantCode),
        );
    }

    @Patch('score')
    updateScore(
        @Param('sessionCode') sessionCode: string,
        @Param('matchId', ParseUUIDPipe) matchId: string,
        @Body() dto: UpdateTrainingScoreDto,
    ): Promise<TrainingMatchDto> {
        return runGuarded(this.logger, 'Erreur lors de la mise à jour du score.', () =>
            this.trainingScoreService.updateScore(
                sessionCode,
                matchId,
                dto.participantCode,
                dto.scoreA,
                dto.scoreB,
            ),
        );
    }

    @Post('validate')
    validate(
        @Param('sessionCode') sessionCode: string,
        @Param('matchId', ParseUUIDPipe) matchId: string,
        @Body() dto: ValidateTrainingMatchDto,
    ): Promise<TrainingMatchDto> {
        return runGuarded(this.logger, 'Erreur lors de la validation du match.', () =>
            this.trainingScoreService.validateMatch(
                sessionCode,
                matchId,
                dto.participantCode,
                dto.opponentParticipantCode,
            ),
        );
    }

    @Patch('score/admin')
    adminUpdateScore(
        @Param('sessionCode') sessionCode: string,
        @Param('matchId', ParseUUIDPipe) matchId: string,
        @Body() dto: AdminUpdateTrainingScoreDto,
    ): Promise<TrainingMatchDto> {
        return runGuarded(this.logger, 'Erreur lors de la correction du score.', () =>
            this.trainingScoreService.adminUpdateScore(
                sessionCode,
                matchId,
                dto.password,
                dto.scoreA,
                dto.scoreB,
            ),
        );
    }
}
