import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Avatar } from 'src/app/shared/avatar/avatar';
import { Icon } from 'src/app/shared/icon/icon';
import { TrainingTeamMemberSummaryDto } from 'src/app/store/training/training.models';

/** The players making up my team this round - it changes at every generation. */
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
