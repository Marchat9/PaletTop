import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { ToastrService } from 'ngx-toastr';
import { firstValueFrom, Observable, of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { removeLocalStorageData, setLocalStorageData } from './app-config.actions';
import { AppConfigEffects } from './app-config.effects';

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
