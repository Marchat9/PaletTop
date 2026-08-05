import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TeamConfigCreateTeamPayload } from 'src/app/models/team-config.model';
import { Button } from 'src/app/shared/button/button';
import { Icon } from 'src/app/shared/icon/icon';
import { ParsedTeamRow } from '../team-excel.utils';

export interface TeamImportPreviewDialogData {
  rows: ParsedTeamRow[];
  tournamentTeamCount: number;
  maxTeamCapacity: number;
}

@Component({
  selector: 'app-team-import-preview-dialog',
  imports: [Button, Icon],
  templateUrl: './team-import-preview-dialog.html',
  styleUrl: './team-import-preview-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamImportPreviewDialog {
  private readonly dialogRef = inject(DialogRef<TeamConfigCreateTeamPayload[] | undefined>);
  public readonly data = inject<TeamImportPreviewDialogData>(DIALOG_DATA);

  public readonly hasBlockingErrors = computed(() =>
    this.data.rows.some((row) => row.errors.length > 0),
  );

  public readonly capacityWarning = computed(() => {
    const { maxTeamCapacity, tournamentTeamCount, rows } = this.data;
    if (!maxTeamCapacity) {
      return null;
    }

    const total = tournamentTeamCount + rows.length;
    if (total <= maxTeamCapacity) {
      return null;
    }

    return `Cet import portera le nombre d'équipes à ${total}, ce qui dépasse la capacité configurée du tournoi (${maxTeamCapacity}).`;
  });

  public displayName(row: ParsedTeamRow, index: number): string {
    return row.name ?? `Equipe ${this.data.tournamentTeamCount + index + 1} (auto-généré)`;
  }

  public onCancel(): void {
    this.dialogRef.close(undefined);
  }

  public onConfirm(): void {
    if (this.hasBlockingErrors()) {
      return;
    }

    const payload: TeamConfigCreateTeamPayload[] = this.data.rows.map((row) => ({
      name: row.name,
      players: row.players,
    }));

    this.dialogRef.close(payload);
  }
}
