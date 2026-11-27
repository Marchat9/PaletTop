import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { ROOT_EFFECTS_INIT } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { ToastrService } from 'ngx-toastr';
import { firstValueFrom, Observable, of, toArray } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  removeLocalStorageData,
  setLocalStorageData,
  updateLocalStorageData,
} from './app-config.actions';
import { AppConfigEffects } from './app-config.effects';
import { ROUND_CONFIRMATION_SKIP_TTL_MS, skipRoundConfirmationKey } from './round-confirmation';

const STORAGE_KEY = 'app-local-storage-data';

function setup(actions$: Observable<Action>) {
  TestBed.configureTestingModule({
    providers: [
      AppConfigEffects,
      provideMockActions(() => actions$),
      { provide: ToastrService, useValue: { show: vi.fn() } },
    ],
  });
  return TestBed.inject(AppConfigEffects);
}

describe('AppConfigEffects', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  describe('at startup', () => {
    it('drops the round opt-outs older than 24 hours, here and in the storage', async () => {
      const now = Date.UTC(2026, 10, 27, 12);
      vi.spyOn(Date, 'now').mockReturnValue(now);
      const fresh = skipRoundConfirmationKey('tournament', 'ABCD');
      const expired = skipRoundConfirmationKey('training', '1234');
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          [fresh]: now - 1000,
          [expired]: now - ROUND_CONFIRMATION_SKIP_TTL_MS - 1,
          'tournament-code': 'ABCD',
        }),
      );
      const effects = setup(of({ type: ROOT_EFFECTS_INIT }));

      const actions = await firstValueFrom(effects.initAppConfig$.pipe(toArray()));

      const kept = { [fresh]: now - 1000, 'tournament-code': 'ABCD' };
      expect(actions).toContainEqual(updateLocalStorageData({ data: kept }));
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(kept);
    });
  });

  describe('when the storage refuses to write (private mode, full quota)', () => {
    beforeEach(() => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      });
    });

    it('keeps going when a value is saved', async () => {
      const effects = setup(of(setLocalStorageData({ key: 'k', value: 1 })));

      await expect(firstValueFrom(effects.persistLocalStorageData$)).resolves.toBeDefined();
    });

    it('keeps going when a value is removed', async () => {
      const effects = setup(of(removeLocalStorageData({ key: 'k' })));

      await expect(firstValueFrom(effects.removeLocalStorageData$)).resolves.toBeDefined();
    });
  });
});
