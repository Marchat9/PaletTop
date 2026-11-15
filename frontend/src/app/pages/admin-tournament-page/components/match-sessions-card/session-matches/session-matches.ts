import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { MatchesSessionDto, MatchPoolGroup } from 'src/app/models/matches-session.model';
import { Nullable } from 'src/app/models/nullable.model';
import { ScoreUpdate } from 'src/app/models/score-update.model';
import { Icon } from 'src/app/shared/icon/icon';
import { StaggerDirective } from 'src/app/shared/stagger/stagger.directive';
import { AdminMatchRow } from '../../admin-match-row/admin-match-row';
import { computeMatchGroups } from './session-matches.utils';

@Component({
  selector: 'app-session-matches',
  standalone: true,
  imports: [AdminMatchRow, Icon, StaggerDirective],
  templateUrl: './session-matches.html',
  styleUrl: './session-matches.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionMatchesComponent {
  // ======= Input / Output =======
  public readonly session = input.required<MatchesSessionDto>();
  public readonly pointsPerGame = input.required<number>();
  public readonly scoreUpdateLoading = input<boolean>(false);
  public readonly scoreUpdate = output<ScoreUpdate>();
  // ==============================

  public readonly editingMatchId = signal<Nullable<string>>(null);

  public readonly matchGroups = computed<MatchPoolGroup[]>(() =>
    computeMatchGroups(this.session()?.matches ?? []),
  );

  // Replay the cascade when the session's matches change (a new session), not on every score.
  public readonly staggerKey = computed(() => this.session()?.sessionNumber ?? 0);

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
