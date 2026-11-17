import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { AdminMatchGroup } from 'src/app/models/admin-match.model';
import { Nullable } from 'src/app/models/nullable.model';
import { ScoreUpdate } from 'src/app/models/score-update.model';
import { AdminMatchRow } from 'src/app/shared/admin-match-row/admin-match-row';
import { Icon } from 'src/app/shared/icon/icon';
import { StaggerDirective } from 'src/app/shared/stagger/stagger.directive';

/**
 * The matches of an admin round, tournament or training, under the heading of their pool or
 * bracket. One correction is open at a time; a parent listing several rounds binds
 * `editingMatchId` to keep it so across all of them.
 */
@Component({
  selector: 'app-round-match-list',
  imports: [AdminMatchRow, Icon, StaggerDirective],
  templateUrl: './round-match-list.html',
  styleUrl: './round-match-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoundMatchList {
  // ======= Input / Output =======
  public readonly groups = input.required<AdminMatchGroup[]>();
  public readonly pointsPerGame = input.required<number>();
  /** The scores of the round can be corrected. */
  public readonly editable = input<boolean>(true);
  public readonly saving = input<boolean>(false);
  /** Status badge and timer: only meaningful while the round is being played. */
  public readonly showLiveStatus = input<boolean>(true);
  /** Replays the cascade when it changes (a new round), not on every score. */
  public readonly staggerKey = input<Nullable<string | number>>(null);
  public readonly editingMatchId = model<Nullable<string>>(null);

  public readonly scoreUpdate = output<ScoreUpdate>();
  // ==============================

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
