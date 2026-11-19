import { TrainingSession } from 'src/entities/training-session.entity';
import {
    formatLogCount,
    formatLogDate,
    formatLogDateTime,
    formatLogDay,
} from 'src/utils/log-format.util';

/** What the auto-close job did with one idle session. */
export type AutoCloseOutcome =
    | { kind: 'closed'; session: TrainingSession }
    | { kind: 'closedWithRound'; session: TrainingSession; roundNumber: number }
    | { kind: 'leftOpen'; session: TrainingSession; roundNumber: number };

const ITEM_INDENT = '  ';

/** « Club du jeudi (QAUI) · séance 425390 du jeu. 12/11/2026 » */
export function sessionLogLabel(session: TrainingSession): string {
    const training = session.training
        ? `${session.training.name} (${session.training.code})`
        : 'Entraînement inconnu';
    return `${training} · séance ${session.code} du ${formatLogDay(session.date)}`;
}

/** Same training together, then by date: the log reads club by club. */
function byTrainingThenDate(a: TrainingSession, b: TrainingSession): number {
    const byTraining = (a.training?.name ?? '').localeCompare(b.training?.name ?? '', 'fr');
    return byTraining || a.date.getTime() - b.date.getTime();
}

/** Why an empty session goes: nobody checked in, or nobody ever played a round. */
function emptinessReason(session: TrainingSession): string {
    const players = session.participants?.length ?? 0;
    if (players === 0) {
        return 'aucun joueur';
    }
    return `${formatLogCount(players, 'joueur', 'joueurs')}, aucun round`;
}

/** Summary line, then one line per deleted session. */
export function trainingCleanupLogLines(
    sessions: TrainingSession[],
    retentionDays: number,
): string[] {
    const rule = `clôturées depuis plus de ${retentionDays} j, sans joueur ou sans round`;
    if (!sessions.length) {
        return [`Nettoyage des séances vides : rien à supprimer (${rule})`];
    }
    return [
        `Nettoyage des séances vides : ${sessions.length} séance(s) supprimée(s) (${rule})`,
        ...[...sessions]
            .sort(byTrainingThenDate)
            .map(
                (session) =>
                    `${ITEM_INDENT}${sessionLogLabel(session)}, clôturée le ${formatLogDate(session.closedAt)} · ${emptinessReason(session)}`,
            ),
    ];
}

function outcomeLabel(outcome: AutoCloseOutcome): string {
    switch (outcome.kind) {
        case 'closed':
            return 'clôturée';
        case 'closedWithRound':
            return `clôturée (round ${outcome.roundNumber} clôturé avec elle)`;
        case 'leftOpen':
            return `laissée ouverte : round ${outcome.roundNumber} avec des matchs non validés`;
    }
}

/** Summary line, then one line per idle session, closed or left open. */
export function autoCloseLogLines(outcomes: AutoCloseOutcome[], idleHours: number): string[] {
    const rule = `Clôture des séances inactives depuis plus de ${idleHours} h`;
    if (!outcomes.length) {
        return [`${rule} : aucune séance à clôturer`];
    }
    const leftOpen = outcomes.filter((outcome) => outcome.kind === 'leftOpen').length;
    const closed = outcomes.length - leftOpen;
    const summary = leftOpen
        ? `${rule} : ${closed} clôturée(s), ${leftOpen} laissée(s) ouverte(s)`
        : `${rule} : ${closed} clôturée(s)`;
    return [
        summary,
        ...[...outcomes]
            .sort((a, b) => byTrainingThenDate(a.session, b.session))
            .map(
                (outcome) =>
                    `${ITEM_INDENT}${sessionLogLabel(outcome.session)} · dernière activité le ${formatLogDateTime(outcome.session.lastActivityAt)} · ${outcomeLabel(outcome)}`,
            ),
    ];
}
