import { Dialog } from '@angular/cdk/dialog';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, EMPTY } from 'rxjs';
import {
  AppUpdatePopupComponent,
  AppUpdatePopupData,
} from 'src/app/modales/app-update-popup/app-update-popup';
import { Nullable } from 'src/app/models/nullable.model';
import { environment } from 'src/environments/environment';

/** Placeholder of local and PR builds: no release to compare. */
const UNRELEASED_VERSION = '0.0.0';

interface AppVersionDto {
  version: string;
}

function isRelease(version: Nullable<string>): version is string {
  return !!version && version !== UNRELEASED_VERSION;
}

/**
 * Keeps the app on the deployed release. Front and back are built together from the same tag:
 * a backend on another version means this (service-worker cached) app is stale.
 */
@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private readonly http = inject(HttpClient);
  private readonly dialog = inject(Dialog);
  private readonly apiBaseUrl = environment.backBaseApiUrl;

  private isPromptOpen = false;

  /** Asks the backend which release is deployed and prompts when this app is another one. */
  public checkVersion(): void {
    const currentVersion = environment.version;
    if (!isRelease(currentVersion)) {
      return;
    }
    this.http
      .get<AppVersionDto>(`${this.apiBaseUrl}/version`)
      // Offline or backend restarting: nothing to compare, the next check will tell.
      .pipe(catchError(() => EMPTY))
      .subscribe(({ version }) => {
        if (isRelease(version) && version !== currentVersion) {
          this.promptUpdate(version);
        }
      });
  }

  /** Opens the « new version » popup, once at a time; refreshing reloads the app for good. */
  public promptUpdate(latestVersion: Nullable<string> = null): void {
    if (this.isPromptOpen) {
      return;
    }
    this.isPromptOpen = true;
    this.dialog
      .open<boolean, AppUpdatePopupData>(AppUpdatePopupComponent, {
        data: { currentVersion: environment.version, latestVersion },
        panelClass: 'dialog-panel',
        backdropClass: 'dialog-backdrop',
      })
      .closed.subscribe((refresh) => {
        this.isPromptOpen = false;
        if (refresh) {
          void this.forceRefresh();
        }
      });
  }

  /**
   * Reload that really loads the new release: a plain refresh is answered by the service worker
   * from its cache (the installed PWA kept the old version). Unregistering it and emptying the
   * app caches makes the reload fetch everything from the server; the worker installs again,
   * with the new version.
   */
  public async forceRefresh(): Promise<void> {
    try {
      const registrations = (await navigator.serviceWorker?.getRegistrations()) ?? [];
      await Promise.all(registrations.map((registration) => registration.unregister()));
    } catch {
      // No service worker access (private mode, unsupported): the reload still happens.
    }
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    } catch {
      // Same: never block the reload on a cache cleanup failure.
    }
    this.reloadPage();
  }

  /** The actual reload, apart so tests can replace it. */
  public reloadPage(): void {
    window.location.reload();
  }
}
