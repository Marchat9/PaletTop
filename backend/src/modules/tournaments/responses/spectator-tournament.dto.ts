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
        teamNames: (tournament.teams ?? [])
            .map((team) => team.name)
            .sort((a, b) => a.localeCompare(b, 'fr', { numeric: true, sensitivity: 'base' })),
    };
}
