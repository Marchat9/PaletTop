import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { Nullable } from 'src/app/models/nullable.model';
import { TournamentConfigurationDto } from 'src/app/models/tournament-configuration.model';
import { Button } from 'src/app/shared/button/button';
import { TournamentConfiguration } from 'src/app/shared/tournament-configuration/tournament-configuration';
import {
  TournamentConfigurationField,
  TournamentConfigurationForm,
} from 'src/app/shared/tournament-configuration/tournament-configuration-form.model';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';
import { convertTournamentFormToTournamentConfigurationDto } from 'src/app/utils/tournament-configuration.utils';

@Component({
  selector: 'app-configuration-form',
  standalone: true,
  imports: [CommonModule, Button, TournamentConfiguration],
  templateUrl: './configuration-form.component.html',
  styleUrl: './configuration-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigurationFormComponent {
  // ======= Input / Output =======
  public readonly tournament = input<Nullable<TournamentDto>>(null);
  public readonly saving = input(false);
  public readonly readonlyFields = input<TournamentConfigurationField[]>([]);
  public readonly hiddenFields = input<TournamentConfigurationField[]>([]);

  public readonly configurationSaved = output<TournamentConfigurationDto>();
  public readonly configurationCancelled = output<void>();
  // ==============================

  public readonly tournamentForm = signal<Nullable<TournamentConfigurationForm>>(null);
  public readonly invalidFieldNames = signal<Nullable<string[]>>(null);
  private initialFormValues: Nullable<TournamentConfigurationForm['value']> = null;

  public onFormReady(form: TournamentConfigurationForm): void {
    this.tournamentForm.set(form);
    this.initialFormValues = form.getRawValue();
  }

  public onSave(): void {
    if (this.tournamentForm()?.pristine || this.tournamentForm()?.invalid) {
      this.tournamentForm()!.markAllAsTouched();
      if (this.tournamentForm()?.invalid) {
      }
      return;
    }
    const formattedConfig: TournamentConfigurationDto =
      convertTournamentFormToTournamentConfigurationDto(this.tournamentForm()!);
    this.configurationSaved.emit(formattedConfig);
  }

  public onCancel(): void {
    if (this.initialFormValues) {
      this.tournamentForm()!.reset(this.initialFormValues);
    }
    this.configurationCancelled.emit();
  }
}
