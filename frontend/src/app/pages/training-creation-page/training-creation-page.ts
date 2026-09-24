import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Button } from 'src/app/shared/button/button';
import { Card } from 'src/app/shared/card/card';
import { Icon } from 'src/app/shared/icon/icon';
import { InputText } from 'src/app/shared/input-text/input-text';
import { createTraining } from 'src/app/store/training/training.actions';
import {
  selectTrainingCreationError,
  selectTrainingCreationIsLoading,
} from 'src/app/store/training/training.selectors';

@Component({
  selector: 'app-training-creation-page',
  imports: [Card, Button, Icon, InputText],
  templateUrl: './training-creation-page.html',
  styleUrl: './training-creation-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingCreationPage {
  private readonly router = inject(Router);
  private readonly store = inject(Store);

  public readonly isCreationLoading = this.store.selectSignal(selectTrainingCreationIsLoading);
  public readonly creationError = this.store.selectSignal(selectTrainingCreationError);

  public readonly code = signal('');
  public readonly name = signal('');
  public readonly club = signal('');
  public readonly adminPassword = signal('');
  public readonly userHasSubmitted = signal(false);

  public readonly canSubmit = computed(
    () =>
      this.code().trim().length > 0 &&
      this.name().trim().length > 0 &&
      this.adminPassword().trim().length > 0,
  );

  constructor() {
    effect(() => {
      const trainingCode = this.code().trim();
      if (
        this.userHasSubmitted() &&
        !this.isCreationLoading() &&
        !this.creationError() &&
        !!trainingCode
      ) {
        this.router.navigate([`/admin/training/${trainingCode}`]);
      }
    });
  }

  public onCodeChange(value: string): void {
    this.code.set(value.trimStart().toUpperCase());
  }

  public onNameChange(value: string): void {
    this.name.set(value);
  }

  public onClubChange(value: string): void {
    this.club.set(value);
  }

  public onAdminPasswordChange(value: string): void {
    this.adminPassword.set(value);
  }

  public submit(): void {
    if (!this.canSubmit()) {
      return;
    }

    this.userHasSubmitted.set(true);
    this.store.dispatch(
      createTraining({
        code: this.code().trim(),
        name: this.name().trim(),
        club: this.club().trim() || undefined,
        adminPassword: this.adminPassword().trim(),
      }),
    );
  }

  public cancel(): void {
    this.router.navigate(['/accueil']);
  }
}
