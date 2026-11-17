import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { AdminRoundHistory } from 'src/app/models/admin-match.model';
import { Nullable } from 'src/app/models/nullable.model';
import { ScoreUpdate } from 'src/app/models/score-update.model';
import { Button } from 'src/app/shared/button/button';
import { CardCollapsible } from 'src/app/shared/card-collapsible/card-collapsible';
import { Icon } from 'src/app/shared/icon/icon';
import { InputText } from 'src/app/shared/input-text/input-text';
import { RoundMatchList } from 'src/app/shared/round-match-list/round-match-list';
import { filterRoundHistories } from 'src/app/utils/rounds-history.util';

interface RoundHistoryItem extends AdminRoundHistory {
  /** « Qualifications · 4 matchs », or the count alone. */
  metaLabel: string;
  expanded: boolean;
}

/**
 * Closed rounds of a tournament or a training session, to review the matches round by round and
 * correct the scores of the rounds that allow it.
 */
@Component({
  selector: 'app-rounds-history',
  imports: [Button, CardCollapsible, Icon, InputText, RoundMatchList],
  templateUrl: './rounds-history.html',
  styleUrl: './rounds-history.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoundsHistory {
  // ======= Input / Output =======
  /** Closed rounds, most recent first. */
  public readonly rounds = input<AdminRoundHistory[]>([]);
  public readonly pointsPerGame = input<number>(13);
  public readonly description = input<Nullable<string>>(null);
  public readonly searchPlaceholder = input<string>('Filtrer par équipe');
  public readonly scoreUpdateLoading = input<boolean>(false);
  /** Offers the PDF of every match. */
  public readonly canDownload = input<boolean>(false);
  public readonly downloadLoading = input<boolean>(false);

  public readonly scoreUpdate = output<ScoreUpdate>();
  public readonly downloadRequested = output<void>();
  // ==============================

  public readonly search = signal('');
  public readonly editingMatchId = signal<Nullable<string>>(null);
  private readonly expandedRoundIds = signal<ReadonlySet<string>>(new Set());

  public readonly closedRoundCount = computed(() => this.rounds().length);

  public readonly items = computed<RoundHistoryItem[]>(() => {
    const searching = this.search().trim().length > 0;
    const expanded = this.expandedRoundIds();
    return filterRoundHistories(this.rounds(), this.search()).map((round) => ({
      ...round,
      metaLabel: round.label ? `${round.label} · ${round.matchCountLabel}` : round.matchCountLabel,
      expanded: searching || expanded.has(round.id),
    }));
  });

  public readonly hasNoMatchForSearch = computed(
    () => this.search().trim().length > 0 && this.items().length === 0,
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
}
