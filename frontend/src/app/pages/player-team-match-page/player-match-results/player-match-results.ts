import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TeamResultView } from 'src/app/models/player-team-view';
import { TeamLastMatchesComponent } from './team-last-matches/team-last-matches';

@Component({
  selector: 'app-player-match-results',
  standalone: true,
  imports: [TeamLastMatchesComponent],
  templateUrl: './player-match-results.html',
  styleUrl: './player-match-results.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerMatchResultsComponent {
  public readonly results = input.required<TeamResultView[]>();
  public readonly teamName = input.required<string>();
}
