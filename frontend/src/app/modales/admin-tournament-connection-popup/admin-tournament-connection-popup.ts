import { DialogRef } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { resetTournament } from 'src/app/store/tournament/tournament.actions';
import { connectTournamentAdministrator } from 'src/app/store/tournament/tournament.admin.actions';
import {
  selectCurrentTournamentAdminInformations,
  selectCurrentTournamentData,
  selectCurrentTournamentError,
  selectCurrentTournamentIsLoading,
} from 'src/app/store/tournament/tournament.selectors';
import { Button } from '../../shared/button/button';
import { InputText } from '../../shared/input-text/input-text';
import { Icon } from 'src/app/shared/icon/icon';

@Component({
  selector: 'app-admin-tournament-connection-popup',
  standalone: true,
  imports: [Button, InputText, Icon],
  templateUrl: './admin-tournament-connection-popup.html',
  styleUrl: './admin-tournament-connection-popup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminTournamentConnectionPopupComponent {
  private readonly store = inject(Store);
  private readonly dialogRef = inject(DialogRef<{ tournamentCode: string; password: string }>);

  //------
  readonly tournamentCode = signal('');
  readonly password = signal('');
  //------
  readonly isUnknownTournament = signal(false);

  readonly canConnect = computed(
    () => this.tournamentCode().trim().length > 0 && this.password().trim().length > 0,
  );

  // Selectors for tournament state
  readonly tournamentData = this.store.selectSignal(selectCurrentTournamentData);
  readonly tournamentError = this.store.selectSignal(selectCurrentTournamentError);
  readonly tournamentLoading = this.store.selectSignal(selectCurrentTournamentIsLoading);
  readonly tournamentAdminInformations = this.store.selectSignal(
    selectCurrentTournamentAdminInformations,
  );

  constructor() {
    this.store.dispatch(resetTournament());
    this.isUnknownTournament.set(false);

    // Listen to tournament state changes
    effect(() => {
      const isLoading = this.tournamentLoading();
      const data = this.tournamentData();
      const error = this.tournamentError();
      const adminInformations = this.tournamentAdminInformations();

      // If tournament is loaded successfully
      if (!isLoading && !!data && !error && !!adminInformations) {
        this.dialogRef.close({
          tournamentCode: data.code,
          password: this.password(),
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

  onPasswordChange(value: string): void {
    this.password.set(value);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConnect(): void {
    if (this.canConnect()) {
      this.isUnknownTournament.set(false);
      this.store.dispatch(
        connectTournamentAdministrator({
          code: this.tournamentCode().trim(),
          password: this.password().trim(),
        }),
      );
    }
  }
}
