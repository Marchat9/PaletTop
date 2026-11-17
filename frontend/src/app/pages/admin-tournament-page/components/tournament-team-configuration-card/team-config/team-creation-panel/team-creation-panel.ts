import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { environment } from '@environment';
import { Nullable } from 'src/app/models/nullable.model';
import { TeamConfigEvent, TeamConfigEventType } from 'src/app/models/team-config.model';
import { Button } from 'src/app/shared/button/button';
import { Icon } from 'src/app/shared/icon/icon';
import { SwipeToDismissDirective } from 'src/app/shared/swipe-to-dismiss/swipe-to-dismiss.directive';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';
import { findCreatedTeam, type TeamEditFormValue } from '../team-config.utils';
import { TeamForm } from '../team-form/team-form';
import { canImportTeams } from '../team-import.utils';

export interface TeamCreationPanelData {
  tournament: Nullable<TournamentDto>;
  editingTeam?: TeamEditFormValue;
}

export interface CreatedTeamBanner {
  name: string;
  code: Nullable<string>;
}

// The creation sent from the sheet, waiting for the live tournament to contain it.
interface PendingCreation {
  name: Nullable<string>;
  previousIds: ReadonlySet<string>;
}

// Dual-mode: rendered inline on desktop (tournament input / outputs), or opened via
// Dialog.open() as a mobile bottom sheet. inject(..., { optional: true }) returns null outside a
// dialog context, which is how the component tells the two modes apart. In the sheet, the opener
// pushes the live tournament through setInput and listens to the outputs: a creation is emitted
// and the sheet stays open for the next team; an edit (DIALOG_DATA `editingTeam`) still closes
// the sheet with its event — desktop editing stays on the inline row editor in team-config.html.
@Component({
  selector: 'app-team-creation-panel',
  imports: [Button, TeamForm, Icon, SwipeToDismissDirective],
  templateUrl: './team-creation-panel.html',
  styleUrl: './team-creation-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamCreationPanel {
  private readonly dialogRef = inject(DialogRef<TeamConfigEvent | undefined>, { optional: true });
  private readonly dialogData = inject<TeamCreationPanelData>(DIALOG_DATA, { optional: true });

  public readonly tournament = input<Nullable<TournamentDto>>(null);
  public readonly clubSuggestions = input<string[]>([]);
  public readonly teamUpdated = output<TeamConfigEvent>();
  public readonly clubSearchRequested = output<string>();
  public readonly importRequested = output<void>();

  public readonly isSheet = !!this.dialogRef;

  // The live input wins; DIALOG_DATA only covers the sheet before its first setInput.
  public readonly resolvedTournament = computed(
    () => this.tournament() ?? this.dialogData?.tournament ?? null,
  );

  public readonly editingTeam: Nullable<TeamEditFormValue> = this.dialogData?.editingTeam ?? null;
  public readonly isEditMode = !!this.editingTeam;

  public readonly canCreateTeam = computed(
    () =>
      this.isEditMode ||
      (this.resolvedTournament()?.teams?.length ?? 0) <
        (this.resolvedTournament()?.configuration.maxTeamCapacity ??
          environment.tournamentConfiguration.maxTeamCapacity.max),
  );

  public readonly showImportLink = computed(
    () => !this.isEditMode && canImportTeams(this.resolvedTournament()),
  );

  // The banner only reflects a server-confirmed creation: nothing is shown while the creation is
  // pending, so a failed request never displays « créée ».
  private readonly pendingCreation = signal<Nullable<PendingCreation>>(null);
  private readonly confirmedTeamId = signal<Nullable<string>>(null);

  public readonly lastCreated = computed<Nullable<CreatedTeamBanner>>(() => {
    const teamId = this.confirmedTeamId();
    const team = teamId
      ? this.resolvedTournament()?.teams?.find((candidate) => candidate.id === teamId)
      : null;
    return team ? { name: team.name, code: team.code ?? null } : null;
  });

  constructor() {
    effect(() => {
      const pending = this.pendingCreation();
      if (!pending) {
        return;
      }
      const created = findCreatedTeam(
        pending.previousIds,
        this.resolvedTournament()?.teams ?? [],
        pending.name,
      );
      if (created) {
        this.confirmedTeamId.set(created.id);
        this.pendingCreation.set(null);
      }
    });
  }

  // ======= Actions =======
  public emitOrClose(event: TeamConfigEvent): void {
    if (!this.dialogRef) {
      this.teamUpdated.emit(event);
      return;
    }
    if (event.type === TeamConfigEventType.CREATE_TEAM) {
      this.confirmedTeamId.set(null);
      this.pendingCreation.set({
        name: event.payload.name,
        previousIds: new Set((this.resolvedTournament()?.teams ?? []).map((team) => team.id)),
      });
      this.teamUpdated.emit(event);
      return;
    }
    this.dialogRef.close(event);
  }

  public requestImport(): void {
    this.importRequested.emit();
  }

  public closeSheet(): void {
    this.dialogRef?.close(undefined);
  }
}
