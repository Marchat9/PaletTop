import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Nullable } from 'src/app/models/nullable.model';
import { Icon } from 'src/app/shared/icon/icon';
import { MemberCard } from 'src/app/shared/member-card/member-card';

/** A team-mate as the player pages list them. */
export interface Teammate {
  id: string;
  name: string;
  club?: Nullable<string>;
}

/** The players of the team: the whole tournament team, or my partners of this training round. */
@Component({
  selector: 'app-player-teammates',
  imports: [Icon, MemberCard],
  templateUrl: './player-teammates.html',
  styleUrl: './player-teammates.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerTeammates {
  public readonly title = input.required<string>();
  public readonly subtitle = input<Nullable<string>>(null);
  public readonly teammates = input<Teammate[]>([]);
  public readonly emptyTitle = input<string>('Aucun joueur');
  public readonly emptyMessage = input<string>("L'équipe ne contient pas encore de membres.");
}
