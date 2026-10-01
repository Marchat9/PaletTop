import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { describe, expect, it, vi } from 'vitest';
import { createTraining } from 'src/app/store/training/training.actions';
import {
  selectTrainingCreationError,
  selectTrainingCreationIsLoading,
} from 'src/app/store/training/training.selectors';
import { TrainingCreationPage } from './training-creation-page';

function setup() {
  const routerMock = { navigate: vi.fn() };

  TestBed.configureTestingModule({
    imports: [TrainingCreationPage],
    providers: [
      { provide: Router, useValue: routerMock },
      provideMockStore({
        selectors: [
          { selector: selectTrainingCreationIsLoading, value: false },
          { selector: selectTrainingCreationError, value: null },
        ],
      }),
    ],
  });

  const fixture = TestBed.createComponent(TrainingCreationPage);
  const store = TestBed.inject(MockStore);
  fixture.detectChanges();

  return { fixture, store, routerMock };
}

describe('TrainingCreationPage', () => {
  it('creates the component', () => {
    const { fixture } = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('dispatches createTraining with the trimmed field values on submit', () => {
    const { fixture, store } = setup();
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    fixture.componentInstance.onCodeChange('  LAITON-2026  ');
    fixture.componentInstance.onNameChange('  Entraînement du jeudi  ');
    fixture.componentInstance.onDescriptionChange('  ASPTT  ');
    fixture.componentInstance.onAdminPasswordChange('  secret  ');
    fixture.componentInstance.submit();

    expect(dispatchSpy).toHaveBeenCalledWith(
      createTraining({
        code: 'LAITON-2026',
        name: 'Entraînement du jeudi',
        description: 'ASPTT',
        adminPassword: 'secret',
      }),
    );
  });

  it('does not dispatch when required fields are missing', () => {
    const { fixture, store } = setup();
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    fixture.componentInstance.submit();

    expect(dispatchSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: createTraining.type }),
    );
  });
});
