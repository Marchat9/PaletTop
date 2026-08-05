import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TeamPlayerDto } from 'src/app/models/team.model';
import { MemberCardComponent } from 'src/app/shared/member-card/member-card';
import { Icon } from 'src/app/shared/icon/icon';

@Component({
  selector: 'app-player-team-members',
  standalone: true,
  imports: [MemberCardComponent, Icon],
  templateUrl: './player-team-members.html',
  styleUrl: './player-team-members.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerTeamMembersComponent {
  public readonly players = input.required<TeamPlayerDto[]>();
}
