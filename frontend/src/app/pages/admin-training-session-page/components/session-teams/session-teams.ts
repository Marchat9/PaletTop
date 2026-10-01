import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { Button } from 'src/app/shared/button/button';
import { CardCollapsible } from 'src/app/shared/card-collapsible/card-collapsible';
import { Icon } from 'src/app/shared/icon/icon';
import { InputText } from 'src/app/shared/input-text/input-text';
import {
  TrainingParticipantAdminDto,
  TrainingTeamDto,
} from 'src/app/store/training/training.models';
import { TrainingTeamCreation } from '../../admin-training-session-page.models';

@Component({
  selector: 'app-session-teams',
  imports: [CardCollapsible, Button, Icon, InputText],
  templateUrl: './session-teams.html',
  styleUrl: './session-teams.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionTeams {
  public readonly teams = input<TrainingTeamDto[]>([]);
  /** Participants present and free - a player can only be in a single fixed team. */
  public readonly availableParticipants = input<TrainingParticipantAdminDto[]>([]);
  public readonly isSessionOpen = input<boolean>(false);
  public readonly createLoading = input<boolean>(false);

  public readonly createTeam = output<TrainingTeamCreation>();
  public readonly dissolveTeam = output<TrainingTeamDto>();

  protected readonly isCreating = signal(false);
  protected readonly selectedIds = signal<string[]>([]);
  protected readonly teamName = signal('');

  protected readonly fixedTeams = computed(() =>
    this.teams().filter((team) => team.kind === 'FIXED'),
  );
  protected readonly canCreate = computed(() => this.selectedIds().length > 0);

  protected toggleCreating(): void {
    this.isCreating.update((value) => !value);
    this.selectedIds.set([]);
    this.teamName.set('');
  }

  protected isSelected(participantId: string): boolean {
    return this.selectedIds().includes(participantId);
  }

  protected toggleParticipant(participantId: string): void {
    this.selectedIds.update((ids) =>
      ids.includes(participantId)
        ? ids.filter((id) => id !== participantId)
        : [...ids, participantId],
    );
  }

  protected onTeamNameChange(value: string): void {
    this.teamName.set(value);
  }

  protected onCreate(): void {
    if (!this.canCreate()) {
      return;
    }

    this.createTeam.emit({
      participantIds: this.selectedIds(),
      name: this.teamName().trim() || undefined,
    });
    this.toggleCreating();
  }

  protected teamMembersLabel(team: TrainingTeamDto): string {
    return team.members.map((member) => member.name).join(' · ');
  }
}
