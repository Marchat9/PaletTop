import { Dialog } from '@angular/cdk/dialog';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Overlay } from '@angular/cdk/overlay';
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
import { ButtonIcon } from 'src/app/shared/button-icon/button-icon';
import { InputFile } from 'src/app/shared/input-file/input-file';
import { InputText } from 'src/app/shared/input-text/input-text';
import { Icon } from 'src/app/shared/icon/icon';
import { TounamentTeamDto, TournamentDto } from 'src/app/store/tournament/tournament.models';
import { TeamAction, TeamActionsMenu } from './team-actions-menu/team-actions-menu';
import { downloadBlob, generateTeamsExcelTemplate, parseTeamsExcelFile } from './team-excel.utils';
import { filterTeams } from './team-config.utils';
import {
  TeamImportPreviewDialog,
  TeamImportPreviewDialogData,
} from './team-import-preview-dialog/team-import-preview-dialog';
import {
  TeamImportTemplateDialog,
  TeamImportTemplateDialogData,
} from './team-import-template-dialog/team-import-template-dialog';
import { environment } from '@environment';

const MOBILE_BREAKPOINT = '(max-width: ' + environment.limitMobileSizePx + 'px)';

interface TeamPlayerFormValue {
  name: string;
  club: string;
}

interface TeamEditFormValue {
  teamId: string;
  name: string;
  players: TeamPlayerFormValue[];
}

@Component({
  selector: 'app-team-config',
  imports: [Button, ButtonIcon, InputFile, InputText, Icon],
  templateUrl: './team-config.html',
  styleUrl: './team-config.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamConfig {
  private readonly dialog = inject(Dialog);
  private readonly overlay = inject(Overlay);
  private readonly breakpointObserver = inject(BreakpointObserver);

  // ======= Input / Output =======
  public readonly tournament = input<Nullable<TournamentDto>>(null);
  public readonly teamUpdated = output<TeamConfigEvent>();
  // ==============================

  public readonly teamName = signal('');
  public readonly teamSearch = signal('');
  public readonly teamPlayers = signal<TeamPlayerFormValue[]>([this.generateDefaultPlayerRow()]);

  public readonly existingTeamCount = computed(() => this.tournament()?.teams?.length ?? 0);
  public readonly suggestedTeamName = computed(() => `Equipe ${this.existingTeamCount() + 1}`);

  public readonly filteredTeams = computed(() =>
    filterTeams(this.tournament()?.teams ?? [], this.teamSearch()),
  );
  public readonly canSubmitTeam = computed(() =>
    this.teamPlayers().every((player) => !!player.name.trim()),
  );

  public readonly editingTeam = signal<Nullable<TeamEditFormValue>>(null);
  public readonly canSubmitEditTeam = computed(() => {
    const current = this.editingTeam();
    return !!current && current.players.every((player) => !!player.name.trim());
  });

  public readonly importFileFormats = '.xlsx,.xlsm,.xls,.xlt,.ods,.csv';
  public readonly importError = signal<Nullable<string>>(null);

  private generateDefaultPlayerRow(): TeamPlayerFormValue {
    return { name: '', club: '' };
  }

  // ======= Actions =======
  public updateTeamName(value: string): void {
    this.teamName.set(value);
  }

  public updateSearch(value: string): void {
    this.teamSearch.set(value);
  }

  public addPlayerRow(): void {
    this.teamPlayers.update((players) => [...players, this.generateDefaultPlayerRow()]);
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

  public onCreateTeam(): void {
    if (!this.canSubmitTeam()) {
      return;
    }

    this.teamUpdated.emit({
      type: TeamConfigEventType.CREATE_TEAM,
      payload: {
        name: this.teamName().trim() || this.suggestedTeamName(),
        players: this.teamPlayers()
          .map((player) => ({
            name: player.name.trim(),
            club: player.club.trim() ?? null,
          }))
          .filter((player) => !!player.name),
      },
    });

    // reset form
    this.teamName.set('');
    this.teamPlayers.set(this.teamPlayers().map((_) => this.generateDefaultPlayerRow()));
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
            maxTeamCapacity: this.tournament()?.configuration?.maxTeamCapacity ?? 0,
          },
          panelClass: 'dialog-panel',
          backdropClass: 'dialog-backdrop-light',
        },
      )
      .closed.subscribe((payload) => {
        if (!payload || payload.length === 0) {
          return;
        }

        this.teamUpdated.emit({ type: TeamConfigEventType.IMPORT_TEAMS, payload });
      });
  }

  // ======= Team actions menu =======
  public openTeamActions(team: TounamentTeamDto, anchor: HTMLElement): void {
    const isMobile = this.breakpointObserver.isMatched(MOBILE_BREAKPOINT);

    const positionStrategy = isMobile
      ? this.overlay.position().global().bottom('0').width('100%')
      : this.overlay
          .position()
          .flexibleConnectedTo(anchor)
          .withPositions([
            { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 6 },
            { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -6 },
          ]);

    this.dialog
      .open<TeamAction | undefined>(TeamActionsMenu, {
        data: { teamName: team.name },
        positionStrategy,
        panelClass: isMobile ? 'team-actions-sheet-panel' : 'team-actions-popover-panel',
        backdropClass: isMobile ? 'dialog-backdrop-light' : 'team-actions-popover-backdrop',
      })
      .closed.subscribe((action) => {
        if (action === 'edit') {
          this.startEditTeam(team);
        } else if (action === 'delete') {
          this.onRemoveTeam(team);
        }
      });
  }

  // ======= Edit team =======
  public startEditTeam(team: TounamentTeamDto): void {
    this.editingTeam.set({
      teamId: team.id,
      name: team.name,
      players: team.players.map((player) => ({ name: player.name, club: player.club ?? '' })),
    });
  }

  public cancelEditTeam(): void {
    this.editingTeam.set(null);
  }

  public updateEditTeamName(value: string): void {
    this.editingTeam.update((current) => (current ? { ...current, name: value } : current));
  }

  public addEditPlayerRow(): void {
    this.editingTeam.update((current) =>
      current
        ? { ...current, players: [...current.players, this.generateDefaultPlayerRow()] }
        : current,
    );
  }

  public removeEditPlayerRow(index: number): void {
    this.editingTeam.update((current) => {
      if (!current || current.players.length <= 1) {
        return current;
      }

      return {
        ...current,
        players: current.players.filter((_, playerIndex) => playerIndex !== index),
      };
    });
  }

  public updateEditPlayerName(index: number, value: string): void {
    this.patchEditPlayer(index, { name: value });
  }

  public updateEditPlayerClub(index: number, value: string): void {
    this.patchEditPlayer(index, { club: value });
  }

  public onUpdateTeam(): void {
    const current = this.editingTeam();
    if (!current || !this.canSubmitEditTeam()) {
      return;
    }

    this.teamUpdated.emit({
      type: TeamConfigEventType.UPDATE_TEAM,
      payload: {
        teamId: current.teamId,
        name: current.name.trim() || undefined,
        players: current.players
          .map((player) => ({ name: player.name.trim(), club: player.club.trim() || undefined }))
          .filter((player) => !!player.name),
      },
    });

    this.editingTeam.set(null);
  }

  public onRemoveTeam(team: TounamentTeamDto): void {
    this.teamUpdated.emit({
      type: TeamConfigEventType.REMOVE_TEAM,
      payload: { teamId: team.id },
    });
  }

  private patchEditPlayer(index: number, patch: Partial<TeamPlayerFormValue>): void {
    this.editingTeam.update((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        players: current.players.map((player, playerIndex) =>
          playerIndex === index ? { ...player, ...patch } : player,
        ),
      };
    });
  }
}
