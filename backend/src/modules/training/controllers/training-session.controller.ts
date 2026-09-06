import { Body, Controller, Delete, Get, Logger, Param, Post } from '@nestjs/common';
import { runGuarded } from 'src/common/http/run-guarded.util';
import { UuidParam } from 'src/common/http/uuid-param.decorator';
import { CheckinParticipantDto } from '../dto/checkin-participant.dto';
import { CreateTrainingSessionDto } from '../dto/create-training-session.dto';
import { TrainingPasswordDto } from '../dto/training-password.dto';
import { TrainingLeaderboardEntryDto } from '../responses/training-leaderboard.dto';
import {
    TrainingSessionAdminDto,
    TrainingSessionPublicDto,
    TrainingSessionSummaryDto,
} from '../responses/training-session.dto';
import { TrainingLeaderboardService } from '../services/training-leaderboard.service';
import { TrainingSessionsService } from '../services/training-sessions.service';

@Controller('trainings')
export class TrainingSessionController {
    private readonly logger = new Logger(TrainingSessionController.name);

    constructor(
        private readonly sessionsService: TrainingSessionsService,
        private readonly leaderboardService: TrainingLeaderboardService,
    ) {}

    @Post(':code/sessions')
    create(
        @Param('code') code: string,
        @Body() dto: CreateTrainingSessionDto,
    ): Promise<TrainingSessionAdminDto> {
        return runGuarded(this.logger, 'Erreur lors de la création de la session.', () =>
            this.sessionsService.create(code, dto),
        );
    }

    @Post(':code/sessions/list')
    listSessions(
        @Param('code') code: string,
        @Body() dto: TrainingPasswordDto,
    ): Promise<TrainingSessionSummaryDto[]> {
        return runGuarded(this.logger, 'Erreur lors de la récupération des sessions.', () =>
            this.sessionsService.listSessions(code, dto.password),
        );
    }

    @Get('sessions/:sessionCode')
    getPublic(@Param('sessionCode') sessionCode: string): Promise<TrainingSessionPublicDto> {
        return runGuarded(this.logger, 'Erreur lors de la récupération de la session.', () =>
            this.sessionsService.getPublic(sessionCode),
        );
    }

    @Post('sessions/:sessionCode/admin-access')
    getAdmin(
        @Param('sessionCode') sessionCode: string,
        @Body() dto: TrainingPasswordDto,
    ): Promise<TrainingSessionAdminDto> {
        return runGuarded(this.logger, "Erreur lors de l'accès administrateur à la session.", () =>
            this.sessionsService.getAdmin(sessionCode, dto.password),
        );
    }

    @Post('sessions/:sessionCode/close')
    close(
        @Param('sessionCode') sessionCode: string,
        @Body() dto: TrainingPasswordDto,
    ): Promise<TrainingSessionAdminDto> {
        return runGuarded(this.logger, 'Erreur lors de la clôture de la session.', () =>
            this.sessionsService.close(sessionCode, dto.password),
        );
    }

    @Post('sessions/:sessionCode/checkin')
    checkin(
        @Param('sessionCode') sessionCode: string,
        @Body() dto: CheckinParticipantDto,
    ): Promise<TrainingSessionAdminDto> {
        return runGuarded(
            this.logger,
            'Erreur lors du check-in.',
            () => this.sessionsService.checkin(sessionCode, dto),
            {
                // Deux collisions possibles ici : le code à 4 chiffres (rare, retenter suffit) et
                // le même membre du roster check-in deux fois (cf. index nommé dédié) — message
                // différent puisque, pour la seconde, retenter ne sert à rien.
                pgErrorMessages: {
                    UQ_training_participant_active_member:
                        'Ce membre du roster est déjà inscrit à cette session.',
                    '23505': 'Collision de code participant, merci de réessayer.',
                },
            },
        );
    }

    @Delete('sessions/:sessionCode/participants/:participantId')
    removeParticipant(
        @Param('sessionCode') sessionCode: string,
        @UuidParam('participantId') participantId: string,
        @Body() dto: TrainingPasswordDto,
    ): Promise<TrainingSessionAdminDto> {
        return runGuarded(this.logger, 'Erreur lors du retrait du participant.', () =>
            this.sessionsService.removeParticipant(sessionCode, participantId, dto.password),
        );
    }

    @Get('sessions/:sessionCode/leaderboard')
    getLeaderboard(
        @Param('sessionCode') sessionCode: string,
    ): Promise<TrainingLeaderboardEntryDto[]> {
        return runGuarded(this.logger, 'Erreur lors de la récupération du classement.', () =>
            this.leaderboardService.getLeaderboard(sessionCode),
        );
    }
}
