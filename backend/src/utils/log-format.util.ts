/**
 * Dates and counts written in the job logs, read by a French admin: always in Paris time, whatever
 * the time zone of the server running the job.
 */
const LOG_TIME_ZONE = 'Europe/Paris';

const dayFormat = new Intl.DateTimeFormat('fr-FR', {
    timeZone: LOG_TIME_ZONE,
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
});
const dateFormat = new Intl.DateTimeFormat('fr-FR', {
    timeZone: LOG_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
});
const timeFormat = new Intl.DateTimeFormat('fr-FR', {
    timeZone: LOG_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
});

/** « jeu. 12/11/2026 » */
export function formatLogDay(date: Date): string {
    return dayFormat.format(date);
}

/** « 12/11/2026 », or « ? » when the date is missing. */
export function formatLogDate(date: Date | null | undefined): string {
    return date ? dateFormat.format(date) : '?';
}

/** « 18/11/2026 à 14:02 » */
export function formatLogDateTime(date: Date): string {
    return `${dateFormat.format(date)} à ${timeFormat.format(date)}`;
}

/** « aucun joueur », « 1 joueur », « 3 joueurs » */
export function formatLogCount(count: number, singular: string, plural: string): string {
    if (count === 0) {
        return `aucun ${singular}`;
    }
    return `${count} ${count === 1 ? singular : plural}`;
}
