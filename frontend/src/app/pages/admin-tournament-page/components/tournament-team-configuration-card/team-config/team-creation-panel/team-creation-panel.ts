import { DIALOG_DATA, Dialog, DialogRef } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Nullable } from 'src/app/models/nullable.model';
import {
  TeamConfigCreateTeamPayload,
  TeamConfigEvent,
  TeamConfigEventType,
} from 'src/app/models/team-config.model';
import { Button } from 'src/app/shared/button/button';
import { InputFile } from 'src/app/shared/input-file/input-file';
import { InputText } from 'src/app/shared/input-text/input-text';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';
import { environment } from '@environment';
import { downloadBlob, generateTeamsExcelTemplate, parseTeamsExcelFile } from '../team-excel.utils';
import {
  generateDefaultPlayerRow,
  type TeamEditFormValue,
  type TeamPlayerFormValue,
} from '../team-config.utils';
import {
  TeamImportPreviewDialog,
  TeamImportPreviewDialogData,
} from '../team-import-preview-dialog/team-import-preview-dialog';
import {
  TeamImportTemplateDialog,
  TeamImportTemplateDialogData,
} from '../team-import-template-dialog/team-import-template-dialog';

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
  imports: [Button, InputFile, InputText],
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

  private readonly resolvedTournament = computed(
    () => this.dialogData?.tournament ?? this.tournament(),
  );


  private readonly editingTeam = this.dialogData?.editingTeam ?? null;
  public readonly isEditMode = !!this.editingTeam;

  public readonly teamName = signal(this.editingTeam?.name ?? '');
  public readonly teamPlayers = signal<TeamPlayerFormValue[]>(
    this.editingTeam?.players ?? [generateDefaultPlayerRow()],
  );

  public readonly existingTeamCount = computed(() => this.resolvedTournament()?.teams?.length ?? 0);
  public readonly suggestedTeamName = computed(() => `Equipe ${this.existingTeamCount() + 1}`);
  public readonly canSubmitTeam = computed(() =>
    this.teamPlayers().every((player) => !!player.name.trim()),
  );

  public readonly importFileFormats = '.xlsx,.xlsm,.xls,.xlt,.ods,.csv';
  public readonly importError = signal<Nullable<string>>(null);

  // ======= Actions =======
  public updateTeamName(value: string): void {
    this.teamName.set(value);
  }

  public addPlayerRow(): void {
    this.teamPlayers.update((players) => [...players, generateDefaultPlayerRow()]);
  }

  public removePlayerRow(index: number): void {
    this.teamPlayers.update((players) => {
      if (players.length <= 1) {
        return players;
      }

      return players.filter((_, playerIndex) => playerIndex !== index);
    });
  }

  public updatePlayerName(index: number, value: string): void {
    this.patchPlayer(index, { name: value });
  }

  public updatePlayerClub(index: number, value: string): void {
    this.patchPlayer(index, { club: value });
  }

  public onSubmitTeam(): void {
    if (!this.canSubmitTeam()) {
      return;
    }

    const players = this.teamPlayers()
      .map((player) => ({ name: player.name.trim(), club: player.club.trim() || undefined }))
      .filter((player) => !!player.name);

    if (this.editingTeam) {
      this.emitOrClose({
        type: TeamConfigEventType.UPDATE_TEAM,
        payload: {
          teamId: this.editingTeam.teamId,
          name: this.teamName().trim() || undefined,
          players,
        },
      });
      return;
    }

    this.emitOrClose({
      type: TeamConfigEventType.CREATE_TEAM,
      payload: { name: this.teamName().trim() || this.suggestedTeamName(), players },
    });

    // reset form
    this.teamName.set('');
    this.teamPlayers.set(this.teamPlayers().map(() => generateDefaultPlayerRow()));
  }

  private patchPlayer(index: number, patch: Partial<TeamPlayerFormValue>): void {
    this.teamPlayers.update((players) =>
      players.map((player, playerIndex) => ({
        ...player,
        ...(playerIndex === index ? patch : {}),
      })),
    );
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

  private emitOrClose(event: TeamConfigEvent): void {
    if (this.dialogRef) {
      this.dialogRef.close(event);
    } else {
      this.teamUpdated.emit(event);
    }
  }
}
