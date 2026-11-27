import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Card } from 'src/app/shared/card/card';
import { Icon } from 'src/app/shared/icon/icon';

/** Gentle invitation to support PaletTop, shown to the organiser once their tournament is over. */
@Component({
  selector: 'app-donation-card',
  imports: [Card, Icon],
  templateUrl: './donation-card.html',
  styleUrl: './donation-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DonationCard {
  public readonly donationUrl = input.required<string>();
}
