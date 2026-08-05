import {
    Body,
    ConflictException,
    Controller,
    forwardRef,
    Get,
    HttpException,
    Inject,
    InternalServerErrorException,
    Logger,
    Param,
    Patch,
    Post,
} from '@nestjs/common';
import { SessionService } from 'src/modules/tournaments/services/session.service';
import { QueryFailedError } from 'typeorm';
import { Tournament } from '../../../entities/tournament.entity';
import { AddMultipleTeamsToTournamentDto } from '../dto/add-team-to-tournament.dto';
import { AdminAccessDto } from '../dto/admin-access.dto';
import { AdminQualifyingDto } from '../dto/admin-qualifying.dto';
import { CreateTournamentDto } from '../dto/create-tournament.dto';
import { JoinTournamentDto } from '../dto/join-tournament.dto';
import { UpdateTournamentConfigurationDto } from '../dto/update-tournament-configuration.dto';
import { AdminTournamentDto, toAdminTournamentDto } from '../responses/admin-tournament.dto';
import { GlobalRankingEntry } from '../responses/ranking.dto';
import { RankingService } from '../services/ranking.service';
import { TournamentsService } from '../services/tournaments.service';
import { TournamentStrategyFactory } from '../strategies/tournament-strategy.factory';

@Controller('tournaments')
export class TournamentsController {
    private readonly logger = new Logger(TournamentsController.name);

    constructor(
        private readonly tournamentsService: TournamentsService,
        private readonly rankingService: RankingService,
        @Inject(forwardRef(() => SessionService)) private readonly sessionService: SessionService,
        private readonly strategyFactory: TournamentStrategyFactory,
    ) {}

    @Post()
    async create(@Body() dto: CreateTournamentDto): Promise<Tournament> {
        try {
            return await this.tournamentsService.create(dto);
        } catch (error: unknown) {
            if (error instanceof HttpException) {
                throw error;
            }

            this.logger.error(`Tournament creation failed`, error);

            if (error instanceof QueryFailedError) {
                const driverError = error.driverError as { code?: string } | undefined;
                if (driverError?.code === '23505') {
                    throw new ConflictException('Le code tournoi existe déjà.');
                }
            }

            throw new InternalServerErrorException(
                'Erreur interne lors de la création du tournoi.',
            );
        }
    }

    @Post('admin-access')
    async adminAccess(@Body() dto: AdminAccessDto): Promise<AdminTournamentDto> {
        try {
            const tournament = await this.tournamentsService.authenticateAdmin(
                dto.code,
                dto.password,
            );
            const strategy = this.strategyFactory.create(tournament.configuration.competitionMode);
            const tournamentStatus = await this.sessionService.buildTournamentStatus(
                strategy,
                tournament,
            );
            return toAdminTournamentDto(tournament, tournamentStatus);
        } catch (error: unknown) {
            if (error instanceof HttpException) {
                throw error;
            }

            this.logger.error(`Admin access failed`, error);

            throw new InternalServerErrorException(
                "Erreur interne lors de l'authentification admin.",
            );
        }
    }

    @Post(':code/teams')
    async addTeam(
        @Param('code') tournamentCode: string,
        @Body() dto: AddMultipleTeamsToTournamentDto,
    ): Promise<AdminTournamentDto> {
        try {
            const updatedTournament: Tournament = await this.tournamentsService.addTeams(
                tournamentCode,
                dto,
            );
            return toAdminTournamentDto(updatedTournament);
        } catch (error: unknown) {
            if (error instanceof HttpException) {
                throw error;
            }

            this.logger.error(`Tournament add teams failed`, error);

            if (error instanceof QueryFailedError) {
                const driverError = error.driverError as { code?: string } | undefined;
                if (driverError?.code === '23505') {
                    throw new ConflictException('Un code équipe existe déjà.');
                }
            }

            throw new InternalServerErrorException("Erreur interne lors de l'ajout des équipes.");
        }
    }

    @Patch(':idtournament/configuration')
    async updateConfiguration(
        @Param('idtournament') id: string,
        @Body() dto: UpdateTournamentConfigurationDto,
    ): Promise<Tournament> {
        try {
            return await this.tournamentsService.updateTournamentConfiguration(id, dto);
        } catch (error: unknown) {
            if (error instanceof HttpException) {
                throw error;
            }

            this.logger.error(`Tournament update configuration failed`, error);

            throw new InternalServerErrorException(
                'Erreur interne lors de la mise à jour des configurations.',
            );
        }
    }

    @Post('join')
    async join(@Body() dto: JoinTournamentDto): Promise<Tournament> {
        try {
            return await this.tournamentsService.findByTournamentCodeAndTeamCode(
                dto.tournamentCode,
                dto.teamCode,
            );
        } catch (error: unknown) {
            if (error instanceof HttpException) {
                throw error;
            }

            this.logger.error(`Tournament player join failed`, error);

            throw new InternalServerErrorException(
                'Erreur interne lors de la tentative de rejoindre le tournoi.',
            );
        }
    }

    @Post(':code/start')
    async startTournament(
        @Param('code') code: string,
        @Body() dto: AdminQualifyingDto,
    ): Promise<AdminTournamentDto> {
        try {
            return await this.sessionService.startTournament(code, dto.password);
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }

            this.logger.error(`Tournament start failed`, error);

            throw new InternalServerErrorException('Erreur lors du démarrage du tournoi.');
        }
    }

    @Post(':code/complete')
    async completeTournament(
        @Param('code') code: string,
        @Body() dto: AdminQualifyingDto,
    ): Promise<AdminTournamentDto> {
        try {
            return await this.sessionService.completeTournament(code, dto.password);
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }

            this.logger.error(`Tournament complete failed`, error);

            throw new InternalServerErrorException('Erreur lors de la clôture du tournoi.');
        }
    }

    @Post(':code/matches/next-session')
    async nextSession(
        @Param('code') code: string,
        @Body() dto: AdminQualifyingDto,
    ): Promise<AdminTournamentDto> {
        try {
            return await this.sessionService.nextSession(code, dto.password);
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }

            this.logger.error(`Tournament next-session failed`, error);

            throw new InternalServerErrorException(
                'Erreur lors de la génération de la session suivante.',
            );
        }
    }

    @Get(':code/ranking')
    async getGlobalRanking(@Param('code') code: string): Promise<GlobalRankingEntry[]> {
        try {
            return await this.rankingService.getGlobalRanking(code);
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }

            this.logger.error(`Tournament ranking failed`, error);

            throw new InternalServerErrorException('Erreur lors du calcul du classement.');
        }
    }
}
