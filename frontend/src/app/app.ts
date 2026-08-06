import { Component, effect, inject } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { Store } from '@ngrx/store';
import { first } from 'rxjs';
import { ThemeMode } from 'src/app/models/theme-mode.model';
import { setTheme } from 'src/app/store/app-config/app-config.actions';
import { AppState } from 'src/app/store/app-store';
import { Navigation } from './shared/navigation/navigation';
import { selectTheme } from 'src/app/store/app-config/app-config.selectors';
import { environment } from '../environments/environment';
import { InstallPwaPopupComponent } from './modales/install-pwa-popup/install-pwa-popup';
import { PwaInstallService } from './services/pwa-install.service';

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
  public changeTheme(theme: ThemeMode): void {
    this.store.dispatch(setTheme({ theme }));
  }

  constructor() {
    if (environment.pwa.enabled) {
      this.processPwa();
    }
  }

  private processPwa(): void {
    const dialog = inject(Dialog);
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

      dialog
        .open(InstallPwaPopupComponent, {
          panelClass: 'dialog-panel',
          backdropClass: 'dialog-backdrop',
        })
        .closed.pipe(first())
        .subscribe(() => {
          // Covers backdrop click / Escape (which bypass InstallPwaPopupComponent.close())
          // and a cancelled native install prompt — both must still start the dismiss
          // cooldown. Redundant with the explicit close() button's own dismiss() call,
          // which is harmless since dismiss() just overwrites a timestamp.
          pwaInstallService.dismiss();
        });
    });
  }
}
