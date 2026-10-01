import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { map, take } from 'rxjs';
import { selectCurrentTrainingAdminInformations } from 'src/app/store/training/training.selectors';

/**
 * No admin password, no admin page: back to the connection page, which asks for it.
 *
 * The password is read from the store, where it is restored from localStorage at startup
 * (ROOT_EFFECTS_INIT dispatches `updateLocalStorageData` synchronously, before the router activates
 * a route), so the guard can decide right away. Each page keeps its own effect for what comes next:
 * loading the group, and leaving if the password turns out to be wrong.
 */
export const trainingAdminGuard: CanActivateFn = () => {
  const router = inject(Router);

  return inject(Store)
    .select(selectCurrentTrainingAdminInformations)
    .pipe(
      take(1),
      map((adminInformations) =>
        adminInformations?.password ? true : router.createUrlTree(['/admin/training']),
      ),
    );
};
