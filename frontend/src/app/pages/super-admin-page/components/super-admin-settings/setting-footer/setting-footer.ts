import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from 'src/app/shared/button/button';

export interface SettingMeta {
  /** « Valeur par défaut », « Modifié par le super-admin »… */
  sourceLabel: string;
  appVersion: string | null;
  updatedAt: string | null;
  isDirty: boolean;
  isSaving: boolean;
}

/** Bottom of a setting block: where the value comes from, then reset and save. */
@Component({
  selector: 'app-setting-footer',
  imports: [Button, DatePipe],
  templateUrl: './setting-footer.html',
  styleUrl: './setting-footer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingFooterComponent {
  public readonly meta = input.required<SettingMeta>();

  public readonly save = output<void>();
  public readonly reset = output<void>();
}
