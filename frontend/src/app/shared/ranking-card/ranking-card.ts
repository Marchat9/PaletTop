import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { GlobalRankingEntry } from 'src/app/models/global-ranking.model';
import { ScoreCalculation } from 'src/app/models/tournament-configuration-detail.model';
import { CardCollapsible } from 'src/app/shared/card-collapsible/card-collapsible';
import { Icon } from 'src/app/shared/icon/icon';

@Component({
  selector: 'app-ranking-card',
  standalone: true,
  imports: [CardCollapsible, Icon],
  templateUrl: './ranking-card.html',
  styleUrl: './ranking-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RankingCard {
  // ======= Input / Output =======
  public readonly ranking = input<GlobalRankingEntry[]>();
  public readonly isLoading = input<boolean>(false);
  public readonly scoreCalculation = input<ScoreCalculation>();
  public readonly canCollapse = input<boolean>(true);
  // ==============================

  public readonly hasData = computed(() => (this.ranking()?.length ?? 0) > 0);
}
