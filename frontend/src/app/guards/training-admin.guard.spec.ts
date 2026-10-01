import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  GuardResult,
  provideRouter,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { firstValueFrom, Observable } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { selectCurrentTrainingAdminInformations } from 'src/app/store/training/training.selectors';
import { trainingAdminGuard } from './training-admin.guard';

// The guard always answers with an observable: it reads the store.
function run(): Promise<GuardResult> {
  return firstValueFrom(
    TestBed.runInInjectionContext(() =>
      trainingAdminGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    ) as Observable<GuardResult>,
  );
}

describe('trainingAdminGuard', () => {
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideMockStore({
          selectors: [{ selector: selectCurrentTrainingAdminInformations, value: null }],
        }),
      ],
    });
    store = TestBed.inject(MockStore);
  });

  it('laisse passer un administrateur connecté', async () => {
    store.overrideSelector(selectCurrentTrainingAdminInformations, {
      code: 'LAITON-2026',
      password: 'secret',
    });
    store.refreshState();

    await expect(run()).resolves.toBe(true);
  });

  // The password is what the admin endpoints ask for: without it, no page has anything to show.
  it('renvoie à la connexion sans mot de passe', async () => {
    const result = await run();

    expect(result).toEqual(TestBed.inject(Router).createUrlTree(['/admin/training']));
  });
});
