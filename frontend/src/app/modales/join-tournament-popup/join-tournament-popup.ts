import {
  Component,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  effect,
} from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';
import { Button } from '../../shared/button/button';
import { CodeNumberInputComponent } from '../../shared/code-number-input/code-number-input';
import { InputText } from '../../shared/input-text/input-text';
import { Icon } from 'src/app/shared/icon/icon';
import { Store } from '@ngrx/store';
import {
  selectCurrentTournament,
  selectCurrentTournamentData,
  selectCurrentTournamentError,
  selectCurrentTournamentIsLoading,
} from 'src/app/store/tournament/tournament.selectors';
import {
  loadTournamentInformation,
  resetTournament,
} from 'src/app/store/tournament/tournament.actions';

@Component({
  selector: 'app-join-tournament-popup',
  standalone: true,
  imports: [Button, CodeNumberInputComponent, InputText, Icon],
  templateUrl: './join-tournament-popup.html',
  styleUrl: './join-tournament-popup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JoinTournamentPopupComponent {
  private readonly store = inject(Store);
  private readonly dialogRef = inject(DialogRef<{ tournamentCode: string; teamCode: string }>);

  //------
  readonly tournamentCode = signal('');
  private readonly teamCode = signal('');
  //------
  readonly isUnknownTournament = signal(false);

  readonly isCodeComplete = computed(() => this.teamCode().length === 4);
  readonly canJoin = computed(
    () => this.tournamentCode().trim().length > 0 && this.isCodeComplete(),
  );

  // Selectors for tournament state
  readonly tournamentData = this.store.selectSignal(selectCurrentTournamentData);
  readonly tournamentError = this.store.selectSignal(selectCurrentTournamentError);
  readonly tournamentLoading = this.store.selectSignal(selectCurrentTournamentIsLoading);

  constructor() {
    this.store.dispatch(resetTournament());
    this.isUnknownTournament.set(false);

    // Listen to tournament state changes
    effect(() => {
      const isLoading = this.tournamentLoading();
      const data = this.tournamentData();
      const error = this.tournamentError();

      // If tournament is loaded successfully
      if (!isLoading && data && !error) {
        this.dialogRef.close({
          tournamentCode: data.code,
          teamCode: this.teamCode(),
        });
      }
      // If there's an error loading the tournament
      else if (!isLoading && error) {
        this.isUnknownTournament.set(true);
      }
    });
  }

  onTournamentCodeInput(value: string): void {
    this.tournamentCode.set(value.trimStart().toUpperCase());
  }

  onCodeChange(code: string): void {
    this.teamCode.set(code);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onJoin(): void {
    if (this.canJoin()) {
      this.isUnknownTournament.set(false);
      this.store.dispatch(
        loadTournamentInformation({
          tournamentCode: this.tournamentCode().trim(),
          teamCode: this.teamCode(),
        }),
      );
    }
  }
}
