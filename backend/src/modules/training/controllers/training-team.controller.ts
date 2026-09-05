import { Body, Controller, Delete, Logger, Param, Post } from '@nestjs/common';
import { runGuarded } from 'src/common/http/run-guarded.util';
import { UuidParam } from 'src/common/http/uuid-param.decorator';
import { CreateFixedTeamDto } from '../dto/create-fixed-team.dto';
import { TrainingPasswordDto } from '../dto/training-password.dto';
import { TrainingSessionAdminDto } from '../responses/training-session.dto';
import { TrainingTeamsService } from '../services/training-teams.service';

@Controller('trainings/sessions/:sessionCode/teams')
export class TrainingTeamController {
    private readonly logger = new Logger(TrainingTeamController.name);

    constructor(private readonly trainingTeamsService: TrainingTeamsService) {}

    @Post()
    create(
        @Param('sessionCode') sessionCode: string,
        @Body() dto: CreateFixedTeamDto,
    ): Promise<TrainingSessionAdminDto> {
        return runGuarded(
            this.logger,
            "Erreur lors de la création de l'équipe.",
            () => this.trainingTeamsService.createFixedTeam(sessionCode, dto),
            {
                // Filet de sécurité si deux créations concurrentes passent toutes les deux la
                // vérification applicative : l'index unique partiel en base tranche, ceci traduit
                // sa violation en réponse propre plutôt qu'un 500 brut.
                pgErrorMessages: {
                    '23505': "Un des participants fait déjà partie d'une équipe fixe active.",
                },
            },
        );
    }

    @Delete(':teamId')
    dissolve(
        @Param('sessionCode') sessionCode: string,
        @UuidParam('teamId') teamId: string,
        @Body() dto: TrainingPasswordDto,
    ): Promise<TrainingSessionAdminDto> {
        return runGuarded(this.logger, "Erreur lors de la dissolution de l'équipe.", () =>
            this.trainingTeamsService.dissolveTeam(sessionCode, teamId, dto.password),
        );
    }
}
