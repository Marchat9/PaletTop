import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnDestroy,
  OnInit,
  signal,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import {
  PlayerByeCopy,
  PlayerStatTile,
  PlayerValidationCopy,
} from 'src/app/models/player-match-view.model';
import { AnimateOnChangeDirective } from 'src/app/shared/animate-on-change/animate-on-change.directive';
import { Icon } from 'src/app/shared/icon/icon';
import { PlayerMatchCard } from 'src/app/shared/player-match-card/player-match-card';
import { PlayerMatchHistory } from 'src/app/shared/player-match-history/player-match-history';
import { PlayerStatsTiles } from 'src/app/shared/player-stats-tiles/player-stats-tiles';
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
  loadTrainingLeaderboard,
  loadTrainingSessionPublic,
} from 'src/app/store/training/training.session.actions';
import {
  selectCurrentTrainingSessionData,
  selectStartTrainingMatchError,
  selectStartTrainingMatchLoading,
  selectTrainingLeaderboard,
  selectTrainingParticipantCurrentMatch,
  selectTrainingParticipantCurrentMatchError,
  selectTrainingParticipantCurrentMatchIsLoading,
  selectTrainingParticipantHistory,
  selectUpdateTrainingScoreError,
  selectValidateTrainingMatchError,
  selectValidateTrainingMatchLoading,
} from 'src/app/store/training/training.selectors';
import { PlayerSessionHeader } from './components/player-session-header/player-session-header';
import { PlayerSessionLeaderboard } from './components/player-session-leaderboard/player-session-leaderboard';
import { PlayerSessionPartners } from './components/player-session-partners/player-session-partners';
import { historyToResults, myTeam, toPlayerMatchView } from './player-training-session-page.utils';

@Component({
  selector: 'app-player-training-session-page',
  imports: [
    Icon,
    AnimateOnChangeDirective,
    PlayerMatchCard,
    PlayerMatchHistory,
    PlayerStatsTiles,
    PlayerSessionHeader,
    PlayerSessionLeaderboard,
    PlayerSessionPartners,
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

  public readonly sessionCode = signal<string | null>(null);
  public readonly participantCode = signal<string | null>(null);

  // Plain non-reactive field: a guard held by a signal would re-run the effect.
  private loadedFor: string | null = null;

  // Selects
  private readonly currentMatchState = this.store.selectSignal(
    selectTrainingParticipantCurrentMatch,
  );
  public readonly session = this.store.selectSignal(selectCurrentTrainingSessionData);
  public readonly leaderboard = this.store.selectSignal(selectTrainingLeaderboard);
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

  // Player identity and state
  public readonly me = computed(() => this.currentMatchState()?.participant ?? null);
  public readonly roundNumber = computed(() => this.currentMatchState()?.roundNumber ?? null);
  public readonly isSittingOut = computed(() => this.currentMatchState()?.sitOut ?? false);
  private readonly match = computed(() => this.currentMatchState()?.match ?? null);
  public readonly isSessionClosed = computed(() => this.session()?.status === 'CLOSED');
  public readonly pointsPerGame = computed(() => this.session()?.pointsPerGame ?? 13);

  public readonly matchView = computed(() => {
    const match = this.match();
    const me = this.me();
    return match && me ? toPlayerMatchView(match, me.id, this.roundNumber()) : null;
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

  private readonly myRanking = computed(() => {
    const me = this.me();
    if (!me) {
      return null;
    }
    const index = this.leaderboard().findIndex((entry) => entry.participantId === me.id);
    return index < 0 ? null : { rank: index + 1, ...this.leaderboard()[index] };
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
    if (this.isSittingOut()) {
      return 'Au repos ce round';
    }
    if (this.isSessionClosed()) {
      return this.matchView() ? 'Dernier match' : null;
    }
    return 'Match en cours';
  });

  public readonly statTiles = computed<PlayerStatTile[]>(() => {
    const ranking = this.myRanking();
    const total = this.rankedCount();

    return [
      { key: 'wins', label: 'Victoires', value: ranking ? String(ranking.wins) : '—' },
      { key: 'points', label: 'Points', value: ranking ? String(ranking.points) : '—' },
      {
        key: 'rank',
        label: 'Classement',
        value: ranking ? `${ranking.rank}/${total}` : '—',
      },
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

      // Four-digit codes: without them, the page has nothing to show.
      if (sessionCode?.length !== 4 || participantCode?.length !== 4) {
        this.router.navigate(['/player/training']);
        return;
      }

      this.sessionCode.set(sessionCode);
      this.participantCode.set(participantCode);
    });
  }

  ngOnDestroy(): void {
    this.store.dispatch(leaveTrainingSession());
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

  private reload(sessionCode: string, participantCode: string): void {
    this.store.dispatch(loadTrainingParticipantCurrentMatch({ sessionCode, participantCode }));
    this.store.dispatch(loadTrainingParticipantHistory({ sessionCode, participantCode }));
    this.store.dispatch(loadTrainingSessionPublic({ sessionCode }));
    this.store.dispatch(loadTrainingLeaderboard({ sessionCode }));
  }
}
