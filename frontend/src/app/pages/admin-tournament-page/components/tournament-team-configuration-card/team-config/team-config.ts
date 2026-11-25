import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Overlay } from '@angular/cdk/overlay';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, Subscription } from 'rxjs';
import { Nullable } from 'src/app/models/nullable.model';
import { TeamConfigEvent, TeamConfigEventType } from 'src/app/models/team-config.model';
import { Button } from 'src/app/shared/button/button';
import { ButtonIcon } from 'src/app/shared/button-icon/button-icon';
import { StaggerDirective } from 'src/app/shared/stagger/stagger.directive';
import { InputText } from 'src/app/shared/input-text/input-text';
import { Icon } from 'src/app/shared/icon/icon';
import { TounamentTeamDto, TournamentDto } from 'src/app/store/tournament/tournament.models';
import { TeamAction, TeamActionsMenu } from './team-actions-menu/team-actions-menu';
import {
  filterTeams,
  summarizeClubs,
  toTeamEditFormValue,
  type TeamEditFormValue,
} from './team-config.utils';
import {
  TeamCreationPanel,
  TeamCreationPanelData,
} from './team-creation-panel/team-creation-panel';
import { TeamForm } from './team-form/team-form';
import {
  TeamImportWizard,
  TeamImportWizardData,
  TeamImportWizardResult,
} from './team-import-wizard/team-import-wizard';
import { canImportTeams } from './team-import.utils';
import { environment } from '@environment';
import { registrationCapacity } from 'src/app/utils/team-capacity.util';

const MOBILE_BREAKPOINT = '(max-width: ' + environment.limitMobileSizePx + 'px)';
const CREATION_HIGHLIGHT_MS = 1500;

@Component({
  selector: 'app-team-config',
  imports: [Button, ButtonIcon, InputText, Icon, TeamCreationPanel, TeamForm, StaggerDirective],
  templateUrl: './team-config.html',
  styleUrl: './team-config.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamConfig {
  private readonly dialog = inject(Dialog);
  private readonly overlay = inject(Overlay);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  // ======= Input / Output =======
  public readonly tournament = input<Nullable<TournamentDto>>(null);
  public readonly clubSuggestions = input<string[]>([]);
  public readonly teamUpdated = output<TeamConfigEvent>();
  public readonly clubSearchRequested = output<string>();
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
  public readonly teamStaggerKey = computed(() => this.filteredTeams().length);

  public readonly teamRows = computed(() => {
    const expanded = this.expandedTeamIds();
    return this.filteredTeams().map((team) => ({
      team,
      clubsSummary: summarizeClubs(team),
      expanded: expanded.has(team.id),
    }));
  });

  public readonly editingTeam = signal<Nullable<TeamEditFormValue>>(null);

  public readonly teamCount = computed(() => this.tournament()?.teams?.length ?? 0);
  /** Teams the tournament still accepts in all, its capacity being only a target or a limit. */
  public readonly maxTeamCapacity = computed(() => registrationCapacity(this.tournament()));
  public readonly canImport = computed(() => canImportTeams(this.tournament()));

  // Brief outline on the desktop creation panel when the user is sent to it from elsewhere.
  public readonly highlightCreation = signal(false);
  private highlightTimer: Nullable<ReturnType<typeof setTimeout>> = null;

  // The open mobile sheet, if any: its panel is created by the Dialog service, not by this
  // template, so suggestions are pushed into it and its search requests are re-emitted here.
  private readonly openSheet =
    signal<Nullable<DialogRef<TeamConfigEvent | undefined, TeamCreationPanel>>>(null);

  constructor() {
    effect(() => {
      const suggestions = this.clubSuggestions();
      this.openSheet()?.componentRef?.setInput('clubSuggestions', suggestions);
    });
    // The sheet stays open between creations: it needs the live tournament to show the created
    // team's code and to switch to the max-capacity message once the tournament is full.
    effect(() => {
      const tournament = this.tournament();
      this.openSheet()?.componentRef?.setInput('tournament', tournament);
    });
    this.destroyRef.onDestroy(() => this.clearHighlightTimer());
  }

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

  /**
   * Entry point for "add a team" from elsewhere on the page: the creation sheet on mobile, the
   * creation form (scrolled to, name field focused, briefly highlighted) on larger screens.
   */
  public startTeamCreation(): void {
    if (this.isMobile()) {
      this.openCreationSheet();
      return;
    }
    const nameField = this.host.nativeElement.querySelector(
      '.creation-column input[id$="-team-name"]',
    ) as HTMLInputElement | null;
    nameField?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    nameField?.focus({ preventScroll: true });
    this.flashCreationHighlight();
  }

  private flashCreationHighlight(): void {
    this.clearHighlightTimer();
    this.highlightCreation.set(true);
    this.highlightTimer = setTimeout(() => {
      this.highlightTimer = null;
      this.highlightCreation.set(false);
    }, CREATION_HIGHLIGHT_MS);
  }

  private clearHighlightTimer(): void {
    if (this.highlightTimer) {
      clearTimeout(this.highlightTimer);
      this.highlightTimer = null;
    }
  }

  // ======= Excel import wizard =======
  public openImportWizard(): void {
    if (!this.canImport()) {
      return;
    }
    this.dialog
      .open<TeamImportWizardResult, TeamImportWizardData>(TeamImportWizard, {
        data: { existingTeamCount: this.teamCount(), maxTeamCapacity: this.maxTeamCapacity() },
        panelClass: 'team-import-wizard-panel',
        backdropClass: 'dialog-backdrop-light',
      })
      .closed.subscribe((result) => {
        if (!result || result.teams.length === 0) {
          return;
        }
        this.teamUpdated.emit({
          type: TeamConfigEventType.IMPORT_TEAMS,
          payload: result.teams,
          ignoredRows: result.ignoredRows,
        });
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
    const ref = this.dialog.open<
      TeamConfigEvent | undefined,
      TeamCreationPanelData,
      TeamCreationPanel
    >(TeamCreationPanel, {
      data,
      positionStrategy: this.overlay.position().global().bottom('0').width('100%'),
      panelClass: 'team-creation-sheet-panel',
      backdropClass: 'dialog-backdrop-light',
    });

    // Creations are emitted while the sheet stays open; an edit closes it with its event.
    const panelSubscriptions = new Subscription();
    const panel = ref.componentInstance;
    if (panel) {
      panelSubscriptions.add(
        panel.clubSearchRequested.subscribe((search) => this.clubSearchRequested.emit(search)),
      );
      panelSubscriptions.add(panel.teamUpdated.subscribe((event) => this.teamUpdated.emit(event)));
      panelSubscriptions.add(
        panel.importRequested.subscribe(() => {
          ref.close(undefined);
          this.openImportWizard();
        }),
      );
    }
    this.openSheet.set(ref);

    ref.closed.subscribe((event) => {
      panelSubscriptions.unsubscribe();
      if (this.openSheet() === ref) {
        this.openSheet.set(null);
      }
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
        data: { teamName: team.name, isSheet: isMobile },
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

  public onEditTeamSubmitted(event: TeamConfigEvent): void {
    this.teamUpdated.emit(event);
    this.editingTeam.set(null);
  }

  public onRemoveTeam(team: TounamentTeamDto): void {
    this.teamUpdated.emit({
      type: TeamConfigEventType.REMOVE_TEAM,
      payload: { teamId: team.id },
    });
  }
}
