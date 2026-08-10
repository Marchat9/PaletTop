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
import { TournamentRepository } from 'src/modules/tournaments/repositories/tournament.repository';
import {
    AdminTournamentDto,
    toAdminTournamentDto,
} from 'src/modules/tournaments/responses/admin-tournament.dto';
import { SuperAdminActionDto } from './dto/super-admin-action.dto';
import { SuperAdminIdsDto } from './dto/super-admin-ids.dto';
import { SuperAdminTournamentPasswordDto } from './dto/super-admin-tournament-password.dto';
import { SuperAdminTournamentSearchDto } from './dto/super-admin-tournament-search.dto';
import { SuperAdminTournamentStatusDto } from './dto/super-admin-tournament-status.dto';
import { PaginatedDto } from './responses/paginated.dto';
import {
    SuperAdminTournamentSummaryDto,
    toSuperAdminTournamentSummaryDto,
} from './responses/super-admin-tournament-summary.dto';
import { SuperAdminAuthGuard } from './super-admin-auth.guard';

@Controller('super-admin/tournaments')
@UseGuards(SuperAdminAuthGuard)
export class SuperAdminTournamentsController {
    private readonly logger = new Logger(SuperAdminTournamentsController.name);
    private readonly maxPageSize: number;

    constructor(
        private readonly tournamentRepo: TournamentRepository,
        readonly configService: ConfigService,
    ) {
        this.maxPageSize = configService.getOrThrow<SuperAdminConfig>('superAdmin').maxPageSize;
    }

    @Post('search')
    @HttpCode(HttpStatus.OK)
    async search(
        @Body() dto: SuperAdminTournamentSearchDto,
    ): Promise<PaginatedDto<SuperAdminTournamentSummaryDto>> {
        try {
            const pageSize = Math.min(dto.pageSize, this.maxPageSize);
            const { items, total } = await this.tournamentRepo.searchForAdmin({
                page: dto.page,
                pageSize,
                search: dto.search,
                status: dto.status,
                sortBy: dto.sortBy,
                sortDir: dto.sortDir,
            });
            return { items: items.map(toSuperAdminTournamentSummaryDto), total };
        } catch (error: unknown) {
            if (error instanceof HttpException) throw error;
            this.logger.error('Super admin tournament search failed', error);
            throw new InternalServerErrorException('Erreur lors de la recherche des tournois.');
        }
    }

    @Post(':id/detail')
    @HttpCode(HttpStatus.OK)
    async detail(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() _dto: SuperAdminActionDto,
    ): Promise<AdminTournamentDto> {
        try {
            const tournament = await this.tournamentRepo.findWithRelations(
                { id },
                { withTeams: true },
            );
            if (!tournament) {
                throw new NotFoundException('Tournoi introuvable.');
            }
            return toAdminTournamentDto(tournament);
        } catch (error: unknown) {
            if (error instanceof HttpException) throw error;
            this.logger.error('Super admin tournament detail failed', error);
            throw new InternalServerErrorException('Erreur lors de la récupération du tournoi.');
        }
    }

    @Post('delete')
    @HttpCode(HttpStatus.OK)
    async delete(@Body() dto: SuperAdminIdsDto): Promise<void> {
        try {
            await this.tournamentRepo.deleteMany(dto.ids);
        } catch (error: unknown) {
            if (error instanceof HttpException) throw error;
            this.logger.error('Super admin tournament delete failed', error);
            throw new InternalServerErrorException('Erreur lors de la suppression des tournois.');
        }
    }

    @Post('status')
    @HttpCode(HttpStatus.OK)
    async updateStatus(@Body() dto: SuperAdminTournamentStatusDto): Promise<void> {
        try {
            await this.tournamentRepo.updateStatusMany(dto.ids, dto.status);
        } catch (error: unknown) {
            if (error instanceof HttpException) throw error;
            this.logger.error('Super admin tournament status update failed', error);
            throw new InternalServerErrorException('Erreur lors du changement de statut.');
        }
    }

    @Post(':id/password')
    @HttpCode(HttpStatus.OK)
    async resetPassword(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: SuperAdminTournamentPasswordDto,
    ): Promise<void> {
        try {
            await this.tournamentRepo.updateAdminPassword(id, dto.newPassword);
        } catch (error: unknown) {
            if (error instanceof HttpException) throw error;
            this.logger.error('Super admin tournament password reset failed', error);
            throw new InternalServerErrorException(
                'Erreur lors de la réinitialisation du mot de passe.',
            );
        }
    }
}
