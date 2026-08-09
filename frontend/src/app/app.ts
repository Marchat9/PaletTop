import { Dialog } from '@angular/cdk/dialog';
import { Component, effect, inject } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { Store } from '@ngrx/store';
import { filter, first, interval, Subject, takeUntil } from 'rxjs';
import { ThemeMode } from 'src/app/models/theme-mode.model';
import { setTheme } from 'src/app/store/app-config/app-config.actions';
import { selectTheme } from 'src/app/store/app-config/app-config.selectors';
import { AppState } from 'src/app/store/app-store';
import { environment } from '../environments/environment';
import { PwaInstallService } from './services/pwa-install.service';
import { Navigation } from './shared/navigation/navigation';

@Component({
  selector: 'app-root',
  imports: [Navigation],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly store = inject(Store<AppState>);

  // Theme
  public readonly theme = this.store.selectSignal(selectTheme);

  private destroy$ = new Subject<void>();
  constructor() {
    if (environment.pwa.enabled) {
      this.processPwa();
      this.checkForPwaUpdate();
    }
  }

  public changeTheme(theme: ThemeMode): void {
    this.store.dispatch(setTheme({ theme }));
  }

  private processPwa(): void {
    const pwaInstallService = inject(PwaInstallService);

    // `shouldShowPrompt()` is a plain method, not a signal, but any Angular signals it
    // reads internally (via `platform()`/`installed()`) are still tracked through the
    // call into it, so this effect reruns when `beforeinstallprompt` (or `appinstalled`)
    // later flips those signals — unlike a one-shot `afterNextRender`, which ran before
    // Chrome had a chance to dispatch `beforeinstallprompt` at all.
    let hasOpenedInstallPrompt = false;

    effect(() => {
      if (hasOpenedInstallPrompt || !pwaInstallService.shouldShowPrompt()) {
        return;
      }
      hasOpenedInstallPrompt = true;
      pwaInstallService.displayInstallPopUp();
    });
  }

  private checkForPwaUpdate(): void {
    const pwaInstallService = inject(PwaInstallService);
    if (pwaInstallService.isInstalled()) {
      const swUpdate = inject(SwUpdate);
      // Check every N secondes if a new version is available
      interval(30_000)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          swUpdate.checkForUpdate();
        });

      // Trigger when a new version is available
      swUpdate.versionUpdates
        .pipe(
          filter((evt) => evt.type === 'VERSION_READY'),
          takeUntil(this.destroy$),
        )
        .subscribe(() => {
          console.debug('[PWA] New version was available - reloading.');
          window.location.reload();
        });
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
