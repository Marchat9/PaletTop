import { DIALOG_DATA, Dialog, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { environment } from '@environment';
import { Nullable } from 'src/app/models/nullable.model';
import {
  TeamConfigCreateTeamPayload,
  TeamConfigEvent,
  TeamConfigEventType,
} from 'src/app/models/team-config.model';
import { Button } from 'src/app/shared/button/button';
import { InputFile } from 'src/app/shared/input-file/input-file';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';
import { type TeamEditFormValue } from '../team-config.utils';
import { downloadBlob, generateTeamsExcelTemplate, parseTeamsExcelFile } from '../team-excel.utils';
import { TeamForm } from '../team-form/team-form';
import {
  TeamImportPreviewDialog,
  TeamImportPreviewDialogData,
} from '../team-import-preview-dialog/team-import-preview-dialog';
import {
  TeamImportTemplateDialog,
  TeamImportTemplateDialogData,
} from '../team-import-template-dialog/team-import-template-dialog';
import { Icon } from 'src/app/shared/icon/icon';

export interface TeamCreationPanelData {
  tournament: Nullable<TournamentDto>;
  editingTeam?: TeamEditFormValue;
}

type TeamCreationTab = 'manual' | 'import';

// Dual-mode: rendered inline on desktop (tournament input / teamUpdated output), or opened
// via Dialog.open() as a mobile bottom sheet (tournament from DIALOG_DATA, result reported
// by closing the DialogRef instead of emitting). inject(..., { optional: true }) returns
// null outside a dialog context, which is how the component tells the two modes apart.
// The sheet variant also doubles as the mobile team editor when DIALOG_DATA carries an
// `editingTeam` — desktop editing stays on the inline row editor in team-config.html.
@Component({
  selector: 'app-team-creation-panel',
  imports: [Button, InputFile, TeamForm, Icon],
  templateUrl: './team-creation-panel.html',
  styleUrl: './team-creation-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamCreationPanel {
  private readonly dialog = inject(Dialog);
  private readonly dialogRef = inject(DialogRef<TeamConfigEvent | undefined>, { optional: true });
  private readonly dialogData = inject<TeamCreationPanelData>(DIALOG_DATA, { optional: true });

  public readonly activeTab = signal<TeamCreationTab>('manual');

  public readonly tournament = input<Nullable<TournamentDto>>(null);
  public readonly teamUpdated = output<TeamConfigEvent>();

  public readonly resolvedTournament = computed(
    () => this.dialogData?.tournament ?? this.tournament(),
  );

  public readonly editingTeam: Nullable<TeamEditFormValue> = this.dialogData?.editingTeam ?? null;
  public readonly isEditMode = !!this.editingTeam;

  public readonly existingTeamCount = computed(() => this.resolvedTournament()?.teams?.length ?? 0);
  public readonly canCreateTeam = computed(() => this.isEditMode === true || (this.resolvedTournament()?.teams?.length ?? 0) < (this.resolvedTournament()?.configuration.maxTeamCapacity ?? 254));

  public readonly importFileFormats = '.xlsx,.xlsm,.xls,.xlt,.ods,.csv';
  public readonly importError = signal<Nullable<string>>(null);

  // ======= Actions =======
  public emitOrClose(event: TeamConfigEvent): void {
    if (this.dialogRef) {
      this.dialogRef.close(event);
    } else {
      this.teamUpdated.emit(event);
    }
  }

  public closeSheet(): void {
    this.dialogRef?.close(undefined);
  }

  // ======= Excel import =======
  public openDownloadTemplateDialog(): void {
    const maxPlayers = environment.tournamentConfiguration.teamImport.maxPlayersPerTeam;
    const fileName = environment.tournamentConfiguration.teamImport.fileName;

    this.dialog
      .open<number | undefined, TeamImportTemplateDialogData>(TeamImportTemplateDialog, {
        data: { defaultPlayers: Math.min(2, maxPlayers), maxPlayers },
        panelClass: 'dialog-panel',
        backdropClass: 'dialog-backdrop-light',
      })
      .closed.subscribe((playersCount) => {
        if (!playersCount) {
          return;
        }

        void generateTeamsExcelTemplate(playersCount).then((blob) =>
          downloadBlob(blob, `${fileName}.xlsx`),
        );
      });
  }

  public async onFileSelected(file: File): Promise<void> {
    const result = await parseTeamsExcelFile(file, environment.tournamentConfiguration.teamImport);

    if (result.globalError) {
      this.importError.set(result.globalError);
      return;
    }

    if (result.rows.length === 0) {
      this.importError.set('Aucune équipe trouvée dans le fichier.');
      return;
    }

    this.importError.set(null);

    this.dialog
      .open<TeamConfigCreateTeamPayload[] | undefined, TeamImportPreviewDialogData>(
        TeamImportPreviewDialog,
        {
          data: {
            rows: result.rows,
            tournamentTeamCount: this.existingTeamCount(),
            maxTeamCapacity: this.resolvedTournament()?.configuration?.maxTeamCapacity ?? 0,
          },
          panelClass: 'dialog-panel',
          backdropClass: 'dialog-backdrop-light',
        },
      )
      .closed.subscribe((payload) => {
        if (!payload || payload.length === 0) {
          return;
        }

        this.emitOrClose({ type: TeamConfigEventType.IMPORT_TEAMS, payload });
      });
  }
}
