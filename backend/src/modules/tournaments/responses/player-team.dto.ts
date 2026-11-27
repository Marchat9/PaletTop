import { TeamDto } from './admin-tournament.dto';

/** What a team needs to know about its own place in the tournament, besides its identity. */
export interface TeamTournamentStatus {
    /** Stopped after the qualifiers: no elimination match, the qualifying rank is final. */
    eliminatedAfterQualifying: boolean;
}

/** The team as the player and spectator screens read it. */
export interface PlayerTeamDto extends TeamDto, TeamTournamentStatus {}

export function toPlayerTeamDto(team: TeamDto, status: TeamTournamentStatus): PlayerTeamDto {
    return { ...team, ...status };
}
