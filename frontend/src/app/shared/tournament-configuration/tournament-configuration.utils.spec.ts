import { FormControl, FormGroup } from '@angular/forms';
import { TournamentConfigurationForm } from './tournament-configuration-form.model';
import {
  differentFromHomeClub,
  isLastRoundByRankingAllowed,
  syncLastRoundByRankingAvailability,
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

describe('syncLastRoundByRankingAvailability', () => {
  it('décoche la case quand le nombre de parties passe sous 2', () => {
    const { form, upDownMode } = upDownForm(1, true);
    syncLastRoundByRankingAvailability(form);
    expect(upDownMode.controls.lastRoundByRanking.value).toBe(false);
  });

  it('décoche la case quand le nombre de parties est vidé', () => {
    const { form, upDownMode } = upDownForm(undefined, true);
    syncLastRoundByRankingAvailability(form);
    expect(upDownMode.controls.lastRoundByRanking.value).toBe(false);
  });

  it('laisse la case cochée avec au moins 2 parties', () => {
    const { form, upDownMode } = upDownForm(5, true);
    syncLastRoundByRankingAvailability(form);
    expect(upDownMode.controls.lastRoundByRanking.value).toBe(true);
  });

  it('désactive le champ sous 2 parties et le réactive ensuite', () => {
    const { form, upDownMode } = upDownForm(1, false);
    syncLastRoundByRankingAvailability(form);
    expect(upDownMode.controls.lastRoundByRanking.disabled).toBe(true);

    upDownMode.controls.numberOfRound.setValue(3);
    syncLastRoundByRankingAvailability(form);
    expect(upDownMode.controls.lastRoundByRanking.enabled).toBe(true);
  });
});

describe('differentFromHomeClub', () => {
  function championshipGroup(homeTeam: string, awayTeam: string) {
    return new FormGroup({
      homeTeam: new FormControl(homeTeam, { nonNullable: true }),
      awayTeam: new FormControl(awayTeam, { nonNullable: true }),
    });
  }

  it('rejects the same club on both sides, whatever the case and spaces', () => {
    const group = championshipGroup('Club A', ' club a ');
    expect(differentFromHomeClub(group.controls.awayTeam)).toEqual({ sameClub: true });
  });

  it('accepts two different clubs, or a home club not filled in yet', () => {
    expect(
      differentFromHomeClub(championshipGroup('Club A', 'Club B').controls.awayTeam),
    ).toBeNull();
    expect(differentFromHomeClub(championshipGroup('', '').controls.awayTeam)).toBeNull();
  });
});
