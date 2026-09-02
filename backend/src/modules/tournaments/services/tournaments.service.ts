import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Player } from 'src/entities/player.entity';
import { Team } from 'src/entities/team.entity';
import { Tournament } from 'src/entities/tournament.entity';
import { TournamentStatus } from 'src/enum/status.enum';
import { RealtimeGateway } from 'src/modules/realtime/realtime.gateway';
import { TournamentTeamDto } from 'src/modules/tournaments/dto/team-tournament.dto';
import {
    SpectatorTournamentDto,
    toSpectatorTournamentDto,
} from 'src/modules/tournaments/responses/spectator-tournament.dto';
import { SessionService } from 'src/modules/tournaments/services/session.service';
import { TournamentStrategyFactory } from 'src/modules/tournaments/strategies/tournament-strategy.factory';
import {
    extractCompetitionConfiguration,
    sanitizeTournament,
} from 'src/modules/tournaments/utils/tournament.utils';
import { AddMultipleTeamsToTournamentDto } from '../dto/add-team-to-tournament.dto';
import { CreateTournamentDto } from '../dto/create-tournament.dto';
import { UpdateTournamentConfigurationDto } from '../dto/update-tournament-configuration.dto';
import { PlayerClubRepository } from '../repositories/player-club.repository';
import { TeamRepository } from '../repositories/team.repository';
import { TournamentRepository } from '../repositories/tournament.repository';
import { TeamDto, toTeamDto } from '../responses/admin-tournament.dto';
import { generateTeamCode } from '../utils/team.utils';
import { TournamentAuthService } from './tournament-auth.service';

@Injectable()
export class TournamentsService {
    private readonly logger = new Logger(TournamentsService.name);

    constructor(
        private readonly tournamentRepo: TournamentRepository,
        private readonly teamRepo: TeamRepository,
        private readonly playerClubRepo: PlayerClubRepository,
        private readonly tournamentAuthService: TournamentAuthService,
        private readonly sessionService: SessionService,
        private readonly strategyFactory: TournamentStrategyFactory,
        private readonly gateway: RealtimeGateway,
    ) {}

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
        const tournament = await this.tournamentRepo.findByCode(code);
        if (!tournament) {
            this.logger.warn(`Tournament not found with code: ${code}`);
            throw new NotFoundException('Tournoi introuvable');
        }
        const strategy = this.strategyFactory.create(tournament.configuration.competitionMode);
        const status = await this.sessionService.buildTournamentStatus(strategy, tournament);
        return toSpectatorTournamentDto(tournament, status?.phaseName || '');
    }

    async create(tournamentCreation: CreateTournamentDto): Promise<Tournament> {
        const config = tournamentCreation.configuration;

        const tournament = this.tournamentRepo.create({
            name: tournamentCreation.name,
            code: tournamentCreation.code,
            adminPassword: tournamentCreation.adminPassword,
            date: tournamentCreation.date,
            description: tournamentCreation.description,
            status: TournamentStatus.DRAFT,
            teams: [],
            matches: [],
            configuration: {
                maxTeamCapacity: config.maxTeamCapacity,
                scoreCalculation: config.scoreCalculation,
                pointsPerGame: config.pointsPerGame,
                rematch: !!config.rematch,
                matchAgainstFullSameClub: !!config.matchAgainstFullSameClub,
                matchAgainstPartialSameClub: !!config.matchAgainstPartialSameClub,
                competitionMode: config.competitionMode,
                competitionConfiguration: extractCompetitionConfiguration(config),
            },
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
            const code = generateTeamCode(existingTeamCodes);

            const team = this.teamRepo.create({
                name: teamDto.name || `Equipe ${existingTeamCount + index + 1}`,
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

        const mergedTournament: Tournament = {
            ...tournament,
            name: dto.name ?? tournament.name,
            code: dto.code ?? tournament.code,
            date: dto.date ?? tournament.date,
            description: dto.description ?? tournament.description,
            configuration: {
                ...tournament.configuration,
                ...dto.configuration,
            },
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

    async updateTeamById(teamId: string, teamData: TournamentTeamDto): Promise<Team> {
        const team = await this.teamRepo.findById(teamId);
        if (!team) {
            throw new NotFoundException('Équipe introuvable.');
        }

        if (teamData.name) {
            team.name = teamData.name;
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
