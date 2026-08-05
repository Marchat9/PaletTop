import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Button } from 'src/app/shared/button/button';
import { InputNumber } from 'src/app/shared/input-number/input-number';

export interface TeamImportTemplateDialogData {
  defaultPlayers: number;
  maxPlayers: number;
}

@Component({
  selector: 'app-team-import-template-dialog',
  imports: [Button, InputNumber],
  templateUrl: './team-import-template-dialog.html',
  styleUrl: './team-import-template-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamImportTemplateDialog {
  private readonly dialogRef = inject(DialogRef<number | undefined>);
  public readonly data = inject<TeamImportTemplateDialogData>(DIALOG_DATA);

  public readonly playersCount = signal(this.data.defaultPlayers);

  public updatePlayersCount(value: number): void {
    this.playersCount.set(value);
  }

  public onCancel(): void {
    this.dialogRef.close(undefined);
  }

  public onConfirm(): void {
    this.dialogRef.close(this.playersCount());
  }
}
