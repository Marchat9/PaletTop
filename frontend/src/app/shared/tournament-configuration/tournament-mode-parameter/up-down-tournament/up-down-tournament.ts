import { ChangeDetectionStrategy, Component, computed, input, Signal } from '@angular/core';
import { PairingMode } from 'src/app/models/tournament-configuration-detail.model';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { InputNumber } from 'src/app/shared/input-number/input-number';
import { TournamentConfigurationField } from '../../tournament-configuration-form.model';
import { isLastRoundByRankingAllowed, withRecommended } from '../../tournament-configuration.utils';
import * as configuration from '../../tournament-create.data';
import { UpDownTournamentForm } from './up-down-tournament-form.model';
import { Switch } from 'src/app/shared/switch/switch';
import { InputCardRadio } from 'src/app/shared/input-card-radio/input-card-radio';
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
  /** Pairing mode badged « Recommandé »; none when null. */
  public readonly recommendedPairingMode = input<PairingMode | null>(null);

  public readonly competitionModeOptions = configuration.competitionModeOptions;
  public readonly pairingModeOptions = computed(() =>
    withRecommended(configuration.pairingModeOptions, this.recommendedPairingMode()),
  );

  public readonly isLastRoundByRankingAllowed: Signal<boolean> = toSignal(
    toObservable(this.group).pipe(
      switchMap(({ controls: { numberOfRound } }) =>
        numberOfRound.valueChanges.pipe(startWith(numberOfRound.value)),
      ),
      map((numberOfRound) => isLastRoundByRankingAllowed(numberOfRound)),
    ),
    { initialValue: false },
  );
}
