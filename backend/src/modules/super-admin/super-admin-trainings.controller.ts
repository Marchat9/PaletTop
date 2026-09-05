import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Logger,
    NotFoundException,
    Param,
    ParseUUIDPipe,
    Post,
    UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { runGuarded } from 'src/common/http/run-guarded.util';
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
import { SuperAdminResourcePasswordDto } from './dto/super-admin-resource-password.dto';
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
    search(
        @Body() dto: SuperAdminTrainingSearchDto,
    ): Promise<PaginatedDto<SuperAdminTrainingSummaryDto>> {
        return runGuarded(
            this.logger,
            'Erreur lors de la recherche des entraînements.',
            async () => {
                const pageSize = Math.min(dto.pageSize, this.maxPageSize);
                const { items, total } = await this.trainingRepo.searchForAdmin({
                    page: dto.page,
                    pageSize,
                    search: dto.search,
                    sortBy: dto.sortBy,
                    sortDir: dto.sortDir,
                });
                return { items: items.map(toSuperAdminTrainingSummaryDto), total };
            },
        );
    }

    @Post(':id/detail')
    @HttpCode(HttpStatus.OK)
    detail(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() _dto: SuperAdminActionDto,
    ): Promise<SuperAdminTrainingDetailDto> {
        return runGuarded(
            this.logger,
            "Erreur lors de la récupération de l'entraînement.",
            async () => {
                const training = await this.trainingRepo.findByIdWithDetails(id);
                if (!training) {
                    throw new NotFoundException('Entraînement introuvable.');
                }
                return toSuperAdminTrainingDetailDto(training);
            },
        );
    }

    @Post('delete')
    @HttpCode(HttpStatus.OK)
    delete(@Body() dto: SuperAdminIdsDto): Promise<void> {
        return runGuarded(this.logger, 'Erreur lors de la suppression des entraînements.', () =>
            this.trainingRepo.deleteMany(dto.ids),
        );
    }

    @Post(':id/password')
    @HttpCode(HttpStatus.OK)
    resetPassword(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: SuperAdminResourcePasswordDto,
    ): Promise<void> {
        return runGuarded(this.logger, 'Erreur lors de la réinitialisation du mot de passe.', () =>
            this.trainingRepo.updateAdminPassword(id, dto.newPassword),
        );
    }
}
