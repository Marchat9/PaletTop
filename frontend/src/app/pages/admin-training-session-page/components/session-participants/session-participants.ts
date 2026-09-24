import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Avatar } from 'src/app/shared/avatar/avatar';
import { Button } from 'src/app/shared/button/button';
import { CardCollapsible } from 'src/app/shared/card-collapsible/card-collapsible';
import { Icon } from 'src/app/shared/icon/icon';
import { StaggerDirective } from 'src/app/shared/stagger/stagger.directive';
import { TrainingParticipantAdminDto } from 'src/app/store/training/training.models';

@Component({
  selector: 'app-session-participants',
  imports: [CardCollapsible, Icon, StaggerDirective, Button, Avatar],
  templateUrl: './session-participants.html',
  styleUrl: './session-participants.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionParticipants {
  public readonly participants = input<TrainingParticipantAdminDto[]>([]);
  public readonly isSessionOpen = input<boolean>(false);
  public readonly newParticipantId = input<string | null>(null);

  public readonly markLeft = output<TrainingParticipantAdminDto>();

  protected readonly present = computed(() =>
    this.participants().filter((participant) => participant.status === 'PRESENT'),
  );
  protected readonly left = computed(() =>
    this.participants().filter((participant) => participant.status === 'LEFT'),
  );
  protected readonly staggerKey = computed(() => this.present().length);
}
