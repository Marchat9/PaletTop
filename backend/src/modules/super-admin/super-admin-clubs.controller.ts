import {
    Body,
    ConflictException,
    Controller,
    HttpCode,
    HttpException,
    HttpStatus,
    InternalServerErrorException,
    Logger,
    Param,
    ParseUUIDPipe,
    Post,
    UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SuperAdminConfig } from 'src/config/super-admin.config';
import { PlayerClubRepository } from 'src/modules/tournaments/repositories/player-club.repository';
import { SuperAdminClubRenameDto } from './dto/super-admin-club-rename.dto';
import { SuperAdminClubSearchDto } from './dto/super-admin-club-search.dto';
import { SuperAdminIdsDto } from './dto/super-admin-ids.dto';
import { PaginatedDto } from './responses/paginated.dto';
import {
    SuperAdminClubSummaryDto,
    toSuperAdminClubSummaryDto,
} from './responses/super-admin-club-summary.dto';
import { SuperAdminAuthGuard } from './super-admin-auth.guard';

@Controller('super-admin/clubs')
@UseGuards(SuperAdminAuthGuard)
export class SuperAdminClubsController {
    private readonly logger = new Logger(SuperAdminClubsController.name);
    private readonly maxPageSize: number;

    constructor(
        private readonly clubRepo: PlayerClubRepository,
        readonly configService: ConfigService,
    ) {
        this.maxPageSize = configService.getOrThrow<SuperAdminConfig>('superAdmin').maxPageSize;
    }

    @Post('search')
    @HttpCode(HttpStatus.OK)
    async search(
        @Body() dto: SuperAdminClubSearchDto,
    ): Promise<PaginatedDto<SuperAdminClubSummaryDto>> {
        try {
            const pageSize = Math.min(dto.pageSize, this.maxPageSize);
            const { items, total } = await this.clubRepo.searchForAdmin({
                page: dto.page,
                pageSize,
                search: dto.search,
                sortBy: dto.sortBy,
                sortDir: dto.sortDir,
            });
            return { items: items.map(toSuperAdminClubSummaryDto), total };
        } catch (error: unknown) {
            if (error instanceof HttpException) throw error;
            this.logger.error('Super admin club search failed', error);
            throw new InternalServerErrorException('Erreur lors de la recherche des clubs.');
        }
    }

    @Post(':id/rename')
    @HttpCode(HttpStatus.OK)
    async rename(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: SuperAdminClubRenameDto,
    ): Promise<void> {
        try {
            const duplicate = await this.clubRepo.findByNormalizedName(dto.name, id);
            if (duplicate) {
                throw new ConflictException('Un club avec ce nom existe déjà.');
            }
            await this.clubRepo.rename(id, dto.name);
        } catch (error: unknown) {
            if (error instanceof HttpException) throw error;
            this.logger.error('Super admin club rename failed', error);
            throw new InternalServerErrorException('Erreur lors du renommage du club.');
        }
    }

    @Post('delete')
    @HttpCode(HttpStatus.OK)
    async delete(@Body() dto: SuperAdminIdsDto): Promise<void> {
        try {
            await this.clubRepo.deleteMany(dto.ids);
        } catch (error: unknown) {
            if (error instanceof HttpException) throw error;
            this.logger.error('Super admin club delete failed', error);
            throw new InternalServerErrorException('Erreur lors de la suppression des clubs.');
        }
    }
}
