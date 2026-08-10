import { PlayerClub } from 'src/entities/player_club.entity';

export interface SuperAdminClubSummaryDto {
    id: string;
    name: string;
    playersCount: number;
}

export function toSuperAdminClubSummaryDto(
    club: PlayerClub & { playersCount: number },
): SuperAdminClubSummaryDto {
    return {
        id: club.id,
        name: club.name,
        playersCount: club.playersCount,
    };
}
