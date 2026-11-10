import { DatePipe } from '@angular/common';
import { Dialog } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { SpectateTrainingPopup } from 'src/app/modales/spectate-training-popup/spectate-training-popup';
import { SessionLeaderboard } from 'src/app/pages/admin-training-session-page/components/session-leaderboard/session-leaderboard';
import { SessionRound } from 'src/app/pages/admin-training-session-page/components/session-round/session-round';
import { AutoScrollDirective } from 'src/app/shared/auto-scroll/auto-scroll.directive';
import { Button } from 'src/app/shared/button/button';
import { CardCollapsible } from 'src/app/shared/card-collapsible/card-collapsible';
import { ClubLeaderboardTable } from 'src/app/shared/club-leaderboard-table/club-leaderboard-table';
import { Icon } from 'src/app/shared/icon/icon';
import { Switch } from 'src/app/shared/switch/switch';
import { loadTrainingRounds } from 'src/app/store/training/training.round.actions';
import {
  leaveTrainingSession,
  loadTrainingClubLeaderboard,
  loadTrainingLeaderboard,
  loadTrainingSessionPublic,
  spectateTrainingSession,
} from 'src/app/store/training/training.session.actions';
import {
  selectCurrentTrainingSessionData,
  selectCurrentTrainingSessionError,
  selectCurrentTrainingSessionIsLoading,
  selectTrainingClubLeaderboard,
  selectTrainingClubLeaderboardError,
  selectTrainingClubLeaderboardIsLoading,
  selectTrainingLeaderboard,
  selectTrainingLeaderboardIsLoading,
  selectTrainingRounds,
  selectTrainingRoundsIsLoading,
} from 'src/app/store/training/training.selectors';
import { isSpectatorSessionCode } from 'src/app/utils/code-format.util';
import { onResyncRequested } from 'src/app/utils/resync-on-reconnect.util';
import { environment } from 'src/environments/environment';

/**
 * Training session followed as a spectator, laid out like the tournament one: the matches of the
 * round in progress on one side, the session leaderboard on the other. Once the session is closed,
 * the club leaderboard as it stood at this session takes the place of the matches. Read only.
 */
@Component({
  selector: 'app-spectator-training-page',
  imports: [
    DatePipe,
    SessionRound,
    SessionLeaderboard,
    ClubLeaderboardTable,
    CardCollapsible,
    Switch,
    AutoScrollDirective,
    Icon,
    Button,
  ],
  templateUrl: './spectator-training-page.html',
  styleUrl: './spectator-training-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpectatorTrainingPage {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(Store);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly dialog = inject(Dialog);

  private readonly sessionCode = this.route.snapshot.paramMap.get('sessionCode');

  private readonly loadedSession = this.store.selectSignal(selectCurrentTrainingSessionData);
  // The store may still hold another session (the player's): only this one is shown.
  public readonly session = computed(() =>
    this.loadedSession()?.code === this.sessionCode ? this.loadedSession() : null,
  );
  private readonly sessionLoading = this.store.selectSignal(selectCurrentTrainingSessionIsLoading);
  public readonly isLoading = computed(() => !this.session() && this.sessionLoading());
  public readonly error = this.store.selectSignal(selectCurrentTrainingSessionError);

  private readonly rounds = this.store.selectSignal(selectTrainingRounds);
  public readonly roundsLoading = this.store.selectSignal(selectTrainingRoundsIsLoading);
  public readonly currentRound = computed(
    () => [...this.rounds()].sort((a, b) => a.roundNumber - b.roundNumber).at(-1) ?? null,
  );
  public readonly leaderboard = this.store.selectSignal(selectTrainingLeaderboard);
  public readonly leaderboardLoading = this.store.selectSignal(selectTrainingLeaderboardIsLoading);
  public readonly clubLeaderboard = this.store.selectSignal(selectTrainingClubLeaderboard);
  public readonly clubLeaderboardLoading = this.store.selectSignal(
    selectTrainingClubLeaderboardIsLoading,
  );
  public readonly clubLeaderboardError = this.store.selectSignal(
    selectTrainingClubLeaderboardError,
  );

  public readonly isSessionClosed = computed(() => this.session()?.status === 'CLOSED');
  public readonly pointsPerGame = computed(() => this.session()?.pointsPerGame ?? 13);

  public readonly autoScrollOn = signal(true);
  public readonly isMobile = signal(false);

  constructor() {
    if (!isSpectatorSessionCode(this.sessionCode)) {
      void this.router.navigate(['/spectateur/training']);
      return;
    }

    this.store.dispatch(spectateTrainingSession({ sessionCode: this.sessionCode! }));
    this.reload();

    // Reconnection or return to the foreground: scores or a round may have been missed.
    onResyncRequested(() => this.reload());

    // Closed while being followed, or already closed: the club leaderboard replaces the matches.
    effect(() => {
      if (this.isSessionClosed()) {
        untracked(() => this.loadClubLeaderboard());
      }
    });

    this.destroyRef.onDestroy(() => this.store.dispatch(leaveTrainingSession()));

    if (typeof window !== 'undefined') {
      const setMode = () => this.isMobile.set(window.innerWidth < environment.limitMobileSizePx);
      setMode();
      window.addEventListener('resize', setMode);
      this.destroyRef.onDestroy(() => window.removeEventListener('resize', setMode));
    }
  }

  /** Wrong code: let the spectator type it again instead of leaving them on a dead end. */
  public retypeCode(): void {
    this.dialog
      .open<{ sessionCode: string }>(SpectateTrainingPopup, {
        panelClass: 'dialog-panel',
        backdropClass: 'dialog-backdrop',
      })
      .closed.subscribe((codes) => {
        if (codes) {
          // Same route with another code: go through the home page so the page is rebuilt.
          void this.router
            .navigateByUrl('/accueil', { skipLocationChange: true })
            .then(() => this.router.navigate(['/spectateur/training', codes.sessionCode]));
        }
      });
  }

  public goHome(): void {
    void this.router.navigate(['/accueil']);
  }

  private reload(): void {
    const sessionCode = this.sessionCode!;
    this.store.dispatch(loadTrainingSessionPublic({ sessionCode }));
    this.store.dispatch(loadTrainingRounds({ sessionCode }));
    this.store.dispatch(loadTrainingLeaderboard({ sessionCode }));
    if (this.isSessionClosed()) {
      this.loadClubLeaderboard();
    }
  }

  private loadClubLeaderboard(): void {
    this.store.dispatch(loadTrainingClubLeaderboard({ sessionCode: this.sessionCode! }));
  }
}
