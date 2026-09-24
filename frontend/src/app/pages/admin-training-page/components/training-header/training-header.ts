import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Nullable } from 'src/app/models/nullable.model';
import { Button } from 'src/app/shared/button/button';
import { Card } from 'src/app/shared/card/card';
import { Icon } from 'src/app/shared/icon/icon';
import { AdminTrainingDto } from 'src/app/store/training/training.models';

@Component({
  selector: 'app-training-header',
  imports: [Card, Button, Icon, DatePipe],
  templateUrl: './training-header.html',
  styleUrl: './training-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingHeader {
  public readonly training = input<Nullable<AdminTrainingDto>>(null);
  public readonly sessionCount = input<number>(0);
  public readonly lastSessionDate = input<Nullable<string>>(null);

  public readonly disconnect = output<void>();
}
