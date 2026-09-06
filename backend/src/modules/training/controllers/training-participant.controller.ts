import { Controller, Get, Logger, Param } from '@nestjs/common';
import { runGuarded } from 'src/common/http/run-guarded.util';
import { TrainingCurrentMatchDto } from '../responses/training-current-match.dto';
import { TrainingMatchDto } from '../responses/training-round.dto';
import { TrainingParticipantViewService } from '../services/training-participant-view.service';

@Controller('trainings/sessions/:sessionCode/participants/:participantCode')
export class TrainingParticipantController {
    private readonly logger = new Logger(TrainingParticipantController.name);

    constructor(private readonly participantViewService: TrainingParticipantViewService) {}

    @Get('current-match')
    getCurrentMatch(
        @Param('sessionCode') sessionCode: string,
        @Param('participantCode') participantCode: string,
    ): Promise<TrainingCurrentMatchDto> {
        return runGuarded(this.logger, 'Erreur lors de la récupération du match en cours.', () =>
            this.participantViewService.getCurrentMatch(sessionCode, participantCode),
        );
    }

    @Get('history')
    getHistory(
        @Param('sessionCode') sessionCode: string,
        @Param('participantCode') participantCode: string,
    ): Promise<TrainingMatchDto[]> {
        return runGuarded(this.logger, "Erreur lors de la récupération de l'historique.", () =>
            this.participantViewService.getHistory(sessionCode, participantCode),
        );
    }
}
