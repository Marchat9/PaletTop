import {
    Body,
    Controller,
    Delete,
    Get,
    HttpException,
    InternalServerErrorException,
    Logger,
    Param,
    Patch,
} from '@nestjs/common';
import { TeamDto, toTeamDto } from '../responses/admin-tournament.dto';
import { MatchHistoryDto } from '../responses/match-history.dto';
import { PlayerMatchDto } from '../responses/player-match.dto';
import { RankingService } from '../services/ranking.service';
import { TournamentsService } from '../services/tournaments.service';
import { AdminUpdateTeam } from 'src/modules/tournaments/dto/admin-update-team.dto';
import { AdminDeleteTeam } from 'src/modules/tournaments/dto/admin-delete-team.dto';

@Controller('tournaments/:code/teams')
export class TeamController {
    private readonly logger = new Logger(TeamController.name);

    constructor(
        private readonly rankingService: RankingService,
        private readonly tournamentsService: TournamentsService,
    ) {}

    @Get(':teamCode')
    async getTeam(
        @Param('code') tournamentCode: string,
        @Param('teamCode') teamCode: string,
    ): Promise<TeamDto> {
        try {
            return await this.tournamentsService.getTeamByCode(tournamentCode, teamCode);
        } catch (error: unknown) {
            if (error instanceof HttpException) {
                throw error;
            }

            this.logger.error(`Get team failed`, error);

            throw new InternalServerErrorException(
                "Erreur interne lors de la récupération de l'équipe.",
            );
        }
    }

    @Patch(':teamCode')
    async updateTeam(@Body() dto: AdminUpdateTeam): Promise<TeamDto> {
        try {
            const tournament = await this.tournamentsService.authenticateAdmin(
                dto.code,
                dto.password,
            );
            const currentTeam = await this.tournamentsService.getTeamById(
                tournament.code,
                dto.teamId,
            );

            const newTeam = await this.tournamentsService.updateTeamById(
                currentTeam.id,
                dto.teamData,
            );

            return toTeamDto(newTeam);
        } catch (error: unknown) {
            if (error instanceof HttpException) {
                throw error;
            }

            this.logger.error(`Update team failed`, error);

            throw new InternalServerErrorException(
                "Erreur interne lors de la mise à jour de l'équipe.",
            );
        }
    }

    @Delete(':teamCode')
    async deleteTeam(@Body() dto: AdminDeleteTeam): Promise<void> {
        try {
            const tournament = await this.tournamentsService.authenticateAdmin(
                dto.code,
                dto.password,
            );
            const currentTeam = await this.tournamentsService.getTeamById(
                tournament.code,
                dto.teamId,
            );

            await this.tournamentsService.deleteTeamById(currentTeam.id);
        } catch (error: unknown) {
            if (error instanceof HttpException) {
                throw error;
            }

            this.logger.error(`Delete team failed`, error);

            throw new InternalServerErrorException(
                "Erreur interne lors de la suppression de l'équipe.",
            );
        }
    }

    @Get(':teamCode/match')
    async getTeamCurrentMatch(
        @Param('code') code: string,
        @Param('teamCode') teamCode: string,
    ): Promise<PlayerMatchDto | null> {
        try {
            return await this.rankingService.getTeamCurrentMatch(code, teamCode);
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }

            this.logger.error(`Get team match failed`, error);

            throw new InternalServerErrorException(
                'Erreur lors de la récupération du match courant.',
            );
        }
    }

    @Get(':teamCode/history')
    async getTeamHistory(
        @Param('code') code: string,
        @Param('teamCode') teamCode: string,
    ): Promise<MatchHistoryDto[]> {
        try {
            return await this.rankingService.getTeamHistory(code, teamCode);
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }

            this.logger.error(`Get team matches history start failed`, error);

            throw new InternalServerErrorException(
                "Erreur lors de la récupération de l'historique.",
            );
        }
    }
}
