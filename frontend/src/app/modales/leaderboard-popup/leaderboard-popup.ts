import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Nullable } from 'src/app/models/nullable.model';
import { ScoreCalculation } from 'src/app/models/tournament-configuration-detail.model';
import { Icon } from 'src/app/shared/icon/icon';
import { Leaderboard } from 'src/app/shared/leaderboard/leaderboard';
import { SwipeToDismissDirective } from 'src/app/shared/swipe-to-dismiss/swipe-to-dismiss.directive';
import {
  selectRanking,
  selectRankingError,
  selectRankingIsLoading,
} from 'src/app/store/ranking/ranking.selectors';
import {
  selectTrainingClubLeaderboard,
  selectTrainingClubLeaderboardError,
  selectTrainingClubLeaderboardIsLoading,
  selectTrainingLeaderboard,
  selectTrainingLeaderboardError,
  selectTrainingLeaderboardIsLoading,
} from 'src/app/store/training/training.selectors';
import {
  toClubLeaderboard,
  toSessionLeaderboard,
  toTournamentLeaderboard,
} from 'src/app/utils/leaderboard.util';
import { LEADERBOARD_MOBILE_QUERY } from 'src/app/utils/leaderboard-dialog.util';
import { matchesMedia } from 'src/app/shared/swipe-to-dismiss/swipe-to-dismiss.directive';

/** Which leaderboard the popup shows. */
export type LeaderboardPopupScope = 'tournament' | 'session' | 'club';

export interface LeaderboardPopupData {
  scope: LeaderboardPopupScope;
  /** Line of whoever reads it (team, participant or club member); null: none. */
  highlightedId: Nullable<string>;
  /** Tournament only: its name, in the title, and how its ranking is computed. */
  tournamentName?: string;
  scoreCalculation?: ScoreCalculation;
}

interface LeaderboardPopupPresentation {
  icon: string;
  title: string;
  highlight: string;
  subtitle: Nullable<string>;
  emptyLabel: string;
}

/**
 * Leaderboard of a tournament, a training session or a club, opened from a player or admin page.
 * The page loads the leaderboard before opening it; the popup reads it from the store, so it
 * follows the live updates.
 */
@Component({
  selector: 'app-leaderboard-popup',
  imports: [Leaderboard, Icon, SwipeToDismissDirective],
  templateUrl: './leaderboard-popup.html',
  styleUrl: './leaderboard-popup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaderboardPopup {
  private readonly store = inject(Store);
  /** Opened as a bottom sheet (see leaderboardDialogPlacement): it can then be swiped down. */
  public readonly isSheet = matchesMedia(LEADERBOARD_MOBILE_QUERY);
  private readonly dialogRef = inject(DialogRef);
  private readonly data = inject<LeaderboardPopupData>(DIALOG_DATA);

  readonly highlightedId = this.data.highlightedId;
  /** A tournament ranking has more columns (wins, points, goal average): the popup is wider. */
  readonly isTournament = this.data.scope === 'tournament';
  readonly presentation = presentationOf(this.data);

  private readonly tournamentEntries = this.store.selectSignal(selectRanking);
  private readonly tournamentLoading = this.store.selectSignal(selectRankingIsLoading);
  private readonly tournamentError = this.store.selectSignal(selectRankingError);
  private readonly sessionEntries = this.store.selectSignal(selectTrainingLeaderboard);
  private readonly clubEntries = this.store.selectSignal(selectTrainingClubLeaderboard);
  private readonly sessionLoading = this.store.selectSignal(selectTrainingLeaderboardIsLoading);
  private readonly clubLoading = this.store.selectSignal(selectTrainingClubLeaderboardIsLoading);
  private readonly sessionError = this.store.selectSignal(selectTrainingLeaderboardError);
  private readonly clubError = this.store.selectSignal(selectTrainingClubLeaderboardError);

  readonly table = computed(() => {
    switch (this.data.scope) {
      case 'tournament':
        return toTournamentLeaderboard(
          this.tournamentEntries() ?? [],
          this.data.scoreCalculation ?? 'victory_goal_average',
        );
      case 'club':
        return toClubLeaderboard(this.clubEntries());
      default:
        return toSessionLeaderboard(this.sessionEntries());
    }
  });
  readonly isLoading = computed(() => {
    switch (this.data.scope) {
      case 'tournament':
        return !this.tournamentEntries() && this.tournamentLoading();
      case 'club':
        return this.clubLoading();
      default:
        return this.sessionLoading();
    }
  });
  readonly error = computed(() => {
    switch (this.data.scope) {
      case 'tournament':
        return this.tournamentError();
      case 'club':
        return this.clubError();
      default:
        return this.sessionError();
    }
  });

  onClose(): void {
    this.dialogRef.close();
  }
}

function presentationOf(data: LeaderboardPopupData): LeaderboardPopupPresentation {
  switch (data.scope) {
    case 'tournament':
      return {
        icon: 'leaderboard',
        title: 'Classement :',
        highlight: data.tournamentName ?? 'tournoi',
        subtitle: null,
        emptyLabel: 'Aucun round démarré.',
      };
    case 'club':
      return {
        icon: 'military_tech',
        title: 'Classement du',
        highlight: 'club',
        subtitle:
          'Cumul de toutes les séances du club : victoires et points additionnés, invités non comptés.',
        emptyLabel:
          "Aucun membre du club n'a encore de match validé (les invités ne sont pas comptés).",
      };
    default:
      return {
        icon: 'leaderboard',
        title: 'Classement de la',
        highlight: 'séance',
        subtitle:
          "Classement individuel : chaque joueur d'une équipe gagnante marque la totalité des points.",
        emptyLabel: "Aucun match validé pour l'instant.",
      };
  }
}
