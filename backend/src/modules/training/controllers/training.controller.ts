import {
    Body,
    ConflictException,
    Controller,
    Delete,
    HttpException,
    InternalServerErrorException,
    Logger,
    Param,
    Patch,
    Post,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
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
    async create(@Body() dto: CreateTrainingDto): Promise<AdminTrainingDto> {
        try {
            return await this.trainingsService.create(dto);
        } catch (error: unknown) {
            if (error instanceof HttpException) {
                throw error;
            }

            this.logger.error('Training creation failed', error);

            if (error instanceof QueryFailedError) {
                const driverError = error.driverError as { code?: string } | undefined;
                if (driverError?.code === '23505') {
                    throw new ConflictException("Le code d'entraînement existe déjà.");
                }
            }

            throw new InternalServerErrorException(
                "Erreur interne lors de la création de l'entraînement.",
            );
        }
    }

    @Post('admin-access')
    adminAccess(@Body() dto: TrainingAdminAccessDto): Promise<AdminTrainingDto> {
        return this.trainingsService.authenticateAdmin(dto.code, dto.password);
    }

    @Patch(':code')
    update(@Param('code') code: string, @Body() dto: UpdateTrainingDto): Promise<AdminTrainingDto> {
        return this.trainingsService.update(code, dto);
    }

    @Post(':code/members')
    addMember(
        @Param('code') code: string,
        @Body() dto: AddTrainingMemberDto,
    ): Promise<AdminTrainingDto> {
        return this.trainingsService.addMember(code, dto);
    }

    @Delete(':code/members/:memberId')
    removeMember(
        @Param('code') code: string,
        @Param('memberId') memberId: string,
        @Body() dto: TrainingPasswordDto,
    ): Promise<AdminTrainingDto> {
        return this.trainingsService.removeMember(code, memberId, dto.password);
    }
}
