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
import { Button } from '../../shared/button/button';
import { InputText } from '../../shared/input-text/input-text';
import { Icon } from 'src/app/shared/icon/icon';
import {
  selectSpectatorTournamentData,
  selectSpectatorTournamentError,
  selectSpectatorTournamentIsLoading,
} from 'src/app/store/spectator/spectator.selectors';
import { loadSpectatorTournament, resetSpectator } from 'src/app/store/spectator/spectator.actions';

@Component({
  selector: 'app-spectate-tournament-popup',
  standalone: true,
  imports: [Button, InputText, Icon],
  templateUrl: './spectate-tournament-popup.html',
  styleUrl: './spectate-tournament-popup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpectateTournamentPopupComponent {
  private readonly store = inject(Store);
  private readonly dialogRef = inject(DialogRef<{ tournamentCode: string }>);

  readonly tournamentCode = signal('');
  readonly isUnknownTournament = signal(false);

  readonly canJoin = computed(() => this.tournamentCode().trim().length > 0);

  readonly tournamentData = this.store.selectSignal(selectSpectatorTournamentData);
  readonly tournamentError = this.store.selectSignal(selectSpectatorTournamentError);
  readonly tournamentLoading = this.store.selectSignal(selectSpectatorTournamentIsLoading);

  constructor() {
    this.store.dispatch(resetSpectator());
    this.isUnknownTournament.set(false);

    effect(() => {
      const isLoading = this.tournamentLoading();
      const data = this.tournamentData();
      const error = this.tournamentError();

      if (!isLoading && data && !error) {
        this.dialogRef.close({ tournamentCode: data.code });
      } else if (!isLoading && error) {
        this.isUnknownTournament.set(true);
      }
    });
  }

  onTournamentCodeInput(value: string): void {
    this.tournamentCode.set(value.trimStart().toUpperCase());
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onJoin(): void {
    if (this.canJoin()) {
      this.isUnknownTournament.set(false);
      this.store.dispatch(
        loadSpectatorTournament({ tournamentCode: this.tournamentCode().trim() }),
      );
    }
  }
}
