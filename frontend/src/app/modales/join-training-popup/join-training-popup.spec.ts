import { DialogModule, DialogRef } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { describe, expect, it, vi } from 'vitest';
import { joinTrainingSession } from 'src/app/store/training/training.actions';
import {
  selectTrainingParticipantCurrentMatch,
  selectTrainingParticipantCurrentMatchError,
  selectTrainingParticipantCurrentMatchIsLoading,
} from 'src/app/store/training/training.selectors';
import { JoinTrainingPopup } from './join-training-popup';

function setup() {
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
  it('creates the component', () => {
    const { fixture } = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('dispatches joinTrainingSession with the trimmed session code and participant code on join', () => {
    const { fixture, store } = setup();
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    fixture.componentInstance.onSessionCodeChange('  1234  ');
    fixture.componentInstance.onCodeChange('5678');
    fixture.componentInstance.onJoin();

    expect(dispatchSpy).toHaveBeenCalledWith(
      joinTrainingSession({ sessionCode: '1234', participantCode: '5678' }),
    );
  });

  it('does not dispatch when the participant code is incomplete', () => {
    const { fixture, store } = setup();
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    fixture.componentInstance.onSessionCodeChange('1234');
    fixture.componentInstance.onCodeChange('12');
    fixture.componentInstance.onJoin();

    expect(dispatchSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: joinTrainingSession.type }),
    );
  });

  it('closes the dialog with undefined on cancel', () => {
    const { fixture, dialogRef } = setup();

    fixture.componentInstance.onCancel();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
