import { Tournament } from 'src/entities/tournament.entity';
import { TournamentStatus } from 'src/enum/status.enum';
import { ScoreCalculation } from 'src/enum/tounament.enum';

export interface SpectatorTournamentDto {
    id: string;
    code: string;
    name: string;
    status: TournamentStatus;
    phaseName: string;
    scoreCalculation: ScoreCalculation;
    /** Registered teams, shown while the tournament has not started yet. */
    teamNames: string[];
}

/** Team names in natural order: « Équipe 2 » before « Équipe 11 ». */
export function sortTeamNames(teams: { name: string }[]): string[] {
    return teams
        .map((team) => team.name)
        .sort((a, b) => a.localeCompare(b, 'fr', { numeric: true, sensitivity: 'base' }));
}

export function toSpectatorTournamentDto(
    tournament: Tournament,
    phaseName: string,
): SpectatorTournamentDto {
    return {
        id: tournament.id,
        code: tournament.code,
        name: tournament.name,
        status: tournament.status,
        phaseName,
        scoreCalculation: tournament.configuration.scoreCalculation,
        teamNames: sortTeamNames(tournament.teams ?? []),
    };
}
