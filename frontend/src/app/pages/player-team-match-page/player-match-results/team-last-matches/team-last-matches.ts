import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TeamResultView } from 'src/app/models/player-team-view';
import { MatchStatusComponent } from 'src/app/shared/match-status/match-status';

@Component({
  selector: 'app-team-last-matches',
  standalone: true,
  imports: [MatchStatusComponent],
  templateUrl: './team-last-matches.html',
  styleUrl: './team-last-matches.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamLastMatchesComponent {
  public readonly currentTeamName = input.required<string>();
  public readonly result = input.required<TeamResultView>();

  public readonly isOngoing = computed(() => this.result().status === 'ONGOING');
  public readonly isFinished = computed(() => {
    const s = this.result().status;
    return s === 'ENDED' || s === 'VALIDATED';
  });

  public readonly statusLabel = computed(() =>
    this.result().status === 'VALIDATED' ? 'ENDED' : this.result().status,
  );

  public readonly outcomeClass = computed(() => {
    if (!this.isFinished()) return '';
    const r = this.result();
    if (r.currentTeamScore > r.opponentScore) return 'win';
    if (r.currentTeamScore < r.opponentScore) return 'loss';
    return 'draw';
  });

  public readonly outcomeLabel = computed(() => {
    switch (this.outcomeClass()) {
      case 'win':
        return 'Victoire';
      case 'loss':
        return 'Défaite';
      case 'draw':
        return 'Nul';
      default:
        return '';
    }
  });
}
