import { Component, effect, inject } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { Store } from '@ngrx/store';
import { filter, merge, Subject, takeUntil } from 'rxjs';
import { ThemeMode } from 'src/app/models/theme-mode.model';
import { addNotification, setTheme } from 'src/app/store/app-config/app-config.actions';
import { loadPublicSettings } from 'src/app/store/app-settings/app-settings.actions';
import { newId } from 'src/app/utils/unique-id.util';
import { selectTheme } from 'src/app/store/app-config/app-config.selectors';
import { AppState } from 'src/app/store/app-store';
import { environment } from '../environments/environment';
import { PwaInstallService } from './services/pwa-install.service';
import { AppUpdateService } from './services/app-update.service';
import { AppVisibilityService } from './services/app-visibility.service';
import { deployCheckSlots$ } from './utils/deploy-schedule.util';
import { Navigation } from './pages/navigation/navigation';

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
  private readonly appUpdateService = inject(AppUpdateService);
  private readonly appVisibility = inject(AppVisibilityService);

  constructor() {
    // Public settings (e.g. score calculations offered per mode) are read by several pages.
    this.store.dispatch(loadPublicSettings());
    this.watchAppVersion();
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

  /**
   * Compares this app with the deployed release at startup, each time the app comes back, and a
   * few minutes after each deployment slot (on the hour and at half past).
   */
  private watchAppVersion(): void {
    // A toast, not a popup: part of the app keeps working offline.
    this.appUpdateService.serverUnreachable$.pipe(takeUntil(this.destroy$)).subscribe(() =>
      this.store.dispatch(
        addNotification({
          notification: {
            id: newId(),
            message: 'Connexion au serveur impossible. Les matchs amicaux restent disponibles.',
            typeIcon: 'warning',
            type: 'Connexion',
            createdAt: Date.now(),
          },
        }),
      ),
    );

    this.appUpdateService.checkVersion();
    merge(this.appVisibility.resumed$, deployCheckSlots$())
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.appUpdateService.checkVersion());
  }

  /**
   * Browser tab or installed PWA alike: the service worker looks for a new build at the same
   * moments (deployment slots, app coming back) and, once it is downloaded, the « new version »
   * popup offers the forced refresh (a plain reload would be served the old version from cache).
   */
  private checkForPwaUpdate(): void {
    const swUpdate = inject(SwUpdate);
    if (!swUpdate.isEnabled) {
      return;
    }
    merge(this.appVisibility.resumed$, deployCheckSlots$())
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        swUpdate.checkForUpdate().catch(() => undefined);
      });

    swUpdate.versionUpdates
      .pipe(
        filter((evt) => evt.type === 'VERSION_READY'),
        takeUntil(this.destroy$),
      )
      .subscribe(() => this.appUpdateService.promptUpdate());
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
