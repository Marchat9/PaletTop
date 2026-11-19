import { FormControl, FormGroup } from '@angular/forms';
import { TournamentModeParameterForm } from '../shared/tournament-configuration/tournament-mode-parameter/tournament-mode-parameter-form.model';
import { extractCompetitionConfiguration } from './tournament-configuration.utils';

function upDownModeParameter(pairingMode: 'random' | 'dutch'): TournamentModeParameterForm {
  return new FormGroup({
    competitionMode: new FormControl('up_down', { nonNullable: true }),
    upDownMode: new FormGroup({
      numberOfRound: new FormControl<number | undefined>(4, { nonNullable: true }),
      lastRoundByRanking: new FormControl(true, { nonNullable: true }),
      pairingMode: new FormControl(pairingMode, { nonNullable: true }),
    }),
  }) as unknown as TournamentModeParameterForm;
}

describe('extractCompetitionConfiguration', () => {
  it('sends the up-down pairing mode with the other up-down settings', () => {
    expect(extractCompetitionConfiguration(upDownModeParameter('dutch'))).toEqual({
      numberOfRound: 4,
      lastRoundByRanking: true,
      pairingMode: 'dutch',
    });
    expect(extractCompetitionConfiguration(upDownModeParameter('random'))).toEqual(
      expect.objectContaining({ pairingMode: 'random' }),
    );
  });
});
