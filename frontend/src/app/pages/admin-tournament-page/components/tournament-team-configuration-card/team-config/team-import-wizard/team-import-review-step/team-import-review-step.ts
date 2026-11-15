import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Nullable } from 'src/app/models/nullable.model';
import { Button } from 'src/app/shared/button/button';
import { Icon } from 'src/app/shared/icon/icon';
import {
  ImportCapacity,
  ImportRowCounts,
  ImportRowFilter,
  ImportRowView,
} from '../../team-import.utils';

interface ReviewChip {
  filter: ImportRowFilter;
  label: string;
  count: number;
}

@Component({
  selector: 'app-team-import-review-step',
  imports: [Button, Icon],
  templateUrl: './team-import-review-step.html',
  styleUrl: './team-import-review-step.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamImportReviewStep {
  public readonly rows = input.required<ImportRowView[]>();
  public readonly counts = input.required<ImportRowCounts>();
  public readonly filter = input.required<ImportRowFilter>();
  public readonly capacity = input.required<ImportCapacity>();
  public readonly blockReason = input<Nullable<string>>(null);
  public readonly canImport = input.required<boolean>();

  public readonly filterChange = output<ImportRowFilter>();
  public readonly changeFile = output<void>();
  public readonly cancel = output<void>();
  public readonly import = output<void>();

  public readonly chips = computed<ReviewChip[]>(() => {
    const counts = this.counts();
    return [
      { filter: 'all', label: 'Toutes', count: counts.all },
      { filter: 'ready', label: 'Prêtes', count: counts.ready },
      { filter: 'warning', label: 'À vérifier', count: counts.warning },
      { filter: 'ignored', label: 'Ignorées', count: counts.ignored },
    ];
  });

  public readonly gaugePercent = computed(() => {
    const { after, max } = this.capacity();
    return max > 0 ? Math.min(100, Math.round((after / max) * 100)) : 0;
  });

  public readonly importLabel = computed(() => {
    const count = this.counts().importable;
    return `Importer ${count} ${count > 1 ? 'équipes' : 'équipe'}`;
  });
}
