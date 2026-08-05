import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Card } from '../../card/card';
import { InputDate } from '../../input-date/input-date';
import { InputText } from '../../input-text/input-text';
import { InputTextarea } from '../../input-textarea/input-textarea';
import { Icon } from '../../icon/icon';
import { TournamentConfigurationField } from '../tournament-configuration-form.model';
import { TournamentParametersForm } from './tournament-parameters-form.model';

@Component({
  selector: 'app-tournament-parameters',
  imports: [ReactiveFormsModule, Card, InputText, InputDate, InputTextarea, Icon],
  templateUrl: './tournament-parameters.html',
  styleUrls: ['../shared-config.scss', './tournament-parameters.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TournamentParameters {
  public readonly group = input.required<TournamentParametersForm>();
  public readonly readonlyFields = input<TournamentConfigurationField[]>([]);
  public readonly hiddenFields = input<TournamentConfigurationField[]>([]);

  public readonly minDate: Date = new Date();
}
