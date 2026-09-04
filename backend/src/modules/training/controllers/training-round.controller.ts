import { Body, Controller, Get, Logger, Param, ParseIntPipe, Post } from '@nestjs/common';
import { runGuarded } from 'src/common/http/run-guarded.util';
import { TrainingPasswordDto } from '../dto/training-password.dto';
import { TrainingRoundDto } from '../responses/training-round.dto';
import { TrainingRoundsService } from '../services/training-rounds.service';

@Controller('trainings/sessions/:sessionCode/rounds')
export class TrainingRoundController {
    private readonly logger = new Logger(TrainingRoundController.name);

    constructor(private readonly roundsService: TrainingRoundsService) {}

    @Post()
    generate(
        @Param('sessionCode') sessionCode: string,
        @Body() dto: TrainingPasswordDto,
    ): Promise<TrainingRoundDto> {
        return runGuarded(
            this.logger,
            'Erreur lors de la génération du round.',
            () => this.roundsService.generateNextRound(sessionCode, dto.password),
            {
                // Filet contre deux générations concurrentes pour la même session : le perdant de
                // la contrainte unique (session, numéro de round) obtient un 409 propre.
                uniqueViolationMessage:
                    'Un round est déjà en cours de génération pour cette session.',
            },
        );
    }

    @Get()
    listAll(@Param('sessionCode') sessionCode: string): Promise<TrainingRoundDto[]> {
        return runGuarded(this.logger, 'Erreur lors de la récupération des rounds.', () =>
            this.roundsService.listRounds(sessionCode),
        );
    }

    @Get(':roundNumber')
    get(
        @Param('sessionCode') sessionCode: string,
        @Param('roundNumber', ParseIntPipe) roundNumber: number,
    ): Promise<TrainingRoundDto> {
        return runGuarded(this.logger, 'Erreur lors de la récupération du round.', () =>
            this.roundsService.getRound(sessionCode, roundNumber),
        );
    }
}
