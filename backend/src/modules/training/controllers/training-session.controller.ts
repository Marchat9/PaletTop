import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { CheckinParticipantDto } from '../dto/checkin-participant.dto';
import { CreateTrainingSessionDto } from '../dto/create-training-session.dto';
import { TrainingPasswordDto } from '../dto/training-password.dto';
import {
    TrainingSessionAdminDto,
    TrainingSessionPublicDto,
} from '../responses/training-session.dto';
import { TrainingSessionsService } from '../services/training-sessions.service';

@Controller('trainings')
export class TrainingSessionController {
    constructor(private readonly sessionsService: TrainingSessionsService) {}

    @Post(':code/sessions')
    create(
        @Param('code') code: string,
        @Body() dto: CreateTrainingSessionDto,
    ): Promise<TrainingSessionAdminDto> {
        return this.sessionsService.create(code, dto);
    }

    @Get('sessions/:sessionCode')
    getPublic(@Param('sessionCode') sessionCode: string): Promise<TrainingSessionPublicDto> {
        return this.sessionsService.getPublic(sessionCode);
    }

    @Post('sessions/:sessionCode/admin-access')
    getAdmin(
        @Param('sessionCode') sessionCode: string,
        @Body() dto: TrainingPasswordDto,
    ): Promise<TrainingSessionAdminDto> {
        return this.sessionsService.getAdmin(sessionCode, dto.password);
    }

    @Post('sessions/:sessionCode/close')
    close(
        @Param('sessionCode') sessionCode: string,
        @Body() dto: TrainingPasswordDto,
    ): Promise<TrainingSessionAdminDto> {
        return this.sessionsService.close(sessionCode, dto.password);
    }

    @Post('sessions/:sessionCode/checkin')
    checkin(
        @Param('sessionCode') sessionCode: string,
        @Body() dto: CheckinParticipantDto,
    ): Promise<TrainingSessionAdminDto> {
        return this.sessionsService.checkin(sessionCode, dto);
    }

    @Delete('sessions/:sessionCode/participants/:participantId')
    removeParticipant(
        @Param('sessionCode') sessionCode: string,
        @Param('participantId') participantId: string,
        @Body() dto: TrainingPasswordDto,
    ): Promise<TrainingSessionAdminDto> {
        return this.sessionsService.removeParticipant(sessionCode, participantId, dto.password);
    }
}
