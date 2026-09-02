import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { Nullable } from 'src/app/models/nullable.model';
import { TeamConfigEvent, TeamConfigEventType } from 'src/app/models/team-config.model';
import { ChampionShipTournamentConfig } from 'src/app/models/tournament-configuration-detail.model';
import { Button } from 'src/app/shared/button/button';
import { InputSelect } from 'src/app/shared/input-select/input-select';
import { InputText } from 'src/app/shared/input-text/input-text';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';
import {
  generateDefaultPlayerRow,
  type TeamEditFormValue,
  type TeamPlayerFormValue,
} from '../team-config.utils';

@Component({
  selector: 'app-team-form',
  imports: [Button, InputText, InputSelect],
  templateUrl: './team-form.html',
  styleUrl: './team-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamForm {
  // Desktop can mount two instances at once (creation column + an in-place row edit), so
  // field ids get a per-instance prefix to stay unique across both.
  private static instanceCount = 0;
  public readonly formId = `team-form-${TeamForm.instanceCount++}`;

  public readonly tournament = input<Nullable<TournamentDto>>(null);
  public readonly editingTeam = input<Nullable<TeamEditFormValue>>();

  public readonly submitted = output<TeamConfigEvent>();
  public readonly cancelled = output<void>();

  public readonly isEditMode = computed(() => !!this.editingTeam());

  public readonly teamName = linkedSignal(() => this.editingTeam()?.name ?? '');
  public readonly teamClub = linkedSignal(() => this.editingTeam()?.club ?? '');
  public readonly teamPlayers = linkedSignal<TeamPlayerFormValue[]>(
    () => this.editingTeam()?.players ?? [generateDefaultPlayerRow()],
  );

  public readonly isChampionship = computed(() => this.tournament()?.configuration.competitionMode === 'championship')
  private readonly championshipConfig = computed(() => (this.isChampionship() ? this.tournament()?.configuration.competitionConfiguration : {}) as ChampionShipTournamentConfig);
  public readonly championshipClubs = computed(() => this.isChampionship() ?
    [
      {
        label: "---- Veuillez choisir un club ----",
        value: "",
      },
      ...[
        this.championshipConfig().homeClub,
        this.championshipConfig().awayClub
      ].map(club => ({ value: club, label: club }))]
    : []
  )

  public readonly existingTeamCount = computed(() => this.tournament()?.teams?.length ?? 0);
  public readonly suggestedTeamName = computed(() => `Equipe ${this.existingTeamCount() + 1}`);
  public readonly canSubmit = computed(() =>
    this.teamPlayers().every((player) => !!player.name.trim()) &&
    this.isChampionship() && !!this.teamClub()
  );

  // ======= Actions =======
  public updateTeamName(value: string): void {
    this.teamName.set(value);
  }

  public updateTeamClub(value: string): void {
    this.teamClub.set(value);
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

  public onSubmit(): void {
    if (!this.canSubmit()) {
      return;
    }

    const players = this.teamPlayers()
      .map((player) => ({ name: player.name.trim(), club: player.club.trim() || undefined }))
      .filter((player) => !!player.name);

    const editingTeam = this.editingTeam();
    if (editingTeam) {
      this.submitted.emit({
        type: TeamConfigEventType.UPDATE_TEAM,
        payload: {
          teamId: editingTeam.teamId,
          name: this.teamName().trim() || undefined,
          club: this.teamClub().trim() || undefined,
          players,
        },
      });
      return;
    }

    this.submitted.emit({
      type: TeamConfigEventType.CREATE_TEAM,
      payload: {
        name: this.teamName().trim() || this.suggestedTeamName(),
        club: this.teamClub().trim() || undefined,
        players
      },
    });

    // reset form
    this.teamName.set('');
    this.teamPlayers.set(this.teamPlayers().map(() => generateDefaultPlayerRow()));
  }

  public onCancel(): void {
    this.cancelled.emit();
  }

  private patchPlayer(index: number, patch: Partial<TeamPlayerFormValue>): void {
    this.teamPlayers.update((players) =>
      players.map((player, playerIndex) => ({
        ...player,
        ...(playerIndex === index ? patch : {}),
      })),
    );
  }
}
