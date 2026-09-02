import { Tournament } from 'src/entities/tournament.entity';
import { Team } from 'src/entities/team.entity';
import { TournamentStatusInfo } from 'src/modules/tournaments/responses/tournament-status.dto';
import { TournamentConfigurationDto } from '../dto/tournament-configuration.dto';
import { TournamentStatus } from 'src/enum/status.enum';

export interface TeamDto {
    id: string;
    name: string;
    code?: string;
    club?: string;
    players: { id: string; name: string; club?: string }[];
}

export interface TournamentMetaDto {
    id: string;
    code: string;
    name: string;
    date: string;
    description?: string;
    status: TournamentStatus;
    configuration: TournamentConfigurationDto;
    createdAt: string;
    tournamentStatus: TournamentStatusInfo | null;
}

export interface AdminTournamentDto extends TournamentMetaDto {
    teams: TeamDto[];
}

export function toTeamDto(team: Team): TeamDto {
    return {
        id: team.id,
        name: team.name,
        code: team.code,
        club: team.club,
        players: (team.players ?? []).map((p) => ({
            id: p.id,
            name: p.name,
            club: p.club?.name,
        })),
    };
}

export function toTournamentMetaDto(
    tournament: Tournament,
    tournamentStatus: TournamentStatusInfo | null = null,
): TournamentMetaDto {
    return {
        id: tournament.id,
        code: tournament.code,
        name: tournament.name,
        date: tournament.date.toISOString(),
        description: tournament.description,
        status: tournament.status,
        configuration: tournament.configuration,
        createdAt: tournament.createdAt.toISOString(),
        tournamentStatus,
    };
}

export function toAdminTournamentDto(
    tournament: Tournament,
    tournamentStatus: TournamentStatusInfo | null = null,
): AdminTournamentDto {
    return {
        id: tournament.id,
        code: tournament.code,
        name: tournament.name,
        date: tournament.date.toISOString(),
        description: tournament.description,
        status: tournament.status,
        configuration: tournament.configuration,
        createdAt: tournament.createdAt.toISOString(),
        tournamentStatus,
        teams: (tournament.teams ?? []).map(toTeamDto),
    };
}
