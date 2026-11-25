import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Card } from 'src/app/shared/card/card';
import { Icon } from 'src/app/shared/icon/icon';
import { PlayerParcoursStep } from 'src/app/utils/player-parcours.util';

/** « Mon parcours »: the rounds a team went through, the one in progress highlighted. */
@Component({
  selector: 'app-player-parcours',
  imports: [Card, Icon],
  templateUrl: './player-parcours.html',
  styleUrl: './player-parcours.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerParcours {
  public readonly steps = input.required<PlayerParcoursStep[]>();
}
