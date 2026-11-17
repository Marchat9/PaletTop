import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { first, from, of, switchMap } from 'rxjs';
import { CONNECTION_ROUTE_DATA_KEY, ConnectionPageConfig } from './connection-page.model';

/**
 * Entry of a universe without codes in the URL (/admin/tournament, /player/training…): opens the
 * popup asking for them, then leads to the page they open - or back home when it is cancelled.
 * What to ask and where to go comes from the route (see connection-page.configs.ts).
 */
@Component({
  selector: 'app-connection-page',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectionPage {
  private readonly dialog = inject(Dialog);
  private readonly router = inject(Router);
  private readonly store = inject(Store, { optional: true });
  private readonly route = inject(ActivatedRoute);

  constructor() {
    const config = this.route.snapshot.data[
      CONNECTION_ROUTE_DATA_KEY
    ] as ConnectionPageConfig<unknown>;
    const knownAccess =
      config.knownAccess && this.store ? config.knownAccess(this.store).pipe(first()) : of(null);

    knownAccess
      .pipe(
        switchMap((known) =>
          known
            ? of(known)
            : from(config.popup()).pipe(
                switchMap(
                  (popup) =>
                    this.dialog.open(popup, {
                      data: config.popupData?.(this.route.snapshot),
                      panelClass: 'dialog-panel',
                      backdropClass: 'dialog-backdrop-light',
                      disableClose: false,
                    }).closed,
                ),
              ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        void this.router.navigate(result ? config.target(result) : ['/accueil']);
      });
  }
}
