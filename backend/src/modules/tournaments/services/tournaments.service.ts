import { RealtimeGateway } from 'src/modules/realtime/realtime.gateway';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Player } from 'src/entities/player.entity';
import { Team } from 'src/entities/team.entity';
import { Tournament } from 'src/entities/tournament.entity';
import { TournamentStatus } from 'src/enum/status.enum';
import { AppSettingKey } from 'src/enum/app-setting.enum';
import { CompetitionMode, ScoreCalculation } from 'src/enum/tounament.enum';
import { AppSettingsService } from 'src/modules/app-settings/app-settings.service';
import { TournamentTeamDto } from 'src/modules/tournaments/dto/team-tournament.dto';
import {
    sortTeamNames,
    SpectatorTournamentDto,
    toSpectatorTournamentDto,
} from 'src/modules/tournaments/responses/spectator-tournament.dto';
import { SessionService } from 'src/modules/tournaments/services/session.service';
import { TournamentStrategyFactory } from 'src/modules/tournaments/strategies/tournament-strategy.factory';
import {
    extractCompetitionConfiguration,
    sanitizeTournament,
} from 'src/modules/tournaments/utils/tournament.utils';
import { generateNumericCode } from 'src/utils/numeric-code.util';
import { AddMultipleTeamsToTournamentDto } from '../dto/add-team-to-tournament.dto';
import { CreateTournamentDto } from '../dto/create-tournament.dto';
import { UpdateTournamentConfigurationDto } from '../dto/update-tournament-configuration.dto';
import { MAX_TEAM_CAPACITY, TournamentConfigurationDto } from '../dto/tournament-configuration.dto';
import { StructuredTournamentConfig } from '../dto/tournament-comptetition-configuration.dto';
import { TournamentConfiguration } from 'src/entities/tournament-configuration.entity';
import { PlayerClubRepository } from '../repositories/player-club.repository';
import { TeamRepository } from '../repositories/team.repository';
import { TournamentRepository } from '../repositories/tournament.repository';
import { TeamDto, toTeamDto } from '../responses/admin-tournament.dto';
import { TournamentAuthService } from './tournament-auth.service';
import { AdminPasswordService } from 'src/modules/admin-password/admin-password.service';

@Injectable()
export class TournamentsService {
    private readonly logger = new Logger(TournamentsService.name);

    private readonly nbNumberInCode = 4;

    constructor(
        private readonly tournamentRepo: TournamentRepository,
        private readonly teamRepo: TeamRepository,
        private readonly playerClubRepo: PlayerClubRepository,
        private readonly tournamentAuthService: TournamentAuthService,
        private readonly sessionService: SessionService,
        private readonly strategyFactory: TournamentStrategyFactory,
        private readonly gateway: RealtimeGateway,
        private readonly appSettingsService: AppSettingsService,
        private readonly adminPassword: AdminPasswordService,
    ) {}

    /**
     * The score calculation must be one of those offered for the competition mode (app setting
     * set by the super-admin). Not checked when an update keeps both unchanged, so a tournament
     * keeps a calculation that was offered when it was created.
     */
    private async assertScoreCalculationOffered(
        competitionMode: CompetitionMode,
        scoreCalculation: ScoreCalculation,
    ): Promise<void> {
        const offered = await this.appSettingsService.get(AppSettingKey.SCORE_CALCULATIONS_BY_MODE);
        if (!offered[competitionMode]?.includes(scoreCalculation)) {
            this.logger.warn(
                `Score calculation '${scoreCalculation}' refused for mode '${competitionMode}'`,
            );
            throw new BadRequestException(
                "Ce calcul des scores n'est pas disponible pour ce mode de compétition.",
            );
        }
    }

    /**
     * A structured tournament has at most as many consolations as the app setting allows (the
     * DTO only checks the lower bound: the upper one is a setting).
     */
    private async assertConsolationCountAllowed(config: TournamentConfigurationDto): Promise<void> {
        if (config.competitionMode !== CompetitionMode.STANDARD) return;
        const { consolationCount } = config.competitionConfiguration as StructuredTournamentConfig;
        const max = await this.appSettingsService.get(AppSettingKey.MAX_CONSOLATION_COUNT);
        if (consolationCount > max) {
            this.logger.warn(`Consolation count ${consolationCount} refused (max ${max})`);
            throw new BadRequestException(`Au maximum ${max} consolantes.`);
        }
    }

    /** The stored configuration built from a request, the same way at creation and on update. */
    private toTournamentConfiguration(config: TournamentConfigurationDto): TournamentConfiguration {
        return {
            maxTeamCapacity: config.maxTeamCapacity,
            scoreCalculation: config.scoreCalculation,
            pointsPerGame: config.pointsPerGame,
            rematch: !!config.rematch,
            matchAgainstFullSameClub: !!config.matchAgainstFullSameClub,
            matchAgainstPartialSameClub: !!config.matchAgainstPartialSameClub,
            competitionMode: config.competitionMode,
            competitionConfiguration: extractCompetitionConfiguration(config),
        };
    }

    async findAll(): Promise<Tournament[]> {
        const tournaments = await this.tournamentRepo.findAll();
        return tournaments.map((t) => sanitizeTournament(t));
    }

    async findOne(id: string): Promise<Tournament> {
        const tournament = await this.tournamentRepo.findWithRelations(
            { id },
            { withTeams: true, withMatches: true },
        );
        if (!tournament) {
            this.logger.warn(`Tournament not found with id: ${id}`);
            throw new NotFoundException('Tournoi introuvable');
        }
        return sanitizeTournament(tournament);
    }

    async findSpectatorTournamentByCode(code: string): Promise<SpectatorTournamentDto> {
        // Teams: listed on the spectator screen until the first round starts.
        const tournament = await this.tournamentRepo.findWithRelations(
            { code },
            { withTeams: true },
        );
        if (!tournament) {
            this.logger.warn(`Tournament not found with code: ${code}`);
            throw new NotFoundException('Tournoi introuvable');
        }
        const strategy = this.strategyFactory.create(tournament.configuration.competitionMode);
        const status = await this.sessionService.buildTournamentStatus(strategy, tournament);
        return toSpectatorTournamentDto(tournament, status?.phaseName || '');
    }

    /**
     * Sends the registered teams to the tournament room after a team change: the spectator waiting
     * screen lists them. A failure is only logged, the team change itself went through.
     */
    async broadcastTeamNames(tournamentCode: string): Promise<void> {
        try {
            const tournament = await this.tournamentRepo.findWithRelations(
                { code: tournamentCode },
                { withTeams: true },
            );
            if (!tournament) return;
            this.gateway.emitTeamsUpdated(tournamentCode, sortTeamNames(tournament.teams ?? []));
        } catch (error) {
            this.logger.error(`Teams broadcast failed for tournament ${tournamentCode}`, error);
        }
    }

    async create(tournamentCreation: CreateTournamentDto): Promise<Tournament> {
        const config = tournamentCreation.configuration;
        await this.assertScoreCalculationOffered(config.competitionMode, config.scoreCalculation);
        await this.assertConsolationCountAllowed(config);

        const tournament = this.tournamentRepo.create({
            name: tournamentCreation.name,
            code: tournamentCreation.code,
            adminPassword: await this.adminPassword.hash(tournamentCreation.adminPassword),
            date: tournamentCreation.date,
            description: tournamentCreation.description,
            status: TournamentStatus.DRAFT,
            teams: [],
            matches: [],
            configuration: this.toTournamentConfiguration(config),
        });

        const saved = await this.tournamentRepo.save(tournament);
        this.logger.log(`Tournament created: ${saved.code}`);
        return sanitizeTournament(saved);
    }

    async authenticateAdmin(code: string, password: string): Promise<Tournament> {
        const tournament = await this.tournamentAuthService.findWithAdminAuth({ code }, password, {
            withTeams: true,
            withMatches: true,
        });
        return sanitizeTournament(tournament);
    }

    async findByTournamentCodeAndTeamCode(
        tournamentCode: string,
        teamCode: string,
    ): Promise<Tournament> {
        const tournament = await this.tournamentRepo.findWithRelations(
            { code: tournamentCode },
            {
                withTeams: true,
                withMatches: true,
                withMatchesInTeams: true,
                withSessions: true,
            },
        );

        if (!tournament || !tournament.teams.some((team: Team) => team.code === teamCode)) {
            this.logger.warn(
                `Tournament not found with code: ${tournamentCode} and team code: ${teamCode}`,
            );
            throw new NotFoundException('Tournoi ou équipe introuvable');
        }

        const teamMatches =
            tournament.matches?.filter((match) => {
                const isTeamA = match.teamA.code === teamCode;
                const isTeamB = match.teamB?.code === teamCode;
                return isTeamA || isTeamB;
            }) ?? [];

        const securedTeams = tournament.teams.map((team: Team) => ({
            ...team,
            code: team.code === teamCode ? team.code : null,
            matches: team.code === teamCode ? teamMatches : null,
        }));

        tournament.teams = securedTeams as unknown as Team[];
        return sanitizeTournament(tournament);
    }

    async addTeams(
        tournamentCode: string,
        dto: AddMultipleTeamsToTournamentDto,
    ): Promise<Tournament> {
        const tournament = await this.tournamentAuthService.findWithAdminAuth(
            { code: tournamentCode },
            dto.password,
            { withTeams: true, withMatches: true },
        );

        if (tournament.status !== TournamentStatus.DRAFT) {
            throw new BadRequestException(
                "Les équipes ne peuvent être ajoutées qu'en phase de configuration (statut Brouillon).",
            );
        }

        // The capacity is also checked by the form, but the API must not rely on it. A soft
        // capacity (structured mode) is only a target: the absolute maximum applies instead.
        const strategy = this.strategyFactory.create(tournament.configuration.competitionMode);
        const capacity = strategy.isTeamCapacityHard()
            ? tournament.configuration.maxTeamCapacity
            : MAX_TEAM_CAPACITY;
        if (tournament.teams.length + dto.teams.length > capacity) {
            throw new BadRequestException(
                `Capacité maximale atteinte : ${capacity} équipes pour ce tournoi (${tournament.teams.length} déjà inscrites).`,
            );
        }

        // Clubs
        const allClubNames: string[] = [
            ...new Set(
                dto.teams.flatMap((teamDto) =>
                    teamDto.players
                        .map((p) => p.club?.trim())
                        .filter((name): name is string => Boolean(name)),
                ),
            ),
        ];
        const resolvedClubs = await this.playerClubRepo.findOrCreateMany(allClubNames);

        // Teams
        const existingTeamCodes: string[] = tournament.teams.map((team: Team) => team.code);
        const existingTeamCount = tournament.teams.length;

        const filledTeams: Team[] = dto.teams.map((teamDto, index) => {
            const code = generateNumericCode(existingTeamCodes, this.nbNumberInCode);

            const team = this.teamRepo.create({
                name: teamDto.name || `Équipe ${existingTeamCount + index + 1}`,
                club: teamDto.club || undefined,
                code,
                tournament,
                players: teamDto.players.map((playerDto) => {
                    return Object.assign(new Player(), {
                        name: playerDto.name,
                        club: playerDto.club ? resolvedClubs.get(playerDto.club.trim()) : undefined,
                        tournament,
                    });
                }),
            });

            existingTeamCodes.push(code);
            return team;
        });

        const savedTeams = await this.teamRepo.save(filledTeams);
        tournament.teams.push(...savedTeams);

        const saved = await this.tournamentRepo.save(tournament);
        this.logger.log(`${savedTeams.length} team(s) added to tournament ${tournamentCode}`);
        return sanitizeTournament(saved);
    }

    async getTeamByCode(tournamentCode: string, teamCode: string): Promise<TeamDto> {
        const tournament = await this.tournamentRepo.findWithRelations(
            { code: tournamentCode },
            { withTeams: true },
        );
        if (!tournament) throw new NotFoundException('Tournoi introuvable.');

        const team = tournament.teams.find((t) => t.code === teamCode);
        if (!team) throw new NotFoundException('Équipe introuvable.');

        this.logger.log(`Team ${teamCode} retrieved for tournament ${tournamentCode}`);
        return toTeamDto(team);
    }

    async updateTournamentConfiguration(
        id: string,
        dto: UpdateTournamentConfigurationDto,
    ): Promise<Tournament> {
        const tournament = await this.tournamentAuthService.findWithAdminAuth(
            { id },
            dto.password,
            {
                withTeams: true,
            },
        );

        if (tournament.status !== TournamentStatus.DRAFT) {
            throw new BadRequestException(
                `Le tournoi '${dto.code}' n'est plus en état brouillon et ne peut donc pas être modifié.`,
            );
        }

        if (tournament.code !== dto.code) {
            const existingTounament: boolean = !!(await this.tournamentRepo.findByCode(dto.code));
            if (existingTounament) {
                this.logger.warn(
                    `Tournament update configuration failed: Admin want to change code '${tournament.code}' to => '${dto.code}' that already exist.`,
                );

                throw new BadRequestException(
                    `Le code de tournoi '${dto.code}' extiste déjà, veuillez renseigner un autre code.`,
                );
            }
        }

        const { competitionMode, scoreCalculation } = dto.configuration;
        if (
            competitionMode !== tournament.configuration.competitionMode ||
            scoreCalculation !== tournament.configuration.scoreCalculation
        ) {
            await this.assertScoreCalculationOffered(competitionMode, scoreCalculation);
        }
        await this.assertConsolationCountAllowed(dto.configuration);

        const mergedTournament: Tournament = {
            ...tournament,
            name: dto.name ?? tournament.name,
            code: dto.code ?? tournament.code,
            date: dto.date ?? tournament.date,
            description: dto.description ?? tournament.description,
            // Validated as a whole by the DTO and built like at creation: every stored field is
            // overwritten, nothing else from the request is kept.
            configuration: this.toTournamentConfiguration(dto.configuration),
        };

        const saved = await this.tournamentRepo.save(mergedTournament);
        this.logger.log(`Tournament ${tournament.code} configuration updated`);
        return sanitizeTournament(saved);
    }

    async getTeamById(tournamentCode: string, teamId: string): Promise<Team> {
        const team = await this.teamRepo.findById(teamId);
        if (!team || team.tournament.code !== tournamentCode) {
            throw new NotFoundException('Équipe introuvable.');
        }
        return team;
    }

    /**
     * The team an admin is about to edit or delete. The URL and the body must name the same
     * tournament and team (the URL used to be ignored), and teams only change while the
     * tournament is a draft: afterwards their matches reference them.
     */
    async findEditableTeam(
        route: { tournamentCode: string; teamCode: string },
        dto: { code: string; password: string; teamId: string },
    ): Promise<Team> {
        if (route.tournamentCode.trim().toUpperCase() !== dto.code.trim().toUpperCase()) {
            throw new BadRequestException("Le code du tournoi ne correspond pas à l'URL.");
        }

        const tournament = await this.tournamentAuthService.findWithAdminAuth(
            { code: dto.code.trim().toUpperCase() },
            dto.password,
        );
        if (tournament.status !== TournamentStatus.DRAFT) {
            throw new BadRequestException(
                "Les équipes ne peuvent être modifiées ou supprimées qu'en phase de configuration (statut Brouillon).",
            );
        }

        const team = await this.getTeamById(tournament.code, dto.teamId);
        if (team.code !== route.teamCode) {
            throw new NotFoundException('Équipe introuvable.');
        }
        return team;
    }

    async updateTeamById(teamId: string, teamData: TournamentTeamDto): Promise<Team> {
        const team = await this.teamRepo.findById(teamId);
        if (!team) {
            throw new NotFoundException('Équipe introuvable.');
        }

        if (teamData.name) {
            team.name = teamData.name;
        }

        // Team-level club (championship mode): update it whenever the payload carries one. Left
        // untouched when absent, so a non-championship edit never clobbers it.
        if (teamData.club !== undefined) {
            team.club = teamData.club;
        }

        if (teamData.players?.length) {
            const clubNames = [
                ...new Set(
                    teamData.players
                        .map((p) => p.club?.trim())
                        .filter((name): name is string => Boolean(name)),
                ),
            ];
            const resolvedClubs = await this.playerClubRepo.findOrCreateMany(clubNames);

            team.players = teamData.players.map((playerDto) =>
                Object.assign(new Player(), {
                    name: playerDto.name,
                    club: playerDto.club ? resolvedClubs.get(playerDto.club.trim()) : undefined,
                    team,
                    tournament: team.tournament,
                }),
            );
        }

        const saved = await this.teamRepo.save([team]);
        this.logger.log(`Team ${team.code} updated`);
        return saved[0];
    }

    async deleteTeamById(teamId: string): Promise<void> {
        const team = await this.teamRepo.findById(teamId);
        if (!team) {
            throw new NotFoundException('Équipe introuvable.');
        }

        await this.teamRepo.remove(team);
        this.logger.log(`Team ${team.code} deleted`);
    }
}
