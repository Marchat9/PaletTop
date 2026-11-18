import { ChangeDetectionStrategy, Component, computed, input, Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { environment } from '@environment';
import { InputNumber } from 'src/app/shared/input-number/input-number';
import { InputSelectOption } from 'src/app/shared/input-select/input-select';
import { TournamentConfigurationField } from '../../tournament-configuration-form.model';
import { isLastRoundByRankingAllowed } from '../../tournament-configuration.utils';
import * as configuration from '../../tournament-create.data';
import { UpDownTournamentForm } from './up-down-tournament-form.model';
import { Switch } from 'src/app/shared/switch/switch';
import { InputCardRadio } from 'src/app/shared/input-card-radio/input-card-radio';
import { PairingMode } from 'src/app/models/tournament-configuration-detail.model';
import { map, startWith, switchMap } from 'rxjs';

@Component({
  selector: 'app-up-down-tournament',
  imports: [ReactiveFormsModule, InputCardRadio, InputNumber, Switch],
  templateUrl: './up-down-tournament.html',
  styleUrls: ['../../shared-config.scss', './up-down-tournament.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpDownTournament {
  public readonly group = input.required<UpDownTournamentForm>();
  public readonly readonlyFields = input<TournamentConfigurationField[]>([]);
  public readonly hiddenFields = input<TournamentConfigurationField[]>([]);

  public readonly competitionModeOptions = configuration.competitionModeOptions;
  public readonly pairingModeOptions = configuration.pairingModeOptions;
  public readonly principalBracketSizeOptions: InputSelectOption[] = [
    { value: '', label: 'Automatique' },
    ...environment.tournamentConfiguration.principalBracketSize.options.map((v) => ({
      value: v.toString(),
      label: `${v} équipes`,
    })),
  ];
  public readonly numberOfQualifyingRoundsConfig =
    environment.tournamentConfiguration.numberOfQualifyingRounds;
  public readonly numberOfPoolsConfig = environment.tournamentConfiguration.numberOfPools;

  public readonly isLastRoundByRankingAllowed: Signal<boolean> = toSignal(
    toObservable(this.group).pipe(
      switchMap(({ controls: { numberOfRound } }) =>
        numberOfRound.valueChanges.pipe(startWith(numberOfRound.value)),
      ),
      map((numberOfRound) => isLastRoundByRankingAllowed(numberOfRound)),
    ),
    { initialValue: false },
  );

  private readonly pairingMode: Signal<PairingMode> = toSignal(
    toObservable(this.group).pipe(
      switchMap(({ controls: { pairingMode } }) =>
        pairingMode.valueChanges.pipe(startWith(pairingMode.value)),
      ),
    ),
    { initialValue: 'random' },
  );

  /** In Dutch mode, the ranking-based last round also avoids rematches. */
  public readonly lastRoundByRankingDescription = computed(() =>
    this.pairingMode() === 'dutch'
      ? "La dernière partie n'est pas tirée au sort : chaque équipe affronte son voisin de classement le plus proche qu'elle n'a pas encore rencontré. Si le nombre d'équipes est impair, le dernier du classement est exempté, sans point."
      : "La dernière partie n'est pas tirée au sort : chaque équipe affronte son voisin de classement (1er contre 2e, 3e contre 4e...). Si le nombre d'équipes est impair, le dernier du classement est exempté, sans point.",
  );
}
