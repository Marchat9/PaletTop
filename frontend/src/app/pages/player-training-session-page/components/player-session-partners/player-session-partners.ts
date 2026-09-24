import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Avatar } from 'src/app/shared/avatar/avatar';
import { Icon } from 'src/app/shared/icon/icon';
import { TrainingTeamMemberSummaryDto } from 'src/app/store/training/training.models';

/** Les joueurs qui composent mon équipe ce round — elle change à chaque génération. */
@Component({
  selector: 'app-player-session-partners',
  imports: [Avatar, Icon],
  templateUrl: './player-session-partners.html',
  styleUrl: './player-session-partners.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerSessionPartners {
  public readonly partners = input<TrainingTeamMemberSummaryDto[]>([]);
}
