import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { Button } from 'src/app/shared/button/button';
import { CardCollapsible } from 'src/app/shared/card-collapsible/card-collapsible';
import { Icon } from 'src/app/shared/icon/icon';
import { InputText } from 'src/app/shared/input-text/input-text';
import { StaggerDirective } from 'src/app/shared/stagger/stagger.directive';
import { TrainingMemberDto } from 'src/app/store/training/training.models';

@Component({
  selector: 'app-training-roster-card',
  imports: [CardCollapsible, Button, Icon, InputText, StaggerDirective],
  templateUrl: './training-roster-card.html',
  styleUrl: './training-roster-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingRosterCard {
  public readonly members = input<TrainingMemberDto[]>([]);
  public readonly addLoading = input<boolean>(false);

  public readonly addMember = output<string>();
  public readonly removeMember = output<TrainingMemberDto>();

  protected readonly newMemberName = signal('');
  protected readonly canAdd = computed(() => this.newMemberName().trim().length > 0);
  protected readonly staggerKey = computed(() => this.members().length);

  protected onNameChange(value: string): void {
    this.newMemberName.set(value);
  }

  protected onAdd(): void {
    if (!this.canAdd()) {
      return;
    }
    this.addMember.emit(this.newMemberName().trim());
    this.newMemberName.set('');
  }
}
