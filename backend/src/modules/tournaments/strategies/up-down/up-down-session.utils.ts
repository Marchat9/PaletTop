import { TournamentStatus } from 'src/enum/status.enum';
import { UpDownCompetitionConfiguration } from 'src/entities/tournament-competition-configuration.entity';
import { PairingMode } from 'src/enum/tounament.enum';

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

/** Pairing mode of the tournament; tournaments created before it existed are RANDOM. */
export function resolvePairingMode(config: UpDownCompetitionConfiguration): PairingMode {
    return config.pairingMode ?? PairingMode.RANDOM;
}

/**
 * True when this session is paired by the Dutch Swiss system: every round after the first one,
 * except the ranking-based last round (1v2, 3v4... by ranking).
 */
export function isDutchRound(
    config: UpDownCompetitionConfiguration,
    sessionNumber: number,
): boolean {
    return (
        resolvePairingMode(config) === PairingMode.DUTCH &&
        sessionNumber > 1 &&
        !isRankingRound(config, sessionNumber)
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
