import {
  ConfirmationData,
  ConfirmationInfo,
} from 'src/app/modales/confirmation-popup/confirmation-popup';
import { Nullable } from 'src/app/models/nullable.model';
import { TournamentPlan } from 'src/app/models/tournament-plan.model';

const PHASE_CHANGE_NOTICE =
  'Fin des qualifications. Les tableaux seront constitués à partir du classement actuel : ' +
  'vérifiez les scores des qualifications avant de lancer.';

/**
 * The confirmation asked before the next round of a tournament: where it stands in the plan and,
 * when it opens the brackets, a reminder that the qualifying scores decide them.
 */
export function buildTournamentRoundConfirmation(
  roundNumber: number,
  plan: Nullable<Pick<TournamentPlan, 'rounds' | 'totalRounds'>>,
): ConfirmationData {
  const round = plan?.rounds.find((candidate) => candidate.number === roundNumber);
  const previous = plan?.rounds.find((candidate) => candidate.number === roundNumber - 1);
  const opensBrackets = round?.kind === 'elimination' && previous?.kind === 'qualifying';

  // An info tile always has a value: without a planned round, the round itself is the value.
  const info: ConfirmationInfo =
    plan && round
      ? { icon: 'route', label: `Round ${roundNumber} sur ${plan.totalRounds}`, value: round.label }
      : { icon: 'route', label: 'Prochain round', value: `Round ${roundNumber}` };

  return {
    title: 'Lancer le round suivant ?',
    icon: 'skip_next',
    message:
      `Le round ${roundNumber} va être tiré au sort, puis affiché sur les téléphones des équipes ` +
      "et sur l'écran spectateur. Il ne pourra pas être annulé.",
    confirmLabel: 'Lancer',
    info,
    notice: opensBrackets ? PHASE_CHANGE_NOTICE : undefined,
    dontAskAgainLabel: 'Ne plus demander pour ce tournoi',
  };
}

/** The confirmation asked before drawing a new round of a training session. */
export function buildTrainingRoundConfirmation(): ConfirmationData {
  return {
    title: 'Générer un nouveau round ?',
    icon: 'shuffle',
    message:
      'De nouvelles équipes et de nouveaux matchs vont être tirés au sort parmi les joueurs ' +
      'présents. Il ne pourra pas être annulé.',
    notice: 'Avez-vous bien enregistré les arrivées et les départs des joueurs ?',
    confirmLabel: 'Générer',
    dontAskAgainLabel: 'Ne plus demander pour cette séance',
  };
}
