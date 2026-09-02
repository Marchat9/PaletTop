import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  OnInit,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { environment } from '@environment';
import { Nullable } from 'src/app/models/nullable.model';
import {
  ChampionShipTournamentConfig,
  StructuredTournamentConfig,
  UpDownTournamentConfig,
} from 'src/app/models/tournament-configuration-detail.model';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';
import {
  TournamentConfigurationField,
  TournamentConfigurationForm,
} from './tournament-configuration-form.model';
import { getInvalidFieldNames } from './tournament-configuration.utils';
import { TournamentModeParameter } from './tournament-mode-parameter/tournament-mode-parameter';
import { TournamentParameters } from './tournament-parameters/tournament-parameters';
import { TournamentRules } from './tournament-rules/tournament-rules';

export const FIELD_LABELS: Record<string, string> = {
  'parameters.name': 'Nom du tournoi',
  'parameters.code': 'Code Unique',
  'parameters.adminPassword': 'Mot de passe administrateur',
  'parameters.date': "Date de l'événement",
  'rules.maxTeamCapacity': 'Capacité Maximale',
  'rules.scoreCalculation': 'Calcul des scores',
  'rules.pointsPerGame': 'Points par partie',
  'modeParameter.competitionMode': 'Mode de compétition',
  'modeParameter.championshipMode.homeTeam': 'Équipe à domicile',
  'modeParameter.championshipMode.awayTeam': 'Équipe exterieur',
};

@Component({
  selector: 'app-tournament-configuration',
  imports: [ReactiveFormsModule, TournamentParameters, TournamentRules, TournamentModeParameter],
  templateUrl: './tournament-configuration.html',
  styleUrl: './tournament-configuration.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TournamentConfiguration implements OnInit {
  public readonly tournament = input<Nullable<TournamentDto>>(null);
  public readonly columns = input<number>(1);
  public readonly readonlyFields = input<TournamentConfigurationField[]>([]);
  public readonly hiddenFields = input<TournamentConfigurationField[]>([]);

  public readonly formReady = output<TournamentConfigurationForm>({ alias: 'form' });
  public readonly invalidFields = output<string[] | null>();
  public form!: TournamentConfigurationForm;

  private readonly teamCapacity = environment.tournamentConfiguration.maxTeamCapacity;

  private readonly injector = inject(Injector);

  ngOnInit(): void {
    const tournament = this.tournament();

    const structuredConfig: StructuredTournamentConfig =
      (tournament?.configuration.competitionConfiguration as StructuredTournamentConfig) ?? {};
    const upDownConfig: UpDownTournamentConfig =
      (tournament?.configuration.competitionConfiguration as UpDownTournamentConfig) ?? {};
    const championShipConfig: ChampionShipTournamentConfig =
      (tournament?.configuration.competitionConfiguration as ChampionShipTournamentConfig) ?? {};

    this.form = new FormGroup({
      parameters: new FormGroup({
        name: new FormControl(tournament?.name ?? '', {
          nonNullable: true,
          validators: [Validators.required],
        }),
        code: new FormControl(tournament?.code ?? '', {
          nonNullable: true,
          validators: [Validators.required],
        }),
        adminPassword: new FormControl('', {
          nonNullable: true,
          validators: this.hiddenFields().includes('adminPassword') ? [] : [Validators.required],
        }),
        date: new FormControl(tournament?.date ?? new Date(), {
          nonNullable: true,
          validators: [Validators.required, Validators.nullValidator],
        }),
        description: new FormControl(tournament?.description ?? '', { nonNullable: false }),
      }),

      rules: new FormGroup({
        maxTeamCapacity: new FormControl(
          tournament?.configuration?.maxTeamCapacity ?? this.teamCapacity.max,
          {
            nonNullable: true,
            validators: [Validators.required, Validators.min(2)],
          },
        ),
        scoreCalculation: new FormControl(
          tournament?.configuration?.scoreCalculation ?? 'victory_ga',
          { nonNullable: true, validators: [Validators.required] },
        ),
        pointsPerGame: new FormControl(tournament?.configuration?.pointsPerGame ?? 13, {
          nonNullable: true,
          validators: [Validators.required, Validators.min(0)],
        }),
        rematch: new FormControl(tournament?.configuration?.rematch ?? false, {
          nonNullable: true,
        }),
        matchAgainstFullSameClub: new FormControl(
          tournament?.configuration?.matchAgainstFullSameClub ?? false,
          {
            nonNullable: true,
          },
        ),
        matchAgainstPartialSameClub: new FormControl(
          tournament?.configuration?.matchAgainstPartialSameClub ?? false,
          {
            nonNullable: true,
          },
        ),
      }),

      modeParameter: new FormGroup({
        competitionMode: new FormControl(tournament?.configuration.competitionMode ?? 'standard', {
          nonNullable: true,
          validators: [Validators.required],
        }),
        structuredMode: new FormGroup({
          hasConsolanteTable: new FormControl(structuredConfig.hasConsolanteTable ?? false, {
            nonNullable: true,
          }),
          hasChallengePrincipaleTable: new FormControl(
            structuredConfig.hasChallengePrincipaleTable ?? false,
            { nonNullable: true },
          ),
          hasChallengeConsolanteTable: new FormControl(
            structuredConfig.hasChallengeConsolanteTable ?? false,
            { nonNullable: true },
          ),
          hasThirdPlaceMatch: new FormControl(structuredConfig.hasThirdPlaceMatch ?? false, {
            nonNullable: true,
          }),
          principalBracketSize: new FormControl(
            structuredConfig.principalBracketSize ?? undefined,
            { nonNullable: true },
          ),
          numberOfQualifyingRounds: new FormControl(
            structuredConfig.numberOfQualifyingRounds ?? 4,
            { nonNullable: true },
          ),
          numberOfPools: new FormControl(structuredConfig.numberOfPools ?? undefined, {
            nonNullable: true,
          }),
        }),
        upDownMode: new FormGroup({
          numberOfRound: new FormControl(upDownConfig.numberOfRound ?? undefined, {
            nonNullable: true,
          }),
        }),
        championshipMode: new FormGroup({
          homeTeam: new FormControl(championShipConfig.homeClub ?? undefined, {
            nonNullable: true,
            validators: [Validators.required],
          }),
          awayTeam: new FormControl(championShipConfig.awayClub ?? undefined, {
            nonNullable: true,
            validators: [Validators.required],
          }),
        }),
      }),
    });

    // Signals
    const formValues = toSignal(this.form.valueChanges, { injector: this.injector });
    const competitionMode = toSignal(
      this.form.controls.modeParameter.controls.competitionMode.valueChanges,
      { injector: this.injector },
    );

    // effect to agregate fields in error state
    effect(
      () => {
        formValues();
        const fields = getInvalidFieldNames(this.form);
        this.invalidFields.emit(fields.length ? fields : null);
      },
      { injector: this.injector },
    );

    // effect to change maxTeamCapacity on competitionMode changes
    effect(
      () => {
        const mode = competitionMode();
        if (mode === undefined) {
          return;
        }

        this.form.controls.rules.controls.maxTeamCapacity.setValue(
          mode === 'championship' ? this.teamCapacity.maxChampionship : this.teamCapacity.max,
        );
      },
      { injector: this.injector },
    );

    this.formReady.emit(this.form);
  }
}
