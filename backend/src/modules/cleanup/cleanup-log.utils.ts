import { Tournament } from 'src/entities/tournament.entity';
import { formatLogDate, formatLogDay } from 'src/utils/log-format.util';

/** Tournaments deleted by one cleanup rule, with what the log says about them. */
export interface TournamentCleanupGroup {
    /** « Terminé depuis plus de 7 j » */
    rule: string;
    tournaments: Tournament[];
    /** End of the line: the date that made the tournament expire. */
    detail: (tournament: Tournament) => string;
}

const ITEM_INDENT = '  ';

/** « Open de Vertou (VERTOU24) » */
export function tournamentLogLabel(tournament: Tournament): string {
    return `${tournament.name} (${tournament.code})`;
}

export function completedDetail(tournament: Tournament): string {
    return `du ${formatLogDay(tournament.date)}, terminé le ${formatLogDate(tournament.completedAt)}`;
}

export function draftDetail(tournament: Tournament): string {
    return `prévu le ${formatLogDate(tournament.date)}, créé le ${formatLogDate(tournament.createdAt)}`;
}

export function activeDetail(tournament: Tournament): string {
    return `du ${formatLogDay(tournament.date)}, démarré le ${formatLogDate(tournament.activatedAt)}`;
}

/** Summary line, then one line per deleted tournament, rule by rule. */
export function tournamentCleanupLogLines(groups: TournamentCleanupGroup[]): string[] {
    const total = groups.reduce((sum, group) => sum + group.tournaments.length, 0);
    if (!total) {
        return ['Nettoyage des tournois : rien à supprimer'];
    }
    return [
        `Nettoyage des tournois : ${total} tournoi(s) supprimé(s)`,
        ...groups.flatMap((group) =>
            group.tournaments.map(
                (tournament) =>
                    `${ITEM_INDENT}${group.rule} · ${tournamentLogLabel(tournament)} ${group.detail(tournament)}`,
            ),
        ),
    ];
}
