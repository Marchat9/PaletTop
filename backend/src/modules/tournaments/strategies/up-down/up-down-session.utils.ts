import { TournamentStatus } from 'src/enum/status.enum';
import { UpDownCompetitionConfiguration } from 'src/entities/tournament-competition-configuration.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { PairingMode } from 'src/enum/tounament.enum';
import { GlobalRankingEntry } from '../../responses/ranking.dto';

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

/**
 * True when this session is paired by ranking neighbours (1st-2nd, 3rd-4th…): every round after
 * the first one, except the frozen last round.
 */
export function isNeighborRound(
    config: UpDownCompetitionConfiguration,
    sessionNumber: number,
): boolean {
    return (
        resolvePairingMode(config) === PairingMode.NEIGHBORS &&
        sessionNumber > 1 &&
        !isRankingRound(config, sessionNumber)
    );
}

/**
 * Final standings of a tournament whose last round is frozen: the winner of plate 1 is 1st, its
 * opponent 2nd, the winner of plate 2 3rd, and so on; the team with the bye is last. The stats are
 * those of the aggregate `ranking`, only the rank is rewritten (1..n). A team missing from the last
 * round goes after the others, in ranking order.
 */
export function computeFrozenStandings(
    ranking: GlobalRankingEntry[],
    lastRoundMatches: TournamentMatch[],
): GlobalRankingEntry[] {
    const byPlate = lastRoundMatches
        .filter((match) => !match.isBye && match.teamB)
        .sort(
            (a, b) =>
                (a.plateNumber ?? Number.MAX_SAFE_INTEGER) -
                (b.plateNumber ?? Number.MAX_SAFE_INTEGER),
        );
    const byes = lastRoundMatches.filter((match) => match.isBye);

    const orderedIds: string[] = [];
    for (const match of byPlate) {
        const aWon = match.scoreA > match.scoreB;
        orderedIds.push(aWon ? match.teamA.id : match.teamB!.id);
        orderedIds.push(aWon ? match.teamB!.id : match.teamA.id);
    }
    const placed = new Set(orderedIds);
    const byeIds = byes.map((match) => match.teamA.id);
    const missing = [...ranking]
        .sort((a, b) => a.rank - b.rank)
        .map((entry) => entry.teamId)
        .filter((teamId) => !placed.has(teamId) && !byeIds.includes(teamId));

    const entries = new Map(ranking.map((entry) => [entry.teamId, entry]));
    return [...orderedIds, ...missing, ...byeIds]
        .map((teamId) => entries.get(teamId))
        .filter((entry): entry is GlobalRankingEntry => !!entry)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));
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
            return `${MODE_LABEL} — Dernière partie figée`;
        case tournamentStatus === TournamentStatus.ACTIVE && !!config.numberOfRound:
            return `Partie ${currentSessionNumber}/${config.numberOfRound}`;
        case tournamentStatus === TournamentStatus.ACTIVE:
            return `Partie ${currentSessionNumber}`;
    }
}
