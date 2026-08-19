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
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { Nullable } from 'src/app/models/nullable.model';
import { TeamConfigEvent, TeamConfigEventType } from 'src/app/models/team-config.model';
import { Button } from 'src/app/shared/button/button';
import { ButtonIcon } from 'src/app/shared/button-icon/button-icon';
import { InputText } from 'src/app/shared/input-text/input-text';
import { Icon } from 'src/app/shared/icon/icon';
import { TounamentTeamDto, TournamentDto } from 'src/app/store/tournament/tournament.models';
import { TeamAction, TeamActionsMenu } from './team-actions-menu/team-actions-menu';
import {
  filterTeams,
  generateDefaultPlayerRow,
  summarizeClubs,
  toTeamEditFormValue,
  type TeamEditFormValue,
  type TeamPlayerFormValue,
} from './team-config.utils';
import {
  TeamCreationPanel,
  TeamCreationPanelData,
} from './team-creation-panel/team-creation-panel';
import { environment } from '@environment';

const MOBILE_BREAKPOINT = '(max-width: ' + environment.limitMobileSizePx + 'px)';

@Component({
  selector: 'app-team-config',
  imports: [Button, ButtonIcon, InputText, Icon, TeamCreationPanel],
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

  // Drives which of the two creation UIs is actually in the DOM — not just CSS-hidden —
  // so the desktop inline panel and the mobile sheet's panel never coexist (duplicate ids).
  public readonly isMobile = toSignal(
    this.breakpointObserver.observe(MOBILE_BREAKPOINT).pipe(map((state) => state.matches)),
    { initialValue: this.breakpointObserver.isMatched(MOBILE_BREAKPOINT) },
  );

  public readonly teamSearch = signal('');

  public readonly filteredTeams = computed(() =>
    filterTeams(this.tournament()?.teams ?? [], this.teamSearch()),
  );

  // Player rosters are collapsed by default and expand on demand — keeps the table
  // scannable for tournaments with many teams instead of always showing every roster.
  public readonly expandedTeamIds = signal<ReadonlySet<string>>(new Set());
  public readonly teamRows = computed(() => {
    const expanded = this.expandedTeamIds();
    return this.filteredTeams().map((team) => ({
      team,
      clubsSummary: summarizeClubs(team),
      expanded: expanded.has(team.id),
    }));
  });

  public readonly editingTeam = signal<Nullable<TeamEditFormValue>>(null);
  public readonly canSubmitEditTeam = computed(() => {
    const current = this.editingTeam();
    return !!current && current.players.every((player) => !!player.name.trim());
  });

  // ======= Actions =======
  public updateSearch(value: string): void {
    this.teamSearch.set(value);
  }

  public toggleTeamExpanded(teamId: string): void {
    this.expandedTeamIds.update((current) => {
      const next = new Set(current);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  }

  // ======= Creation / edition sheet (mobile) =======
  public openCreationSheet(): void {
    this.openTeamPanelSheet({ tournament: this.tournament() });
  }

  public openEditSheet(team: TounamentTeamDto): void {
    this.openTeamPanelSheet({
      tournament: this.tournament(),
      editingTeam: toTeamEditFormValue(team),
    });
  }

  private openTeamPanelSheet(data: TeamCreationPanelData): void {
    this.dialog
      .open<TeamConfigEvent | undefined, TeamCreationPanelData>(TeamCreationPanel, {
        data,
        positionStrategy: this.overlay.position().global().bottom('0').width('100%'),
        panelClass: 'team-creation-sheet-panel',
        backdropClass: 'dialog-backdrop-light',
      })
      .closed.subscribe((event) => {
        if (event) {
          this.teamUpdated.emit(event);
        }
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
          if (isMobile) {
            this.openEditSheet(team);
          } else {
            this.startEditTeam(team);
          }
        } else if (action === 'delete') {
          this.onRemoveTeam(team);
        }
      });
  }

  // ======= Edit team (desktop inline row) =======
  public startEditTeam(team: TounamentTeamDto): void {
    this.editingTeam.set(toTeamEditFormValue(team));
  }

  public cancelEditTeam(): void {
    this.editingTeam.set(null);
  }

  public updateEditTeamName(value: string): void {
    this.editingTeam.update((current) => (current ? { ...current, name: value } : current));
  }

  public addEditPlayerRow(): void {
    this.editingTeam.update((current) =>
      current ? { ...current, players: [...current.players, generateDefaultPlayerRow()] } : current,
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
