import { Dialog } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Signal,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { environment } from '@environment';
import { Store } from '@ngrx/store';
import { filter, first } from 'rxjs';
import { ThemeMode } from 'src/app/models/theme-mode.model';
import { generateBurgerMenuItem } from 'src/app/pages/navigation/navigation.utils';
import { PwaInstallService } from 'src/app/services/pwa-install.service';
import { BurgerMenuClickKey, BurgerMenuItem } from 'src/app/shared/burger-menu/burger-menu.model';
import { selectNotificationCount } from 'src/app/store/app-config/app-config.selectors';
import { AppState } from 'src/app/store/app-store';
import { AboutPopupComponent } from '../../modales/about-popup/about-popup';
import { NotificationPopupComponent } from '../../modales/notification-popup/notification-popup';
import { SuperAdminConnectionPopupComponent } from '../../modales/super-admin-connection-popup/super-admin-connection-popup';
import { clearSuperAdminSession } from 'src/app/store/superadmin/superadmin.actions';
import { BottomNavComponent } from './bottom-nav/bottom-nav';
import { NavItem } from './nav-item.entity';
import { TopBarComponent } from './top-bar/top-bar';

@Component({
  selector: 'app-navigation',
  imports: [TopBarComponent, RouterOutlet, BottomNavComponent],
  templateUrl: './navigation.html',
  styleUrl: './navigation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Navigation {
  readonly theme = input.required<ThemeMode>();
  readonly changeTheme = output<ThemeMode>();

  readonly appName: string = environment.appName;
  readonly mobileBpPx: number = environment.limitMobileSizePx;

  readonly navItems: NavItem[] = [
    { label: 'Accueil', route: '/accueil', icon: 'home' },
    { label: 'Joueur', route: '/player', icon: 'person' },
    { label: 'Match Amical', route: '/friendly-match', icon: 'handshake' },
    { label: 'Admin', route: '/admin', icon: 'admin_panel_settings' },
  ];
  readonly burgerMenuItem: Signal<BurgerMenuItem[]> = computed(() =>
    generateBurgerMenuItem(
      this.theme(),
      environment.burgerMenu.disabledKeys,
      environment.burgerMenu.hiddenKeys,
    ),
  );

  readonly currentRoute = signal('');
  readonly isMobile = signal(false);

  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly store = inject(Store<AppState>);
  private readonly dialog = inject(Dialog);
  private readonly pwaInstallService = inject(PwaInstallService);

  private readonly notificationCount = this.store.selectSignal(selectNotificationCount);
  public readonly notificationBadge = computed(() => this.notificationCount() || null);

  public readonly currentRouteSplited = computed(
    () => `/${this.currentRoute().split('/')[1] || ''}`,
  );

  constructor() {
    this.currentRoute.set(this.router.url);

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.currentRoute.set(this.router.url);
      });

    if (typeof window !== 'undefined') {
      const setMode = () => {
        this.isMobile.set(window.innerWidth < this.mobileBpPx);
      };

      setMode();
      window.addEventListener('resize', setMode);
      this.destroyRef.onDestroy(() => window.removeEventListener('resize', setMode));
    }
  }

  public onNotificationClick(): void {
    this.dialog.open(NotificationPopupComponent, {
      panelClass: 'dialog-panel',
      backdropClass: 'dialog-backdrop',
    });
  }

  public burgerMenuClick(eventKey: BurgerMenuClickKey): void {
    switch (eventKey) {
      case 'GITHUB':
        window.open(environment.githubRepoUrl, '_blank');
        break;
      case 'PWA':
        this.pwaInstallService.displayInstallPopUp();
        break;
      case 'ABOUT':
        this.openAboutDialog();
        break;
      case 'SUPER_ADMIN':
        this.openSuperAdminConnectionDialog();
        break;
      default:
        console.warn(`BurgerKey [${eventKey}] not implemented.`);
    }
  }

  private openAboutDialog(): void {
    this.dialog.open(AboutPopupComponent, {
      panelClass: 'dialog-panel',
      backdropClass: 'dialog-backdrop',
    });
  }

  private openSuperAdminConnectionDialog(): void {
    this.dialog
      .open<boolean>(SuperAdminConnectionPopupComponent, {
        panelClass: 'dialog-panel',
        backdropClass: 'dialog-backdrop',
      })
      .closed.pipe(first())
      .subscribe((connected) => {
        if (connected) {
          this.router.navigate(['/super-admin']);
        } else {
          this.store.dispatch(clearSuperAdminSession());
        }
      });
  }
}
