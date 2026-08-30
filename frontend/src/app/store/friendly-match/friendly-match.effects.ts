import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { map, withLatestFrom } from 'rxjs';
import {
  removeLocalStorageData,
  setLocalStorageData,
} from 'src/app/store/app-config/app-config.actions';
import { STORAGE_FRIENDLY_MATCH_KEY } from 'src/app/store/app-config/app-config.effects';
import {
  resetFriendlyMatch,
  resetHistoryMatch,
  setTargetScore,
  setTeam1Name,
  setTeam2Name,
  startNextMatch,
  updateTeam1Score,
  updateTeam2Score,
} from './friendly-match.actions';
import { selectFriendlyMatchState } from './friendly-match.selectors';

@Injectable()
export class FriendlyMatchEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);

  persistFriendlyMatch$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        setTeam1Name,
        setTeam2Name,
        setTargetScore,
        updateTeam1Score,
        updateTeam2Score,
        startNextMatch,
        resetHistoryMatch,
      ),
      withLatestFrom(this.store.select(selectFriendlyMatchState)),
      map(([, state]) => setLocalStorageData({ key: STORAGE_FRIENDLY_MATCH_KEY, value: state })),
    ),
  );

  clearFriendlyMatch$ = createEffect(() =>
    this.actions$.pipe(
      ofType(resetFriendlyMatch),
      map(() => removeLocalStorageData({ key: STORAGE_FRIENDLY_MATCH_KEY })),
    ),
  );
}
