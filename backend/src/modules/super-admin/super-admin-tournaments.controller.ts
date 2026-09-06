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
import { TournamentRepository } from 'src/modules/tournaments/repositories/tournament.repository';
import {
    AdminTournamentDto,
    toAdminTournamentDto,
} from 'src/modules/tournaments/responses/admin-tournament.dto';
import { SuperAdminActionDto } from './dto/super-admin-action.dto';
import { SuperAdminIdsDto } from './dto/super-admin-ids.dto';
import { SuperAdminResourcePasswordDto } from './dto/super-admin-resource-password.dto';
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
    search(
        @Body() dto: SuperAdminTournamentSearchDto,
    ): Promise<PaginatedDto<SuperAdminTournamentSummaryDto>> {
        return runGuarded(this.logger, 'Erreur lors de la recherche des tournois.', async () => {
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
        });
    }

    @Post(':id/detail')
    @HttpCode(HttpStatus.OK)
    detail(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() _dto: SuperAdminActionDto,
    ): Promise<AdminTournamentDto> {
        return runGuarded(this.logger, 'Erreur lors de la récupération du tournoi.', async () => {
            const tournament = await this.tournamentRepo.findWithRelations(
                { id },
                { withTeams: true },
            );
            if (!tournament) {
                throw new NotFoundException('Tournoi introuvable.');
            }
            return toAdminTournamentDto(tournament);
        });
    }

    @Post('delete')
    @HttpCode(HttpStatus.OK)
    delete(@Body() dto: SuperAdminIdsDto): Promise<void> {
        return runGuarded(this.logger, 'Erreur lors de la suppression des tournois.', () =>
            this.tournamentRepo.deleteMany(dto.ids),
        );
    }

    @Post('status')
    @HttpCode(HttpStatus.OK)
    updateStatus(@Body() dto: SuperAdminTournamentStatusDto): Promise<void> {
        return runGuarded(this.logger, 'Erreur lors du changement de statut.', () =>
            this.tournamentRepo.updateStatusMany(dto.ids, dto.status),
        );
    }

    @Post(':id/password')
    @HttpCode(HttpStatus.OK)
    resetPassword(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: SuperAdminResourcePasswordDto,
    ): Promise<void> {
        return runGuarded(this.logger, 'Erreur lors de la réinitialisation du mot de passe.', () =>
            this.tournamentRepo.updateAdminPassword(id, dto.newPassword),
        );
    }
}
