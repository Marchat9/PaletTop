import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { environment } from '@environment';
import { filter, first } from 'rxjs';
import { ThemeMode } from 'src/app/models/theme-mode.model';
import { selectNotificationCount } from 'src/app/store/app-config/app-config.selectors';
import { AppState } from 'src/app/store/app-store';
import { Store } from '@ngrx/store';
import { BottomNavComponent } from './bottom-nav/bottom-nav';
import { NavItem } from './nav-item.entity';
import { NotificationPopupComponent } from '../../modales/notification-popup/notification-popup';
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

  readonly currentRoute = signal('');
  readonly isMobile = signal(false);

  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly store = inject(Store<AppState>);
  private readonly dialog = inject(Dialog);

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
    this.dialog
      .open(NotificationPopupComponent, {
        panelClass: 'dialog-panel',
        backdropClass: 'dialog-backdrop',
      })
      .closed.pipe(first())
      .subscribe(() => {
        console.log('Notification dialog closed');
      });
  }

  public redirectToGithub(): void {
    window.open(environment.githubRepoUrl, '_blank');
  }
}
