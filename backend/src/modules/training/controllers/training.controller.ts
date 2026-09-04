import {
    Body,
    Controller,
    Delete,
    Logger,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
} from '@nestjs/common';
import { runGuarded } from 'src/common/http/run-guarded.util';
import { AddTrainingMemberDto } from '../dto/add-training-member.dto';
import { CreateTrainingDto } from '../dto/create-training.dto';
import { TrainingAdminAccessDto } from '../dto/training-admin-access.dto';
import { TrainingPasswordDto } from '../dto/training-password.dto';
import { UpdateTrainingDto } from '../dto/update-training.dto';
import { AdminTrainingDto } from '../responses/admin-training.dto';
import { TrainingsService } from '../services/trainings.service';

@Controller('trainings')
export class TrainingController {
    private readonly logger = new Logger(TrainingController.name);

    constructor(private readonly trainingsService: TrainingsService) {}

    @Post()
    create(@Body() dto: CreateTrainingDto): Promise<AdminTrainingDto> {
        return runGuarded(
            this.logger,
            "Erreur interne lors de la création de l'entraînement.",
            () => this.trainingsService.create(dto),
            { uniqueViolationMessage: "Le code d'entraînement existe déjà." },
        );
    }

    @Post('admin-access')
    adminAccess(@Body() dto: TrainingAdminAccessDto): Promise<AdminTrainingDto> {
        return runGuarded(this.logger, "Erreur lors de l'accès administrateur.", () =>
            this.trainingsService.authenticateAdmin(dto.code, dto.password),
        );
    }

    @Patch(':code')
    update(@Param('code') code: string, @Body() dto: UpdateTrainingDto): Promise<AdminTrainingDto> {
        return runGuarded(this.logger, "Erreur lors de la mise à jour de l'entraînement.", () =>
            this.trainingsService.update(code, dto),
        );
    }

    @Post(':code/members')
    addMember(
        @Param('code') code: string,
        @Body() dto: AddTrainingMemberDto,
    ): Promise<AdminTrainingDto> {
        return runGuarded(this.logger, "Erreur lors de l'ajout du membre.", () =>
            this.trainingsService.addMember(code, dto),
        );
    }

    @Delete(':code/members/:memberId')
    removeMember(
        @Param('code') code: string,
        @Param('memberId', ParseUUIDPipe) memberId: string,
        @Body() dto: TrainingPasswordDto,
    ): Promise<AdminTrainingDto> {
        return runGuarded(this.logger, 'Erreur lors du retrait du membre.', () =>
            this.trainingsService.removeMember(code, memberId, dto.password),
        );
    }
}
