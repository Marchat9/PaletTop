import { UuidParam } from 'src/decorators/uuid-param.decorator';
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
import { PlanPreviewDto } from '../dto/plan-preview.dto';
import { StartTournamentDto } from '../dto/start-tournament.dto';
import { UpdateTournamentConfigurationDto } from '../dto/update-tournament-configuration.dto';
import { runGuarded } from 'src/utils/run-guarded.util';
import { stripMatchTeamCodes } from '../utils/tournament.utils';
import { AdminTournamentDto, toAdminTournamentDto } from '../responses/admin-tournament.dto';
import { GlobalRankingEntry } from '../responses/ranking.dto';
import { SpectatorTournamentDto } from '../responses/spectator-tournament.dto';
import { TournamentStatusInfo } from '../responses/tournament-status.dto';
import { RankingService } from '../services/ranking.service';
import { TournamentsService } from '../services/tournaments.service';
import { TournamentPlanService } from '../services/tournament-plan.service';
import { TournamentStrategyFactory } from '../strategies/tournament-strategy.factory';
import { TournamentPlan } from '../strategies/structured/plan/plan.types';

@Controller('tournaments')
export class TournamentsController {
    private readonly logger = new Logger(TournamentsController.name);

    constructor(
        private readonly tournamentsService: TournamentsService,
        private readonly rankingService: RankingService,
        @Inject(forwardRef(() => SessionService)) private readonly sessionService: SessionService,
        private readonly strategyFactory: TournamentStrategyFactory,
        private readonly planService: TournamentPlanService,
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

    /**
     * Stateless and public, like the creation form it serves. Declared before the `:code` routes
     * so that it can never be taken for a tournament code.
     */
    @Post('plan-preview')
    async planPreview(@Body() dto: PlanPreviewDto): Promise<TournamentPlan> {
        return runGuarded(this.logger, 'Erreur lors du calcul des tableaux.', () =>
            this.planService.previewPlan(dto),
        );
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
            const plan = await this.planService.buildPlan(tournament, strategy);
            return toAdminTournamentDto(tournament, tournamentStatus, plan);
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
            await this.tournamentsService.broadcastTeamNames(tournamentCode);
            const plan = await this.planService.buildPlan(updatedTournament);
            return toAdminTournamentDto(updatedTournament, null, plan);
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
        @UuidParam('idtournament') id: string,
        @Body() dto: UpdateTournamentConfigurationDto,
    ): Promise<AdminTournamentDto> {
        try {
            const updated = await this.tournamentsService.updateTournamentConfiguration(id, dto);
            // The admin DTO, not the entity: its teams carry the club names, not the club entities.
            const plan = await this.planService.buildPlan(updated);
            return toAdminTournamentDto(updated, null, plan);
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
    async join(
        @Body() dto: JoinTournamentDto,
    ): Promise<Tournament & { tournamentStatus: TournamentStatusInfo | null }> {
        try {
            const tournament = await this.tournamentsService.findByTournamentCodeAndTeamCode(
                dto.tournamentCode,
                dto.teamCode,
            );
            // Players get the same phase label as the admin and spectators.
            const tournamentStatus = await this.sessionService.buildTournamentStatus(
                null,
                tournament,
            );
            return { ...stripMatchTeamCodes(tournament), tournamentStatus };
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
        @Body() dto: StartTournamentDto,
    ): Promise<AdminTournamentDto> {
        return runGuarded(
            this.logger,
            'Erreur lors du démarrage du tournoi.',
            () =>
                this.sessionService.startTournament(code, dto.password, {
                    expectedTeamCount: dto.expectedTeamCount,
                    consolationCount: dto.consolationCount,
                    eliminatedAfterQualifying: dto.eliminatedAfterQualifying,
                }),
            {
                // Net against two concurrent starts (double click): the loser of the unique
                // (tournament, session number) constraint gets a clean 409.
                pgErrorMessages: { '23505': 'Le tournoi est déjà en cours de démarrage.' },
            },
        );
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
        return runGuarded(
            this.logger,
            'Erreur lors de la génération du round suivant.',
            () => this.sessionService.nextSession(code, dto.password),
            {
                pgErrorMessages: {
                    '23505': 'Le round suivant est déjà en cours de génération.',
                },
            },
        );
    }

    @Get('spectator/:code')
    async getByCode(@Param('code') code: string): Promise<SpectatorTournamentDto> {
        try {
            return await this.tournamentsService.findSpectatorTournamentByCode(code);
        } catch (error: unknown) {
            if (error instanceof HttpException) {
                throw error;
            }

            this.logger.error(`Get tournament by code failed`, error);

            throw new InternalServerErrorException(
                'Erreur interne lors de la récupération du tournoi.',
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
