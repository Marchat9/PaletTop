import { TournamentStatus } from 'src/enum/status.enum';
import { UpDownCompetitionConfiguration } from 'src/entities/tournament-competition-configuration.entity';

const MODE_LABEL = 'Montée / Descente';

/** True when this session is the last round and must pair teams by ranking instead of drawing. */
export function isRankingRound(
    config: UpDownCompetitionConfiguration,
    sessionNumber: number,
): boolean {
    return (
        !!config.lastRoundByRanking &&
        config.numberOfRound !== undefined &&
        config.numberOfRound !== null &&
        config.numberOfRound >= 2 &&
        sessionNumber === config.numberOfRound
    );
}

export function computePhaseName(
    tournamentStatus: TournamentStatus,
    currentSessionNumber: number,
    config: UpDownCompetitionConfiguration,
): string {
    switch (true) {
        case tournamentStatus === TournamentStatus.DRAFT:
        case tournamentStatus === TournamentStatus.CANCELLED:
        default:
            return '';
        case tournamentStatus === TournamentStatus.COMPLETED:
            return `${MODE_LABEL} terminée`;
        case tournamentStatus === TournamentStatus.ACTIVE &&
            isRankingRound(config, currentSessionNumber):
            return `${MODE_LABEL} — Dernière partie (au classement)`;
        case tournamentStatus === TournamentStatus.ACTIVE && !!config.numberOfRound:
            return `Partie ${currentSessionNumber}/${config.numberOfRound}`;
        case tournamentStatus === TournamentStatus.ACTIVE:
            return `Partie ${currentSessionNumber}`;
    }
}
