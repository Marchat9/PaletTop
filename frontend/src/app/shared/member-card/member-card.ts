import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Nullable } from 'src/app/models/nullable.model';
import { Avatar } from 'src/app/shared/avatar/avatar';

/** A team-mate: their initials, their name and, when known, their club. */
@Component({
  selector: 'app-member-card',
  imports: [Avatar],
  templateUrl: './member-card.html',
  styleUrl: './member-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemberCard {
  public readonly name = input.required<string>();
  public readonly club = input<Nullable<string>>(null);
}
