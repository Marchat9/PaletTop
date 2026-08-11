import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatchesSessionDto, MatchPoolGroup } from 'src/app/models/matches-session.model';
import { Nullable } from 'src/app/models/nullable.model';
import { MatchStatusComponent } from 'src/app/shared/match-status/match-status';
import { MatchTimerComponent } from 'src/app/shared/match-timer/match-timer';
import { Icon } from 'src/app/shared/icon/icon';
import { computeMatchGroups } from 'src/app/pages/admin-tournament-page/components/match-sessions-card/session-matches/session-matches.utils';
import { CardCollapsible } from 'src/app/shared/card-collapsible/card-collapsible';

@Component({
  selector: 'app-spectator-match-list',
  standalone: true,
  imports: [MatchStatusComponent, MatchTimerComponent, Icon, CardCollapsible],
  templateUrl: './spectator-match-list.html',
  styleUrl: './spectator-match-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpectatorMatchListComponent {
  public readonly session = input<Nullable<MatchesSessionDto>>(null);

  public readonly matchGroups = computed<MatchPoolGroup[]>(() =>
    computeMatchGroups(this.session()?.matches ?? []),
  );
}
