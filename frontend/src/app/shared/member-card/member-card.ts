import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Nullable } from 'src/app/models/nullable.model';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-member-card',
  imports: [NgOptimizedImage, Icon],
  templateUrl: './member-card.html',
  styleUrl: './member-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemberCardComponent {
  public readonly name = input.required<string>();
  public readonly club = input<Nullable<string>>(null);
  public readonly role = input<Nullable<string>>(null);
  public readonly precision = input<Nullable<string>>(null);
  public readonly imageSrc = input<Nullable<string>>(null);
}
