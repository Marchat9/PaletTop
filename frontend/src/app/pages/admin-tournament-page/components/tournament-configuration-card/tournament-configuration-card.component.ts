import {
  ScoreCalculationsByMode,
  DEFAULT_SCORE_CALCULATIONS_BY_MODE,
} from 'src/app/models/app-setting.model';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  viewChild,
} from '@angular/core';
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

/** A little more than the opening animation of `app-card-collapsible` (220 ms). */
const CARD_OPENING_MS = 260;

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

  private readonly card = viewChild.required(CardCollapsible);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  /**
   * Opens the card and brings the parameters specific to the mode (where the consolations are set) into view: the
   * launch check sends the admin here.
   */
  public reveal(): void {
    const card = this.card();
    // A folded card is 0 high until its opening animation ends: scrolling before would aim at
    // the wrong place (and the browser cancels a smooth scroll when the layout moves).
    const wasFolded = !card.isExpanded();
    card.isExpanded.set(true);
    afterNextRender(
      () =>
        setTimeout(
          () =>
            (
              this.host.nativeElement.querySelector('#tournament-mode-specific') ??
              this.host.nativeElement
            ).scrollIntoView({ behavior: 'smooth', block: 'start' }),
          wasFolded ? CARD_OPENING_MS : 0,
        ),
      { injector: this.injector },
    );
  }
}
