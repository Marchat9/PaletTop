import { describe, expect, it } from 'vitest';
import { PlanRound, PlanRoundKind, TournamentPlan } from 'src/app/models/tournament-plan.model';
import {
  buildTournamentRoundConfirmation,
  buildTrainingRoundConfirmation,
} from './round-confirmation.util';

type RoundsPlan = Pick<TournamentPlan, 'rounds' | 'totalRounds'>;

/** A plan whose rounds have the given kinds, labelled "R<number>". */
function planOf(...kinds: PlanRoundKind[]): RoundsPlan {
  const rounds = kinds.map((kind, index): PlanRound => ({
    number: index + 1,
    kind,
    label: `R${index + 1}`,
    groups: [],
  }));
  return { rounds, totalRounds: rounds.length };
}

const PHASE_CHANGE_NOTICE =
  'Fin des qualifications. Les tableaux seront constitués à partir du classement actuel : ' +
  'vérifiez les scores des qualifications avant de lancer.';

describe('buildTournamentRoundConfirmation', () => {
  it('asks to start the next round', () => {
    expect(buildTournamentRoundConfirmation(4, null)).toMatchObject({
      title: 'Lancer le round suivant ?',
      icon: 'skip_next',
      message:
        "Le round 4 va être tiré au sort, puis affiché sur les téléphones des équipes et sur l'écran spectateur. Il ne pourra pas être annulé.",
      confirmLabel: 'Lancer',
      dontAskAgainLabel: 'Ne plus demander pour ce tournoi',
    });
  });

  it('places the round in the plan, without notice inside the qualifiers', () => {
    const data = buildTournamentRoundConfirmation(
      4,
      planOf('qualifying', 'qualifying', 'qualifying', 'qualifying', 'elimination'),
    );

    expect(data.info).toEqual({ icon: 'route', label: 'Round 4 sur 5', value: 'R4' });
    expect(data.notice).toBeUndefined();
  });

  it('warns when the round opens the brackets', () => {
    const data = buildTournamentRoundConfirmation(
      4,
      planOf('qualifying', 'qualifying', 'qualifying', 'elimination', 'elimination'),
    );

    expect(data.notice).toBe(PHASE_CHANGE_NOTICE);
  });

  it('does not warn again inside the brackets', () => {
    const data = buildTournamentRoundConfirmation(
      5,
      planOf('qualifying', 'qualifying', 'qualifying', 'elimination', 'elimination'),
    );

    expect(data.notice).toBeUndefined();
  });

  it('only names the round without a plan, or for a round the plan does not list', () => {
    const generic = { icon: 'route', label: 'Prochain round', value: 'Round 4' };

    expect(buildTournamentRoundConfirmation(4, null).info).toEqual(generic);
    expect(buildTournamentRoundConfirmation(4, planOf('qualifying', 'qualifying'))).toMatchObject({
      info: generic,
      notice: undefined,
    });
  });
});

describe('buildTrainingRoundConfirmation', () => {
  it('reminds to record arrivals and departures before drawing', () => {
    const data = buildTrainingRoundConfirmation();

    expect(data).toMatchObject({
      title: 'Générer un nouveau round ?',
      icon: 'shuffle',
      message:
        'De nouvelles équipes et de nouveaux matchs vont être tirés au sort parmi les joueurs présents. Il ne pourra pas être annulé.',
      notice: 'Avez-vous bien enregistré les arrivées et les départs des joueurs ?',
      confirmLabel: 'Générer',
      dontAskAgainLabel: 'Ne plus demander pour cette séance',
    });
    expect(data.info).toBeUndefined();
  });
});
