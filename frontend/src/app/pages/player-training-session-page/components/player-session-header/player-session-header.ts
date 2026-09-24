import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Nullable } from 'src/app/models/nullable.model';
import { Avatar } from 'src/app/shared/avatar/avatar';
import { Icon } from 'src/app/shared/icon/icon';
import {
  TrainingParticipantIdentityDto,
  TrainingSessionPublicDto,
} from 'src/app/store/training/training.models';

@Component({
  selector: 'app-player-session-header',
  imports: [Avatar, Icon, DatePipe],
  templateUrl: './player-session-header.html',
  styleUrl: './player-session-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerSessionHeader {
  public readonly participant = input<Nullable<TrainingParticipantIdentityDto>>(null);
  public readonly participantCode = input<Nullable<string>>(null);
  public readonly session = input<Nullable<TrainingSessionPublicDto>>(null);
  public readonly roundNumber = input<Nullable<number>>(null);
}
