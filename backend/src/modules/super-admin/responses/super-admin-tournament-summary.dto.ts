import { Tournament } from 'src/entities/tournament.entity';
import { TournamentStatus } from 'src/enum/status.enum';

export interface SuperAdminTournamentSummaryDto {
    id: string;
    code: string;
    name: string;
    status: TournamentStatus;
    date: string;
    teamsCount: number;
    createdAt: string;
}

export function toSuperAdminTournamentSummaryDto(
    tournament: Tournament & { teamsCount: number },
): SuperAdminTournamentSummaryDto {
    return {
        id: tournament.id,
        code: tournament.code,
        name: tournament.name,
        status: tournament.status,
        date: tournament.date.toISOString(),
        teamsCount: tournament.teamsCount,
        createdAt: tournament.createdAt.toISOString(),
    };
}
