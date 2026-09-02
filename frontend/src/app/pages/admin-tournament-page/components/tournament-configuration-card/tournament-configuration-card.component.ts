import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Nullable } from 'src/app/models/nullable.model';
import { CardCollapsible } from 'src/app/shared/card-collapsible/card-collapsible';
import { Icon } from 'src/app/shared/icon/icon';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';
import { ConfigurationFormComponent } from './configuration-form/configuration-form.component';
import { TournamentConfigurationField } from 'src/app/shared/tournament-configuration/tournament-configuration-form.model';
import { TournamentConfigurationDto } from 'src/app/models/tournament-configuration.model';

@Component({
  selector: 'app-tournament-configuration-card',
  standalone: true,
  imports: [CardCollapsible, ConfigurationFormComponent, Icon],
  templateUrl: './tournament-configuration-card.component.html',
  styleUrl: './tournament-configuration-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TournamentConfigurationCardComponent {
  // ======= Input / Output =======
  public readonly tournament = input<Nullable<TournamentDto>>(null);
  public readonly saveLoading = input<boolean>(false);
  public readonly readonlyFields = input<TournamentConfigurationField[]>([]);
  public readonly hiddenFields = input<TournamentConfigurationField[]>([]);

  public readonly saveConfiguration = output<TournamentConfigurationDto>();
  // ==============================
}
