import { Dialog } from '@angular/cdk/dialog';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  AppUpdatePopupComponent,
  AppUpdatePopupData,
} from 'src/app/modales/app-update-popup/app-update-popup';
import { ServerUnreachablePopupComponent } from 'src/app/modales/server-unreachable-popup/server-unreachable-popup';
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
  private isUnreachableOpen = false;

  /**
   * Asks the backend which release is deployed: prompts when this app is another one, and tells
   * when the backend does not answer. Local builds (no release) only check the connection.
   */
  public checkVersion(): void {
    const currentVersion = environment.version;
    this.http.get<AppVersionDto>(`${this.apiBaseUrl}/version`).subscribe({
      next: ({ version }) => {
        if (isRelease(currentVersion) && isRelease(version) && version !== currentVersion) {
          this.promptUpdate(version);
        }
      },
      error: () => this.promptServerUnreachable(),
    });
  }

  /** « Connexion au serveur impossible », once at a time; « Réessayer » checks again. */
  public promptServerUnreachable(): void {
    if (this.isUnreachableOpen) {
      return;
    }
    this.isUnreachableOpen = true;
    this.dialog
      .open<boolean>(ServerUnreachablePopupComponent, {
        panelClass: 'dialog-panel',
        backdropClass: 'dialog-backdrop',
      })
      .closed.subscribe((retry) => {
        this.isUnreachableOpen = false;
        if (retry) {
          this.checkVersion();
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
   * with the new version. Only the Cache Storage of the worker is emptied: cookies, local and
   * session storage (admin access, theme, notifications) are left untouched.
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
