import { FormControl, FormGroup } from '@angular/forms';
import { TournamentConfigurationForm } from './tournament-configuration-form.model';
import {
  isLastRoundByRankingAllowed,
  resetLastRoundByRankingIfNotAllowed,
} from './tournament-configuration.utils';

function upDownForm(numberOfRound: number | undefined, lastRoundByRanking: boolean) {
  const upDownMode = new FormGroup({
    numberOfRound: new FormControl<number | undefined>(numberOfRound, { nonNullable: true }),
    lastRoundByRanking: new FormControl(lastRoundByRanking, { nonNullable: true }),
  });
  const form = new FormGroup({
    modeParameter: new FormGroup({ upDownMode }),
  }) as unknown as TournamentConfigurationForm;
  return { form, upDownMode };
}

describe('isLastRoundByRankingAllowed', () => {
  it('autorise la dernière partie au classement à partir de 2 parties', () => {
    expect(isLastRoundByRankingAllowed(2)).toBe(true);
    expect(isLastRoundByRankingAllowed(5)).toBe(true);
  });

  it("l'interdit sans nombre de parties ou avec une seule partie", () => {
    expect(isLastRoundByRankingAllowed(undefined)).toBe(false);
    expect(isLastRoundByRankingAllowed(null)).toBe(false);
    expect(isLastRoundByRankingAllowed(1)).toBe(false);
  });
});

describe('resetLastRoundByRankingIfNotAllowed', () => {
  it('décoche la case quand le nombre de parties passe sous 2', () => {
    const { form, upDownMode } = upDownForm(1, true);
    resetLastRoundByRankingIfNotAllowed(form);
    expect(upDownMode.controls.lastRoundByRanking.value).toBe(false);
  });

  it('décoche la case quand le nombre de parties est vidé', () => {
    const { form, upDownMode } = upDownForm(undefined, true);
    resetLastRoundByRankingIfNotAllowed(form);
    expect(upDownMode.controls.lastRoundByRanking.value).toBe(false);
  });

  it('laisse la case cochée avec au moins 2 parties', () => {
    const { form, upDownMode } = upDownForm(5, true);
    resetLastRoundByRankingIfNotAllowed(form);
    expect(upDownMode.controls.lastRoundByRanking.value).toBe(true);
  });
});
