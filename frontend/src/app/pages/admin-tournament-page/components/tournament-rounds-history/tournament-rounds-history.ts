import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { MatchesSessionDto, SessionStatus } from 'src/app/models/matches-session.model';
import { Nullable } from 'src/app/models/nullable.model';
import { ScoreUpdate } from 'src/app/models/score-update.model';
import { CompetitionMode } from 'src/app/models/tournament-configuration-detail.model';
import { CardCollapsible } from 'src/app/shared/card-collapsible/card-collapsible';
import { Icon } from 'src/app/shared/icon/icon';
import { InputText } from 'src/app/shared/input-text/input-text';
import { AdminMatchRow } from '../admin-match-row/admin-match-row';
import { buildRoundHistoryViews, RoundHistoryView } from './rounds-history.utils';

interface RoundHistoryItem extends RoundHistoryView {
  expanded: boolean;
}

/**
 * Closed rounds of the tournament, to review the matches round by round and correct the scores of
 * the drawn ones (qualifying, up-down draws, championship).
 */
@Component({
  selector: 'app-tournament-rounds-history',
  imports: [AdminMatchRow, CardCollapsible, Icon, InputText],
  templateUrl: './tournament-rounds-history.html',
  styleUrl: './tournament-rounds-history.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TournamentRoundsHistory {
  // ======= Input / Output =======
  public readonly sessions = input<Nullable<MatchesSessionDto[]>>(null);
  public readonly pointsPerGame = input<number>(13);
  public readonly competitionMode = input<CompetitionMode>('standard');
  /** False once corrections are no longer allowed (cancelled tournament). */
  public readonly canEdit = input<boolean>(true);
  public readonly scoreUpdateLoading = input<boolean>(false);

  public readonly scoreUpdate = output<ScoreUpdate>();
  // ==============================

  public readonly search = signal('');
  public readonly editingMatchId = signal<Nullable<string>>(null);
  private readonly expandedRoundIds = signal<ReadonlySet<string>>(new Set());

  public readonly closedRoundCount = computed(
    () =>
      (this.sessions() ?? []).filter((session) => session.status === SessionStatus.CLOSED).length,
  );

  public readonly rounds = computed<RoundHistoryItem[]>(() => {
    const searching = this.search().trim().length > 0;
    const expanded = this.expandedRoundIds();
    return buildRoundHistoryViews(
      this.sessions() ?? [],
      this.competitionMode(),
      this.canEdit(),
      this.search(),
    ).map((round) => ({ ...round, expanded: searching || expanded.has(round.id) }));
  });

  public readonly hasNoMatchForSearch = computed(
    () => this.search().trim().length > 0 && this.rounds().length === 0,
  );

  public toggleRound(roundId: string): void {
    this.expandedRoundIds.update((ids) => {
      const next = new Set(ids);
      if (!next.delete(roundId)) {
        next.add(roundId);
      }
      return next;
    });
  }

  public updateSearch(value: string): void {
    this.search.set(value);
  }

  public startEdit(matchId: string): void {
    this.editingMatchId.set(matchId);
  }

  public cancelEdit(): void {
    this.editingMatchId.set(null);
  }

  public saveEdit(update: ScoreUpdate): void {
    this.scoreUpdate.emit(update);
    this.editingMatchId.set(null);
  }
}
