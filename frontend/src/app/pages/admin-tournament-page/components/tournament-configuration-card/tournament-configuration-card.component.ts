import {
  ScoreCalculationsByMode,
  DEFAULT_SCORE_CALCULATIONS_BY_MODE,
} from 'src/app/models/app-setting.model';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Nullable } from 'src/app/models/nullable.model';
import { CardCollapsible } from 'src/app/shared/card-collapsible/card-collapsible';
import { Icon } from 'src/app/shared/icon/icon';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';
import { ConfigurationFormComponent } from './configuration-form/configuration-form.component';
import {
  TournamentConfigurationField,
  TournamentConfigurationForm,
} from 'src/app/shared/tournament-configuration/tournament-configuration-form.model';
import { BracketPanelState, PlanSimulationState } from 'src/app/models/tournament-plan.model';
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
  public readonly scoreCalculationsByMode = input<ScoreCalculationsByMode>(
    DEFAULT_SCORE_CALCULATIONS_BY_MODE,
  );

  /** Preview of the brackets of a draft; no panel when null. */
  public readonly planState = input<Nullable<BracketPanelState>>(null);
  /** Simulation of other team counts for a draft; none when null. */
  public readonly simulation = input<Nullable<PlanSimulationState>>(null);

  public readonly saveConfiguration = output<TournamentConfigurationDto>();
  public readonly simulationTeamCountChange = output<number>();
  public readonly simulationSheetRequested = output<number>();
  /** The form is built: the page watches it to run the live preview. */
  public readonly formReady = output<TournamentConfigurationForm>();
  // ==============================
}
