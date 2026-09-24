import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { Button } from 'src/app/shared/button/button';
import { Card } from 'src/app/shared/card/card';
import { Icon } from 'src/app/shared/icon/icon';

@Component({
  selector: 'app-section-training',
  imports: [Card, Icon, Button],
  templateUrl: './section-training.html',
  styleUrl: './section-training.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionTraining {
  public readonly eventTrainingJoin = output<void>();
  public readonly eventTrainingCreation = output<void>();
}
