import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { SpectateTournamentPopupComponent } from 'src/app/modales/spectate-tournament-popup/spectate-tournament-popup';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import { Button } from 'src/app/shared/button/button';
import { Nullable } from 'src/app/models/nullable.model';
import { Leaderboard } from 'src/app/shared/leaderboard/leaderboard';
import { LiveMatchBoard } from 'src/app/shared/live-match-board/live-match-board';
import { PageProgress } from 'src/app/shared/page-progress/page-progress';
import { PageState } from 'src/app/shared/page-state/page-state';
import { SpectatorHeader } from 'src/app/shared/spectator-header/spectator-header';
import { SpectatorBadge } from 'src/app/shared/spectator-header/spectator-header.model';
import { SpectatorWaiting } from 'src/app/shared/spectator-waiting/spectator-waiting';
import { SpectatorWinner } from 'src/app/shared/spectator-winner/spectator-winner';
import { Switch } from 'src/app/shared/switch/switch';
import { setLocalStorageData } from 'src/app/store/app-config/app-config.actions';
import {
  selectSpectatorShowPodium,
  SPECTATOR_PODIUM_STORAGE_KEY,
} from 'src/app/store/app-config/app-config.selectors';
import {
  leaveSpectatorPage,
  loadSpectatorTournament,
  resetSpectator,
} from 'src/app/store/spectator/spectator.actions';
import {
  selectSpectatorCurrentSession,
  selectSpectatorRanking,
  selectSpectatorTournamentData,
  selectSpectatorTournamentError,
  selectSpectatorTournamentIsLoading,
} from 'src/app/store/spectator/spectator.selectors';
import { AutoPager } from 'src/app/utils/auto-pager.util';
import {
  leaderboardItems,
  pageRankLabel,
  toTournamentLeaderboard,
} from 'src/app/utils/leaderboard.util';
import { onResyncRequested } from 'src/app/utils/resync-on-reconnect.util';
import {
  orderForBoard,
  playedMatches,
  spectatorPhase,
  spectatorRoundBadge,
  toTournamentLiveMatches,
} from 'src/app/utils/spectator.util';
import { environment } from 'src/environments/environment';

/** Time a page of matches stays on screen. */
const MATCH_PAGE_MS = 10_000;
/** Time a page of the ranking stays on screen. */
const RANKING_PAGE_MS = 12_000;

/** Tab shown on mobile, where nothing turns on its own: the spectator scrolls. */
export type SpectatorTab = 'ranking' | 'matches';

/**
 * Spectator screen of a tournament, made to be projected: nobody touches it, the lists turn their
 * pages on their own (desktop). Four moments: before the start (how to follow), during a round
 * (matches and ranking side by side), between two rounds (the ranking alone) and at the end.
 */
@Component({
  selector: 'app-spectator-page',
  imports: [
    Leaderboard,
    LiveMatchBoard,
    PageProgress,
    PageState,
    SpectatorHeader,
    SpectatorWaiting,
    SpectatorWinner,
    Switch,
    Button,
  ],
  templateUrl: './spectator-page.html',
  styleUrl: './spectator-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpectatorPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(Store);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly dialog = inject(Dialog);

  private readonly tournamentCode = this.route.snapshot.paramMap.get('tournamentCode');

  // ======= Store =======
  public readonly tournament = this.store.selectSignal(selectSpectatorTournamentData);
  public readonly isLoading = computed(
    () => !this.tournament() && this.store.selectSignal(selectSpectatorTournamentIsLoading)(),
  );
  public readonly error = this.store.selectSignal(selectSpectatorTournamentError);
  public readonly currentSession = this.store.selectSignal(selectSpectatorCurrentSession);
  private readonly ranking = this.store.selectSignal(selectSpectatorRanking);
  /** The podium can be turned off: the ranking is then a plain table, from the first place. */
  public readonly showPodium = this.store.selectSignal(selectSpectatorShowPodium);

  // ======= Phase =======
  public readonly tournamentStatus = computed(() => this.tournament()?.status);
  private readonly playedRoundMatches = computed(() =>
    playedMatches(this.currentSession()?.matches ?? []),
  );
  public readonly phase = computed(() =>
    spectatorPhase({
      started: !!this.tournamentStatus() && this.tournamentStatus() !== TournamentStatus.DRAFT,
      finished:
        this.tournamentStatus() === TournamentStatus.FINISHED ||
        this.tournamentStatus() === TournamentStatus.CANCELLED,
      matchStatuses: this.playedRoundMatches().map((match) => match.status),
    }),
  );
  public readonly roundNumber = computed(() => this.currentSession()?.sessionNumber ?? null);
  public readonly validatedCount = computed(
    () => this.playedRoundMatches().filter((match) => match.status === 'VALIDATED').length,
  );
  public readonly matchCount = computed(() => this.playedRoundMatches().length);

  // ======= Header =======
  public readonly statusBadge = computed<Nullable<SpectatorBadge>>(() => {
    if (!this.tournament()) {
      return null;
    }
    switch (this.phase()) {
      case 'waiting':
        return { label: 'Tournoi non démarré', tone: 'draft' };
      case 'finished':
        return this.tournamentStatus() === TournamentStatus.CANCELLED
          ? { label: 'Tournoi annulé', tone: 'error' }
          : { label: 'Tournoi terminé', tone: 'success' };
      default:
        return { label: `Phase : ${this.tournament()!.phaseName || ''}`, tone: 'ongoing' };
    }
  });
  public readonly roundBadge = computed<Nullable<SpectatorBadge>>(() =>
    spectatorRoundBadge(this.phase(), this.roundNumber(), this.validatedCount(), this.matchCount()),
  );

  // ======= Content =======
  public readonly liveMatches = computed(() =>
    orderForBoard(toTournamentLiveMatches(this.currentSession()?.matches ?? [])),
  );
  public readonly rankingTable = computed(() =>
    toTournamentLeaderboard(
      this.ranking() ?? [],
      this.tournament()?.scoreCalculation ?? 'victory_goal_average',
    ),
  );
  /** What the ranking tables list (rows and section headings): the pagination counts these. */
  private readonly rankingItems = computed(() =>
    leaderboardItems(this.rankingTable().rows, this.showPodium()),
  );
  /** Winner(s): the first rank, shared when tied. */
  public readonly winner = computed(() =>
    this.rankingTable()
      .rows.filter((row) => row.rank === 1)
      .map((row) => row.name)
      .join(' · '),
  );
  public readonly winnerSummary = computed(
    () => this.rankingTable().rows.find((row) => row.rank === 1)?.summary ?? '',
  );
  public readonly teamNames = computed(() => this.tournament()?.teamNames ?? []);
  public readonly spectatorUrl = signal(typeof window === 'undefined' ? '' : window.location.href);

  // ======= Automatic pagination (desktop) =======
  public readonly matchPageSize = signal(6);
  public readonly rankingPageSize = signal(10);
  public readonly matchPager = new AutoPager(
    computed(() => this.liveMatches().length),
    this.matchPageSize,
    MATCH_PAGE_MS,
    this.destroyRef,
  );
  public readonly rankingPager = new AutoPager(
    computed(() => this.rankingItems().length),
    this.rankingPageSize,
    RANKING_PAGE_MS,
    this.destroyRef,
  );
  public readonly matchPageMs = MATCH_PAGE_MS;
  public readonly rankingPageMs = RANKING_PAGE_MS;
  public readonly rankingPageMsProgress = this.rankingPageMs - 500; // let 0.5 secs to max
  /** « Rangs 4 – 15 »: what the page of the ranking shows. */
  public readonly rankingPageLabel = computed(() =>
    pageRankLabel(this.rankingItems(), this.rankingPager.start(), this.rankingPageSize()),
  );

  // ======= Layout =======
  public readonly isMobile = signal(false);
  /** Next to the matches the ranking has one column; alone on screen, two. */
  public readonly rankingColumns = computed<1 | 2>(() => (this.phase() === 'live' ? 1 : 2));
  /** During a round the matches come first, between two rounds the ranking. */
  public readonly mobileTab = linkedSignal<SpectatorTab>(() =>
    this.phase() === 'live' ? 'matches' : 'ranking',
  );

  constructor() {
    effect(() => {
      if (!this.tournamentCode) return;
      if (!this.tournament() && !this.isLoading() && !this.error()) {
        this.store.dispatch(loadSpectatorTournament({ tournamentCode: this.tournamentCode }));
      }
    });

    onResyncRequested(() => {
      if (!this.tournamentCode) return;
      this.store.dispatch(loadSpectatorTournament({ tournamentCode: this.tournamentCode }));
    });

    this.destroyRef.onDestroy(() => {
      this.store.dispatch(resetSpectator());
      this.store.dispatch(leaveSpectatorPage());
    });

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

  public showTab(tab: SpectatorTab): void {
    this.mobileTab.set(tab);
  }

  /** Wrong code: let the spectator type it again instead of leaving them on a dead end. */
  public retypeCodes(): void {
    this.dialog
      .open<{ tournamentCode: string }>(SpectateTournamentPopupComponent, {
        panelClass: 'dialog-panel',
        backdropClass: 'dialog-backdrop',
      })
      .closed.subscribe((codes) => {
        if (codes) {
          // Same route with another code: go through the home page so the page is rebuilt.
          void this.router
            .navigateByUrl('/accueil', { skipLocationChange: true })
            .then(() => this.router.navigate(['/spectateur', codes.tournamentCode]));
        }
      });
  }

  public goHome(): void {
    void this.router.navigate(['/accueil']);
  }
}
