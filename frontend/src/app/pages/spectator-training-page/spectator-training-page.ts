import { DatePipe } from '@angular/common';
import { Dialog } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { SpectateTrainingPopup } from 'src/app/modales/spectate-training-popup/spectate-training-popup';
import { Button } from 'src/app/shared/button/button';
import { Icon } from 'src/app/shared/icon/icon';
import { Leaderboard } from 'src/app/shared/leaderboard/leaderboard';
import { LiveMatchBoard } from 'src/app/shared/live-match-board/live-match-board';
import { PageProgress } from 'src/app/shared/page-progress/page-progress';
import { QrCode } from 'src/app/shared/qr-code/qr-code';
import { Switch } from 'src/app/shared/switch/switch';
import { setLocalStorageData } from 'src/app/store/app-config/app-config.actions';
import {
  selectSpectatorShowPodium,
  SPECTATOR_PODIUM_STORAGE_KEY,
} from 'src/app/store/app-config/app-config.selectors';
import { loadTrainingRounds } from 'src/app/store/training/training.round.actions';
import {
  leaveTrainingSession,
  loadTrainingClubLeaderboard,
  refreshTrainingClubLeaderboard,
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
} from 'src/app/store/training/training.selectors';
import { AutoPager } from 'src/app/utils/auto-pager.util';
import { isSpectatorSessionCode } from 'src/app/utils/code-format.util';
import {
  leaderboardItems,
  toClubLeaderboard,
  toSessionLeaderboard,
} from 'src/app/utils/leaderboard.util';
import { onResyncRequested } from 'src/app/utils/resync-on-reconnect.util';
import {
  orderForBoard,
  playedMatches,
  spectatorPhase,
  toTrainingLiveMatches,
} from 'src/app/utils/spectator.util';
import { environment } from 'src/environments/environment';

/** Time a page of matches stays on screen. */
const MATCH_PAGE_MS = 10_000;
/** Time a page of a leaderboard stays on screen. */
const RANKING_PAGE_MS = 12_000;

/** Tab shown on mobile, where nothing turns on its own: the spectator scrolls. */
export type SpectatorTrainingTab = 'ranking' | 'matches' | 'club';

/**
 * Training session followed as a spectator, laid out like the tournament one and made to be
 * projected: the lists turn their pages on their own (desktop). Before the first round, who is
 * there; during a round, matches and session leaderboard side by side; between two rounds, the
 * leaderboard alone; once closed, the session leaderboard and the club one. Read only.
 */
@Component({
  selector: 'app-spectator-training-page',
  imports: [DatePipe, Leaderboard, LiveMatchBoard, PageProgress, QrCode, Switch, Icon, Button],
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

  readonly sessionCode = this.route.snapshot.paramMap.get('sessionCode');

  // ======= Store =======
  private readonly loadedSession = this.store.selectSignal(selectCurrentTrainingSessionData);
  // The store may still hold another session (the player's): only this one is shown.
  public readonly session = computed(() =>
    this.loadedSession()?.code === this.sessionCode ? this.loadedSession() : null,
  );
  private readonly sessionLoading = this.store.selectSignal(selectCurrentTrainingSessionIsLoading);
  public readonly isLoading = computed(() => !this.session() && this.sessionLoading());
  public readonly error = this.store.selectSignal(selectCurrentTrainingSessionError);

  private readonly rounds = this.store.selectSignal(selectTrainingRounds);
  public readonly currentRound = computed(
    () => [...this.rounds()].sort((a, b) => a.roundNumber - b.roundNumber).at(-1) ?? null,
  );
  private readonly leaderboard = this.store.selectSignal(selectTrainingLeaderboard);
  public readonly leaderboardLoading = this.store.selectSignal(selectTrainingLeaderboardIsLoading);
  private readonly clubLeaderboard = this.store.selectSignal(selectTrainingClubLeaderboard);
  public readonly clubLeaderboardLoading = this.store.selectSignal(
    selectTrainingClubLeaderboardIsLoading,
  );
  public readonly clubLeaderboardError = this.store.selectSignal(
    selectTrainingClubLeaderboardError,
  );

  // ======= Phase =======
  public readonly isSessionClosed = computed(() => this.session()?.status === 'CLOSED');
  private readonly playedRoundMatches = computed(() =>
    playedMatches(this.currentRound()?.matches ?? []),
  );
  public readonly phase = computed(() =>
    spectatorPhase({
      started: !!this.currentRound(),
      finished: this.isSessionClosed(),
      matchStatuses: this.playedRoundMatches().map((match) => match.status),
    }),
  );
  public readonly roundNumber = computed(() => this.currentRound()?.roundNumber ?? null);
  public readonly roundCount = computed(() => this.rounds().length);
  public readonly validatedCount = computed(
    () => this.playedRoundMatches().filter((match) => match.status === 'VALIDATED').length,
  );
  public readonly matchCount = computed(() => this.playedRoundMatches().length);

  // ======= Content =======
  public readonly liveMatches = computed(() =>
    orderForBoard(toTrainingLiveMatches(this.currentRound()?.matches ?? [])),
  );
  public readonly leaderboardTable = computed(() => toSessionLeaderboard(this.leaderboard()));
  public readonly clubLeaderboardTable = computed(() => toClubLeaderboard(this.clubLeaderboard()));
  /** The podium can be turned off: the leaderboard is then a plain table, from the first place. */
  public readonly showPodium = this.store.selectSignal(selectSpectatorShowPodium);
  /** What the session tables list: the pagination counts these. */
  private readonly sessionItems = computed(() =>
    leaderboardItems(this.leaderboardTable().rows, this.showPodium()),
  );
  /** Best player(s) of the session: the first rank, shared when tied. */
  public readonly winner = computed(() =>
    this.leaderboardTable()
      .rows.filter((row) => row.rank === 1)
      .map((row) => row.name)
      .join(' · '),
  );
  public readonly winnerSummary = computed(
    () => this.leaderboardTable().rows.find((row) => row.rank === 1)?.summary ?? '',
  );
  public readonly presentNames = computed(() =>
    (this.session()?.participants ?? [])
      .filter((participant) => participant.status === 'PRESENT')
      .map((participant) => participant.name)
      .sort((a, b) => a.localeCompare(b, 'fr', { numeric: true, sensitivity: 'base' })),
  );
  public readonly spectatorUrl = signal(typeof window === 'undefined' ? '' : window.location.href);

  // ======= Automatic pagination (desktop) =======
  public readonly matchPageSize = signal(6);
  public readonly rankingPageSize = signal(10);
  public readonly clubPageSize = signal(10);
  public readonly matchPager = new AutoPager(
    computed(() => this.liveMatches().length),
    this.matchPageSize,
    MATCH_PAGE_MS,
    this.destroyRef,
  );
  public readonly rankingPager = new AutoPager(
    computed(() => this.sessionItems().length),
    this.rankingPageSize,
    RANKING_PAGE_MS,
    this.destroyRef,
  );
  public readonly clubPager = new AutoPager(
    computed(() => this.clubLeaderboardTable().rows.length),
    this.clubPageSize,
    RANKING_PAGE_MS,
    this.destroyRef,
  );
  public readonly matchPageMs = MATCH_PAGE_MS;
  public readonly rankingPageMs = RANKING_PAGE_MS;

  // ======= Layout =======
  public readonly isMobile = signal(false);
  /** Side by side with the matches or the club leaderboard, one column; alone on screen, two. */
  public readonly rankingColumns = computed<1 | 2>(() => (this.phase() === 'break' ? 2 : 1));
  /** During a round the matches come first, otherwise the session leaderboard. */
  public readonly mobileTab = linkedSignal<SpectatorTrainingTab>(() =>
    this.phase() === 'live' ? 'matches' : 'ranking',
  );

  constructor() {
    if (!isSpectatorSessionCode(this.sessionCode)) {
      void this.router.navigate(['/spectateur/training']);
      return;
    }

    this.store.dispatch(spectateTrainingSession({ sessionCode: this.sessionCode! }));
    this.reload();

    // Reconnection or return to the foreground: scores or a round may have been missed.
    onResyncRequested(() => this.reload());

    // Closed while being followed, or already closed: the club leaderboard joins the screen.
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

  public togglePodium(show: boolean): void {
    this.store.dispatch(setLocalStorageData({ key: SPECTATOR_PODIUM_STORAGE_KEY, value: show }));
  }

  public showTab(tab: SpectatorTrainingTab): void {
    this.mobileTab.set(tab);
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
    // Refreshed in place: loading it again blanked the table on every return to the foreground.
    if (this.isSessionClosed()) {
      this.store.dispatch(refreshTrainingClubLeaderboard({ sessionCode }));
    }
  }

  private loadClubLeaderboard(): void {
    this.store.dispatch(loadTrainingClubLeaderboard({ sessionCode: this.sessionCode! }));
  }
}
