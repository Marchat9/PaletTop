import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { Action } from '@ngrx/store';
import { ReplaySubject } from 'rxjs';
import { describe, expect, it } from 'vitest';
import {
  removeLocalStorageData,
  setLocalStorageData,
} from 'src/app/store/app-config/app-config.actions';
import { STORAGE_FRIENDLY_MATCH_KEY } from 'src/app/store/app-config/app-config.effects';
import { resetFriendlyMatch, setTeam1Name } from './friendly-match.actions';
import { FriendlyMatchEffects } from './friendly-match.effects';
import { FriendlyMatchState, initialFriendlyMatchState } from './friendly-match.reducer';
import { friendlyMatchFeatureKey } from './friendly-match.selectors';

function setup(state: FriendlyMatchState = initialFriendlyMatchState) {
  const actions$ = new ReplaySubject<Action>(1);

  TestBed.configureTestingModule({
    providers: [
      FriendlyMatchEffects,
      provideMockActions(() => actions$),
      provideMockStore({
        initialState: { [friendlyMatchFeatureKey]: state },
      }),
    ],
  });

  return { effects: TestBed.inject(FriendlyMatchEffects), actions$ };
}

describe('FriendlyMatchEffects', () => {
  it('persists the current match state to localStorage when a tracked action fires', async () => {
    const state = { ...initialFriendlyMatchState, team1Name: 'Les Rouges' };
    const { effects, actions$ } = setup(state);
    const emitted: Action[] = [];
    effects.persistFriendlyMatch$.subscribe((action) => emitted.push(action));

    actions$.next(setTeam1Name({ name: 'Les Rouges' }));
    await Promise.resolve();

    expect(emitted).toEqual([
      setLocalStorageData({ key: STORAGE_FRIENDLY_MATCH_KEY, value: state }),
    ]);
  });

  it('removes the saved match from localStorage on resetFriendlyMatch', async () => {
    const { effects, actions$ } = setup();
    const emitted: Action[] = [];
    effects.clearFriendlyMatch$.subscribe((action) => emitted.push(action));

    actions$.next(resetFriendlyMatch());
    await Promise.resolve();

    expect(emitted).toEqual([removeLocalStorageData({ key: STORAGE_FRIENDLY_MATCH_KEY })]);
  });
});
