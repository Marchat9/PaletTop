import { TournamentStatus } from 'src/enum/status.enum';

export interface MetricsDto {
    tournaments: {
        total: number;
        draft: number;
        active: number;
        completed: number;
        cancelled: number;
    };
    clubs: {
        total: number;
    };
    trainings: {
        total: number;
        openSessions: number;
    };
}

export function toMetricsDto(
    tournamentsByStatus: Record<TournamentStatus, number>,
    clubCount: number,
    trainingCount: number,
    openTrainingSessionCount: number,
): MetricsDto {
    const draft = tournamentsByStatus[TournamentStatus.DRAFT];
    const active = tournamentsByStatus[TournamentStatus.ACTIVE];
    const completed = tournamentsByStatus[TournamentStatus.COMPLETED];
    const cancelled = tournamentsByStatus[TournamentStatus.CANCELLED];

    return {
        tournaments: {
            total: draft + active + completed + cancelled,
            draft,
            active,
            completed,
            cancelled,
        },
        clubs: { total: clubCount },
        trainings: { total: trainingCount, openSessions: openTrainingSessionCount },
    };
}
