import { Controller, Get, Param } from '@nestjs/common';
import { TrainingCurrentMatchDto } from '../responses/training-current-match.dto';
import { TrainingMatchDto } from '../responses/training-round.dto';
import { TrainingParticipantViewService } from '../services/training-participant-view.service';

@Controller('trainings/sessions/:sessionCode/participants/:participantCode')
export class TrainingParticipantController {
    constructor(private readonly participantViewService: TrainingParticipantViewService) {}

    @Get('current-match')
    getCurrentMatch(
        @Param('sessionCode') sessionCode: string,
        @Param('participantCode') participantCode: string,
    ): Promise<TrainingCurrentMatchDto> {
        return this.participantViewService.getCurrentMatch(sessionCode, participantCode);
    }

    @Get('history')
    getHistory(
        @Param('sessionCode') sessionCode: string,
        @Param('participantCode') participantCode: string,
    ): Promise<TrainingMatchDto[]> {
        return this.participantViewService.getHistory(sessionCode, participantCode);
    }
}
