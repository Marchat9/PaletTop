import { TournamentStatus } from 'src/enum/status.enum';

export function computePhaseName(
    tournamentStatus: TournamentStatus,
    currentSessionNumber: number,
): string {
    switch (true) {
        case tournamentStatus === TournamentStatus.DRAFT:
        case tournamentStatus === TournamentStatus.CANCELLED:
        default:
            return '';
        case tournamentStatus === TournamentStatus.COMPLETED:
            return `Championat terminé`;
        case tournamentStatus === TournamentStatus.ACTIVE:
            return `Phase ${currentSessionNumber}`;
    }
}
