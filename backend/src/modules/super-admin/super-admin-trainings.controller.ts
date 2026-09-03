import {
    Body,
    Controller,
    HttpCode,
    HttpException,
    HttpStatus,
    InternalServerErrorException,
    Logger,
    NotFoundException,
    Param,
    ParseUUIDPipe,
    Post,
    UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SuperAdminConfig } from 'src/config/super-admin.config';
import { TrainingRepository } from 'src/modules/training/repositories/training.repository';
import {
    SuperAdminTrainingDetailDto,
    toSuperAdminTrainingDetailDto,
} from './responses/super-admin-training-detail.dto';
import {
    SuperAdminTrainingSummaryDto,
    toSuperAdminTrainingSummaryDto,
} from './responses/super-admin-training-summary.dto';
import { SuperAdminActionDto } from './dto/super-admin-action.dto';
import { SuperAdminIdsDto } from './dto/super-admin-ids.dto';
import { SuperAdminTrainingPasswordDto } from './dto/super-admin-training-password.dto';
import { SuperAdminTrainingSearchDto } from './dto/super-admin-training-search.dto';
import { PaginatedDto } from './responses/paginated.dto';
import { SuperAdminAuthGuard } from './super-admin-auth.guard';

@Controller('super-admin/trainings')
@UseGuards(SuperAdminAuthGuard)
export class SuperAdminTrainingsController {
    private readonly logger = new Logger(SuperAdminTrainingsController.name);
    private readonly maxPageSize: number;

    constructor(
        private readonly trainingRepo: TrainingRepository,
        readonly configService: ConfigService,
    ) {
        this.maxPageSize = configService.getOrThrow<SuperAdminConfig>('superAdmin').maxPageSize;
    }

    @Post('search')
    @HttpCode(HttpStatus.OK)
    async search(
        @Body() dto: SuperAdminTrainingSearchDto,
    ): Promise<PaginatedDto<SuperAdminTrainingSummaryDto>> {
        try {
            const pageSize = Math.min(dto.pageSize, this.maxPageSize);
            const { items, total } = await this.trainingRepo.searchForAdmin({
                page: dto.page,
                pageSize,
                search: dto.search,
                sortBy: dto.sortBy,
                sortDir: dto.sortDir,
            });
            return { items: items.map(toSuperAdminTrainingSummaryDto), total };
        } catch (error: unknown) {
            if (error instanceof HttpException) throw error;
            this.logger.error('Super admin training search failed', error);
            throw new InternalServerErrorException(
                'Erreur lors de la recherche des entraînements.',
            );
        }
    }

    @Post(':id/detail')
    @HttpCode(HttpStatus.OK)
    async detail(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() _dto: SuperAdminActionDto,
    ): Promise<SuperAdminTrainingDetailDto> {
        try {
            const training = await this.trainingRepo.findByIdWithDetails(id);
            if (!training) {
                throw new NotFoundException('Entraînement introuvable.');
            }
            return toSuperAdminTrainingDetailDto(training);
        } catch (error: unknown) {
            if (error instanceof HttpException) throw error;
            this.logger.error('Super admin training detail failed', error);
            throw new InternalServerErrorException(
                "Erreur lors de la récupération de l'entraînement.",
            );
        }
    }

    @Post('delete')
    @HttpCode(HttpStatus.OK)
    async delete(@Body() dto: SuperAdminIdsDto): Promise<void> {
        try {
            await this.trainingRepo.deleteMany(dto.ids);
        } catch (error: unknown) {
            if (error instanceof HttpException) throw error;
            this.logger.error('Super admin training delete failed', error);
            throw new InternalServerErrorException(
                'Erreur lors de la suppression des entraînements.',
            );
        }
    }

    @Post(':id/password')
    @HttpCode(HttpStatus.OK)
    async resetPassword(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: SuperAdminTrainingPasswordDto,
    ): Promise<void> {
        try {
            await this.trainingRepo.updateAdminPassword(id, dto.newPassword);
        } catch (error: unknown) {
            if (error instanceof HttpException) throw error;
            this.logger.error('Super admin training password reset failed', error);
            throw new InternalServerErrorException(
                'Erreur lors de la réinitialisation du mot de passe.',
            );
        }
    }
}
