import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Button } from 'src/app/shared/button/button';
import { InputNumber } from 'src/app/shared/input-number/input-number';
import { getTemplateHeaders } from '../../team-excel.utils';

@Component({
  selector: 'app-team-import-template-step',
  imports: [Button, InputNumber],
  templateUrl: './team-import-template-step.html',
  styleUrl: './team-import-template-step.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamImportTemplateStep {
  public readonly playersCount = input.required<number>();
  public readonly maxPlayers = input.required<number>();

  public readonly playersCountChange = output<number>();
  public readonly download = output<void>();
  public readonly continue = output<void>();
  public readonly skip = output<void>();

  public readonly headers = computed(() => getTemplateHeaders(this.playersCount()));

  public onPlayersCountChange(value: number): void {
    this.playersCountChange.emit(value);
  }
}
