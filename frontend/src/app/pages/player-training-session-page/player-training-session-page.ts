import { selectTrainingParticipantAwaitingResync } from 'src/app/store/training/training.selectors';
import { isSessionCode } from 'src/app/utils/code-format.util';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  LOCALE_ID,
  OnDestroy,
  OnInit,
  signal,
  DestroyRef,
} from '@angular/core';
import { formatDate } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import {
  PlayerByeCopy,
  PlayerStatTile,
  PlayerValidationCopy,
} from 'src/app/models/player-match-view.model';
import { AnimateOnChangeDirective } from 'src/app/shared/animate-on-change/animate-on-change.directive';
import { BackLink } from 'src/app/shared/back-link/back-link';
import { Icon } from 'src/app/shared/icon/icon';
import { PlayerMatchCard } from 'src/app/shared/player-match-card/player-match-card';
import { PlayerMatchHistory } from 'src/app/shared/player-match-history/player-match-history';
import { JoinTrainingPopup } from 'src/app/modales/join-training-popup/join-training-popup';
import { Nullable } from 'src/app/models/nullable.model';
import { PageState } from 'src/app/shared/page-state/page-state';
import { PlayerFinalRank } from 'src/app/shared/player-final-rank/player-final-rank';
import { PlayerHeader } from 'src/app/shared/player-header/player-header';
import {
  PlayerHeaderInfo,
  PlayerHeaderStatus,
} from 'src/app/shared/player-header/player-header.model';
import { PlayerTeammates } from 'src/app/shared/player-teammates/player-teammates';
import { onResyncRequested } from 'src/app/utils/resync-on-reconnect.util';
import {
  loadTrainingParticipantCurrentMatch,
  loadTrainingParticipantHistory,
} from 'src/app/store/training/training.actions';
import {
  startTrainingMatch,
  updateTrainingScore,
  validateTrainingMatch,
} from 'src/app/store/training/training.match.actions';
import {
  leaveTrainingSession,
  loadTrainingClubLeaderboard,
  loadTrainingLeaderboard,
  loadTrainingSessionPublic,
} from 'src/app/store/training/training.session.actions';
import { Dialog } from '@angular/cdk/dialog';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Overlay } from '@angular/cdk/overlay';
import {
  LeaderboardPopup,
  LeaderboardPopupData,
  LeaderboardPopupScope,
} from 'src/app/modales/leaderboard-popup/leaderboard-popup';
import {
  LEADERBOARD_MOBILE_QUERY,
  leaderboardDialogPlacement,
} from 'src/app/utils/leaderboard-dialog.util';
import {
  selectCurrentTrainingAdminInformations,
  selectCurrentTrainingSessionData,
  selectStartTrainingMatchError,
  selectStartTrainingMatchLoading,
  selectTrainingClubLeaderboard,
  selectTrainingLeaderboard,
  selectTrainingParticipantCurrentMatch,
  selectTrainingParticipantCurrentMatchError,
  selectTrainingParticipantCurrentMatchIsLoading,
  selectTrainingParticipantHistory,
  selectUpdateTrainingScoreError,
  selectValidateTrainingMatchError,
  selectValidateTrainingMatchLoading,
} from 'src/app/store/training/training.selectors';
import { toClubLeaderboard, toSessionLeaderboard } from 'src/app/utils/leaderboard.util';
import { Button } from 'src/app/shared/button/button';
import { historyToResults, myTeam, toPlayerMatchView } from './player-training-session-page.utils';

@Component({
  selector: 'app-player-training-session-page',
  imports: [
    BackLink,
    Button,
    Icon,
    AnimateOnChangeDirective,
    PlayerMatchCard,
    PlayerMatchHistory,
    PageState,
    PlayerFinalRank,
    PlayerHeader,
    PlayerTeammates,
  ],
  templateUrl: './player-training-session-page.html',
  styleUrl: './player-training-session-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerTrainingSessionPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly dialog = inject(Dialog);
  private readonly overlay = inject(Overlay);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly locale = inject(LOCALE_ID);

  public readonly sessionCode = signal<string | null>(null);
  public readonly participantCode = signal<string | null>(null);
  // Training whose admin page sent the player here, if any.
  private readonly adminTrainingCode = signal<string | null>(null);

  // Plain non-reactive field: a guard held by a signal would re-run the effect.
  private loadedFor: string | null = null;

  // Selects
  private readonly currentMatchState = this.store.selectSignal(
    selectTrainingParticipantCurrentMatch,
  );
  public readonly session = this.store.selectSignal(selectCurrentTrainingSessionData);
  private readonly leaderboard = this.store.selectSignal(selectTrainingLeaderboard);
  private readonly leaderboardTable = computed(() => toSessionLeaderboard(this.leaderboard()));
  private readonly clubLeaderboard = this.store.selectSignal(selectTrainingClubLeaderboard);
  private readonly clubLeaderboardTable = computed(() => toClubLeaderboard(this.clubLeaderboard()));
  private readonly history = this.store.selectSignal(selectTrainingParticipantHistory);
  public readonly isLoading = this.store.selectSignal(
    selectTrainingParticipantCurrentMatchIsLoading,
  );
  public readonly error = this.store.selectSignal(selectTrainingParticipantCurrentMatchError);
  public readonly startLoading = this.store.selectSignal(selectStartTrainingMatchLoading);
  public readonly startError = this.store.selectSignal(selectStartTrainingMatchError);
  public readonly scoreError = this.store.selectSignal(selectUpdateTrainingScoreError);
  public readonly validateLoading = this.store.selectSignal(selectValidateTrainingMatchLoading);
  public readonly validateError = this.store.selectSignal(selectValidateTrainingMatchError);

  private readonly adminInformations = this.store.selectSignal(
    selectCurrentTrainingAdminInformations,
  );

  /** The admin who plays: the link alone is not enough, it must match their saved access. */
  public readonly canBackToAdmin = computed(() => {
    const trainingCode = this.adminTrainingCode();
    return !!trainingCode && this.adminInformations()?.code === trainingCode;
  });

  // Player identity and state
  public readonly me = computed(() => this.currentMatchState()?.participant ?? null);
  public readonly roundNumber = computed(() => this.currentMatchState()?.roundNumber ?? null);
  public readonly isSittingOut = computed(() => this.currentMatchState()?.sitOut ?? false);
  public readonly awaitingResync = this.store.selectSignal(selectTrainingParticipantAwaitingResync);
  private readonly match = computed(() => this.currentMatchState()?.match ?? null);
  public readonly isSessionClosed = computed(() => this.session()?.status === 'CLOSED');
  public readonly pointsPerGame = computed(() => this.session()?.pointsPerGame ?? 13);

  public readonly matchView = computed(() => {
    const match = this.match();
    const me = this.me();
    return match && me ? toPlayerMatchView(match, me.id, this.roundNumber()) : null;
  });

  /**
   * The player has been marked as gone by the admin. Their code still works (so they land here),
   * but they are out of the rotation until the admin brings them back - the page says so instead of
   * leaving them on a stale "at rest" message.
   */
  public readonly hasLeft = computed(() => {
    const me = this.me();
    const participants = this.session()?.participants ?? [];
    return !!me && participants.find((participant) => participant.id === me.id)?.status === 'LEFT';
  });

  /**
   * What the match card actually shows. It falls back to its empty state - the projected message -
   * when the player has left, and when the session is closed with nothing left to validate (a match
   * still in progress or already validated). An ENDED match stays visible so its score can still be
   * confirmed after closing.
   */
  public readonly cardMatch = computed(() => {
    if (this.hasLeft()) {
      return null;
    }
    if (this.isSessionClosed() && !this.canStillValidate()) {
      return null;
    }
    return this.matchView();
  });

  /** The other players of my team this round: the partner changes at every generation. */
  public readonly partners = computed(() => {
    const me = this.me();
    if (!me) {
      return [];
    }
    const team = myTeam(this.match(), me.id);
    return (team?.members ?? []).filter((member) => member.id !== me.id);
  });

  public readonly results = computed(() => {
    const me = this.me();
    return me ? historyToResults(this.history(), me.id) : [];
  });

  /** Rank in the session, ties shared (two first ex aequo are both first). */
  private readonly myRanking = computed(() => {
    const me = this.me();
    if (!me) {
      return null;
    }
    const entry = this.leaderboard().find((candidate) => candidate.participantId === me.id);
    const row = this.leaderboardTable().rows.find((candidate) => candidate.id === me.id);
    return entry && row ? { ...entry, rank: row.rank } : null;
  });

  /** Rank in the club: only a roster member has one, a guest is not counted. */
  private readonly myClubRankLabel = computed(() => {
    const memberId = this.me()?.memberId;
    const rows = this.clubLeaderboardTable().rows;
    const row = memberId ? rows.find((candidate) => candidate.id === memberId) : undefined;
    return row ? `${row.rank}/${rows.length}` : '—';
  });

  /**
   * Those the player can compare themselves to: the ones present, plus those who left after
   * playing. The leaderboard alone is not enough, it ignores present players who have not played a
   * match yet.
   */
  private readonly rankedCount = computed(() => {
    const everyone = new Set(
      (this.session()?.participants ?? [])
        .filter((participant) => participant.status === 'PRESENT')
        .map((participant) => participant.id),
    );
    for (const entry of this.leaderboard()) {
      everyone.add(entry.participantId);
    }
    return everyone.size;
  });

  /** The title announces what the card really shows. */
  public readonly matchTitle = computed(() => {
    if (this.hasLeft()) {
      return null;
    }
    if (this.isSittingOut()) {
      return 'Au repos ce round';
    }
    if (this.isSessionClosed()) {
      return this.cardMatch() ? 'Dernier match' : null;
    }
    return this.matchView()?.status === 'PENDING' ? 'Prochain match' : 'Match en cours';
  });

  public readonly statTiles = computed<PlayerStatTile[]>(() => {
    const ranking = this.myRanking();
    const total = this.rankedCount();

    return [
      { key: 'wins', label: 'Victoires', value: ranking ? String(ranking.wins) : '—' },
      { key: 'points', label: 'Points', value: ranking ? String(ranking.points) : '—' },
      {
        key: 'session-rank',
        label: 'Séance',
        value: ranking ? `${ranking.rank}/${total}` : '—',
        clickable: true,
      },
      { key: 'club-rank', label: 'Club', value: this.myClubRankLabel(), clickable: true },
    ];
  });

  /**
   * Closed session: the server now refuses to start a match or to record a score, but still accepts
   * the validation of a score already entered. The banner says so to the player, whose match stays
   * on screen.
   */
  public readonly canStillValidate = computed(
    () => this.isSessionClosed() && this.match()?.status === 'ENDED',
  );

  public readonly finalRankLabel = computed(() => {
    const ranking = this.myRanking();
    return ranking ? `${ranking.rank}/${this.rankedCount()}` : null;
  });

  // ======= Header =======
  public readonly headerInfos = computed<PlayerHeaderInfo[]>(() => {
    const session = this.session();
    return [
      ...(session
        ? [
            {
              label: null,
              value: formatDate(session.date, 'EEEE d MMMM', this.locale),
              icon: 'event',
            },
          ]
        : []),
      { label: 'Mon code', value: this.participantCode() ?? '—', isCode: true },
    ];
  });
  public readonly headerStatus = computed<Nullable<PlayerHeaderStatus>>(() => {
    if (this.isSessionClosed()) {
      return { label: 'Séance terminée', tone: 'pending', icon: 'lock' };
    }
    const round = this.roundNumber();
    return round
      ? { label: `Round ${round}`, tone: 'ongoing', icon: 'sports_score' }
      : { label: 'En attente du premier round', tone: 'pending', icon: 'hourglass_empty' };
  });

  public readonly byeCopy: PlayerByeCopy = {
    title: 'Au repos',
    message: 'Vous ne jouez pas ce round. Le prochain vous remettra en jeu.',
  };

  public readonly validationCopy: PlayerValidationCopy = {
    hint: "Pour valider le score, demandez son code à l'un de vos adversaires.",
    placeholder: 'Code d’un joueur adverse',
  };

  constructor() {
    effect(() => {
      const sessionCode = this.sessionCode();
      const participantCode = this.participantCode();

      if (!sessionCode || !participantCode) {
        return;
      }

      const key = `${sessionCode}:${participantCode}`;
      if (this.loadedFor === key) {
        return;
      }

      this.loadedFor = key;
      this.reload(sessionCode, participantCode);
    });

    // Reconnection or return to the foreground: a round or some scores may have been missed.
    onResyncRequested(() => {
      const sessionCode = this.sessionCode();
      const participantCode = this.participantCode();
      if (sessionCode && participantCode) {
        this.reload(sessionCode, participantCode);
      }
    });
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const sessionCode = params.get('sessionCode');
      const participantCode = params.get('participantCode');

      // Numeric codes (6-digit session, or 4 for the older ones; 4-digit participant): without
      // them, the page has nothing to show.
      if (!isSessionCode(sessionCode) || participantCode?.length !== 4) {
        this.router.navigate(['/player/training']);
        return;
      }

      this.sessionCode.set(sessionCode);
      this.participantCode.set(participantCode);
    });

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.adminTrainingCode.set(params.get('adminTraining'));
    });
  }

  ngOnDestroy(): void {
    this.store.dispatch(leaveTrainingSession());
  }

  // ========= Navigation =========

  public backToAdmin(): void {
    this.router.navigate([
      `/admin/training/${this.adminTrainingCode()}/session/${this.sessionCode()}`,
    ]);
  }

  /** Wrong link: let the player type their codes again instead of leaving them on a dead end. */
  public retypeCodes(): void {
    this.dialog
      .open<{ sessionCode: string; participantCode: string }>(JoinTrainingPopup, {
        panelClass: 'dialog-panel',
        backdropClass: 'dialog-backdrop',
      })
      .closed.subscribe((codes) => {
        if (codes) {
          // Same route with other params: go through the home page so the page is rebuilt.
          void this.router
            .navigateByUrl('/accueil', { skipLocationChange: true })
            .then(() =>
              this.router.navigate(['/player/training', codes.sessionCode, codes.participantCode]),
            );
        }
      });
  }

  public goHome(): void {
    void this.router.navigate(['/accueil']);
  }

  // ========= Actions =========

  public startMatch(): void {
    const sessionCode = this.sessionCode();
    const participantCode = this.participantCode();
    const matchId = this.match()?.id;
    if (!sessionCode || !participantCode || !matchId) {
      return;
    }
    this.store.dispatch(startTrainingMatch({ sessionCode, matchId, participantCode }));
  }

  public updateScore(scores: { myScore: number; opponentScore: number }): void {
    const sessionCode = this.sessionCode();
    const participantCode = this.participantCode();
    const view = this.matchView();
    if (!sessionCode || !participantCode || !view) {
      return;
    }

    this.store.dispatch(
      updateTrainingScore({
        sessionCode,
        matchId: view.id,
        participantCode,
        scoreA: view.iAmTeamA ? scores.myScore : scores.opponentScore,
        scoreB: view.iAmTeamA ? scores.opponentScore : scores.myScore,
      }),
    );
  }

  public validateMatch(opponentParticipantCode: string): void {
    const sessionCode = this.sessionCode();
    const participantCode = this.participantCode();
    const matchId = this.match()?.id;
    if (!sessionCode || !participantCode || !matchId) {
      return;
    }
    this.store.dispatch(
      validateTrainingMatch({ sessionCode, matchId, participantCode, opponentParticipantCode }),
    );
  }

  /** The « Séance » and « Club » tiles open their leaderboard. */
  public onTileClicked(tile: PlayerStatTile): void {
    if (tile.key === 'session-rank') {
      this.openSessionLeaderboard();
    } else if (tile.key === 'club-rank') {
      this.openClubLeaderboard();
    }
  }

  public openSessionLeaderboard(): void {
    this.openLeaderboard('session', this.me()?.id ?? null);
  }

  /** Loaded on opening, then kept up to date by the server at the end of each round. */
  public openClubLeaderboard(): void {
    const sessionCode = this.sessionCode();
    if (!sessionCode) {
      return;
    }
    this.store.dispatch(loadTrainingClubLeaderboard({ sessionCode }));
    this.openLeaderboard('club', this.me()?.memberId ?? null);
  }

  private openLeaderboard(scope: LeaderboardPopupScope, highlightedId: string | null): void {
    this.dialog.open<void, LeaderboardPopupData>(LeaderboardPopup, {
      data: { scope, highlightedId },
      ...leaderboardDialogPlacement(
        this.overlay,
        this.breakpointObserver.isMatched(LEADERBOARD_MOBILE_QUERY),
        'dialog-panel',
      ),
    });
  }

  private reload(sessionCode: string, participantCode: string): void {
    this.store.dispatch(loadTrainingParticipantCurrentMatch({ sessionCode, participantCode }));
    this.store.dispatch(loadTrainingParticipantHistory({ sessionCode, participantCode }));
    this.store.dispatch(loadTrainingSessionPublic({ sessionCode }));
    this.store.dispatch(loadTrainingLeaderboard({ sessionCode }));
    // For the « Club » tile: the server then sends it again at the end of each round.
    this.store.dispatch(loadTrainingClubLeaderboard({ sessionCode }));
  }
}
