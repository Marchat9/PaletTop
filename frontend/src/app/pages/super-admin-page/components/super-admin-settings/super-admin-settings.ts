import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CardCollapsible } from 'src/app/shared/card-collapsible/card-collapsible';
import { Icon } from 'src/app/shared/icon/icon';

export interface Setting {
  name: string;
  description: string;
  settingKey: string;
  currentValue: boolean;
}

@Component({
  selector: 'app-super-admin-settings',
  imports: [CardCollapsible, Icon],
  templateUrl: './super-admin-settings.html',
  styleUrl: './super-admin-settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperAdminSettingsComponent {
  public readonly configurations = input<Setting[]>([]);
}
