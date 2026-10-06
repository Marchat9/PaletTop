import { Dialog } from '@angular/cdk/dialog';
import { Overlay } from '@angular/cdk/overlay';
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
import {
  findActiveNavKey,
  generateBurgerMenuItem,
} from 'src/app/pages/navigation/navigation.utils';
import { NavMenuPopup, NavMenuPopupData } from 'src/app/modales/nav-menu-popup/nav-menu-popup';
import { PwaInstallService } from 'src/app/services/pwa-install.service';
import { BurgerMenuClickKey, BurgerMenuItem } from 'src/app/shared/burger-menu/burger-menu.model';
import { selectNotificationCount } from 'src/app/store/app-config/app-config.selectors';
import { AppState } from 'src/app/store/app-store';
import { AboutPopupComponent } from '../../modales/about-popup/about-popup';
import { NotificationPopupComponent } from '../../modales/notification-popup/notification-popup';
import { SuperAdminConnectionPopupComponent } from '../../modales/super-admin-connection-popup/super-admin-connection-popup';
import { clearSuperAdminSession } from 'src/app/store/superadmin/superadmin.actions';
import { BottomNavComponent, NavItemSelection } from './bottom-nav/bottom-nav';
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

  // Organised by universe, like the home page: the role is chosen afterwards. Entries with sub-
  // destinations open a menu instead of navigating.
  readonly navItems: NavItem[] = [
    { key: 'home', label: 'Accueil', route: '/accueil', icon: 'home', matchPrefixes: ['/accueil'] },
    {
      key: 'tournament',
      label: 'Tournoi',
      icon: 'stadium',
      matchPrefixes: [
        '/player/tournament',
        '/admin/tournament',
        '/admin/tournament-creation',
        '/spectateur',
      ],
      children: [
        { label: 'Rejoindre en joueur', route: '/player/tournament', icon: 'person' },
        { label: 'Administrer', route: '/admin/tournament', icon: 'admin_panel_settings' },
        {
          label: 'Organiser un tournoi',
          route: '/admin/tournament-creation',
          icon: 'add_moderator',
        },
        { label: 'Suivre en spectateur', route: '/spectateur', icon: 'visibility' },
      ],
    },
    {
      key: 'training',
      label: 'Entraînement',
      icon: 'school',
      matchPrefixes: ['/player/training', '/admin/training', '/admin/training-creation'],
      children: [
        { label: 'Rejoindre en joueur', route: '/player/training', icon: 'person' },
        { label: 'Administrer', route: '/admin/training', icon: 'admin_panel_settings' },
        { label: 'Créer un Club', route: '/admin/training-creation', icon: 'group_add' },
      ],
    },
    {
      key: 'friendly',
      label: 'Amical',
      route: '/friendly-match',
      icon: 'handshake',
      matchPrefixes: ['/friendly-match'],
    },
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
  private readonly overlay = inject(Overlay);
  private readonly pwaInstallService = inject(PwaInstallService);

  private readonly notificationCount = this.store.selectSignal(selectNotificationCount);
  public readonly notificationBadge = computed(() => this.notificationCount() || null);

  public readonly activeNavKey = computed(() =>
    findActiveNavKey(this.navItems, this.currentRoute()),
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

  /**
   * Same menu in both formats: sheet coming up from the bottom on mobile, menu anchored under the
   * entry on desktop.
   */
  public onNavItemSelected({ item, anchor }: NavItemSelection): void {
    const children = item.children ?? [];
    if (children.length === 0) {
      return;
    }

    const isMobile = this.isMobile();
    const positionStrategy = isMobile
      ? // The clearance above the navigation bar comes from the position, not from a padding: the
        // panel would otherwise cover the bar without showing anything there, and would swallow
        // the click meant to close the sheet.
        this.overlay.position().global().bottom('4.5rem').width('100%')
      : this.overlay
          .position()
          .flexibleConnectedTo(anchor)
          // Always downwards: flipping up would cover the header, which is exactly what stands
          // above the anchor. When room runs out, reposition rather than flip - right alignment
          // first, then nudged back inside the window.
          .withPositions([
            { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 8 },
            { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
          ])
          .withPush(true)
          .withViewportMargin(8);

    this.dialog
      .open<string | undefined, NavMenuPopupData>(NavMenuPopup, {
        data: { title: item.label, items: children },
        positionStrategy,
        panelClass: isMobile ? 'nav-menu-sheet-panel' : 'nav-menu-popover-panel',
        backdropClass: isMobile ? 'dialog-backdrop-light' : 'nav-menu-popover-backdrop',
      })
      .closed.pipe(first())
      .subscribe((route) => {
        if (route) {
          this.router.navigate([route]);
        }
      });
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
