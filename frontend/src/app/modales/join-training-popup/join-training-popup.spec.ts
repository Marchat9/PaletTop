import { DialogModule, DialogRef } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { describe, expect, it, vi } from 'vitest';
import { loadTrainingParticipantCurrentMatch } from 'src/app/store/training/training.actions';
import { TrainingParticipantSession } from 'src/app/store/training/training.models';
import {
  selectCurrentTrainingParticipantInformations,
  selectTrainingParticipantCurrentMatch,
  selectTrainingParticipantCurrentMatchError,
  selectTrainingParticipantCurrentMatchIsLoading,
} from 'src/app/store/training/training.selectors';
import { JoinTrainingPopup } from './join-training-popup';

function setup(savedCodes: TrainingParticipantSession | null = null) {
  const dialogRef = { close: vi.fn() } as unknown as DialogRef;

  TestBed.configureTestingModule({
    imports: [DialogModule, JoinTrainingPopup],
    providers: [
      { provide: DialogRef, useValue: dialogRef },
      provideMockStore({
        selectors: [
          { selector: selectTrainingParticipantCurrentMatch, value: null },
          { selector: selectTrainingParticipantCurrentMatchError, value: null },
          { selector: selectTrainingParticipantCurrentMatchIsLoading, value: false },
          { selector: selectCurrentTrainingParticipantInformations, value: savedCodes },
        ],
      }),
    ],
  });

  const fixture = TestBed.createComponent(JoinTrainingPopup);
  const store = TestBed.inject(MockStore);
  fixture.detectChanges();

  return { fixture, store, dialogRef };
}

describe('JoinTrainingPopup', () => {
  it('prefills the codes of the last session joined on this device', () => {
    const { fixture, store } = setup({ sessionCode: '1234', participantCode: '5678' });
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    const inputs = Array.from(
      fixture.nativeElement.querySelectorAll('input.code-input') as NodeListOf<HTMLInputElement>,
    ).map((input) => input.value);
    expect(inputs).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);

    fixture.componentInstance.onJoin();
    expect(dispatchSpy).toHaveBeenCalledWith(
      loadTrainingParticipantCurrentMatch({ sessionCode: '1234', participantCode: '5678' }),
    );
  });

  it('creates the component', () => {
    const { fixture } = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('dispatches loadTrainingParticipantCurrentMatch with the trimmed session code and participant code on join', () => {
    const { fixture, store } = setup();
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    fixture.componentInstance.onSessionCodeChange('  1234  ');
    fixture.componentInstance.onCodeChange('5678');
    fixture.componentInstance.onJoin();

    expect(dispatchSpy).toHaveBeenCalledWith(
      loadTrainingParticipantCurrentMatch({ sessionCode: '1234', participantCode: '5678' }),
    );
  });

  it('does not dispatch when the participant code is incomplete', () => {
    const { fixture, store } = setup();
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    fixture.componentInstance.onSessionCodeChange('1234');
    fixture.componentInstance.onCodeChange('12');
    fixture.componentInstance.onJoin();

    expect(dispatchSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: loadTrainingParticipantCurrentMatch.type }),
    );
  });

  it('closes the dialog with undefined on cancel', () => {
    const { fixture, dialogRef } = setup();

    fixture.componentInstance.onCancel();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
