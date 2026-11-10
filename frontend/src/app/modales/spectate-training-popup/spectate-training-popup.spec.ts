import { DialogRef } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { describe, expect, it, vi } from 'vitest';
import { loadTrainingSessionPublic } from 'src/app/store/training/training.session.actions';
import {
  selectCurrentTrainingSessionData,
  selectCurrentTrainingSessionError,
  selectCurrentTrainingSessionIsLoading,
} from 'src/app/store/training/training.selectors';
import { SpectateTrainingPopup } from './spectate-training-popup';

function setup() {
  const dialogRef = { close: vi.fn() };
  TestBed.configureTestingModule({
    imports: [SpectateTrainingPopup],
    providers: [
      { provide: DialogRef, useValue: dialogRef },
      provideMockStore({
        selectors: [
          { selector: selectCurrentTrainingSessionData, value: null },
          { selector: selectCurrentTrainingSessionError, value: null },
          { selector: selectCurrentTrainingSessionIsLoading, value: false },
        ],
      }),
    ],
  });
  const fixture = TestBed.createComponent(SpectateTrainingPopup);
  const store = TestBed.inject(MockStore);
  const dispatchSpy = vi.spyOn(store, 'dispatch');
  fixture.detectChanges();
  return { fixture, store, dispatchSpy, dialogRef };
}

describe('SpectateTrainingPopup', () => {
  it('demande un code à 6 chiffres : un ancien code à 4 chiffres ne suffit pas', () => {
    const { fixture, dispatchSpy } = setup();
    const popup = fixture.componentInstance;

    popup.onSessionCodeChange('1234');
    popup.onJoin();
    expect(popup.canJoin()).toBe(false);
    expect(dispatchSpy).not.toHaveBeenCalled();

    popup.onSessionCodeChange('123456');
    popup.onJoin();
    expect(dispatchSpy).toHaveBeenCalledWith(loadTrainingSessionPublic({ sessionCode: '123456' }));
  });

  it('se ferme avec le code une fois la séance trouvée', () => {
    const { fixture, store, dialogRef } = setup();
    fixture.componentInstance.onSessionCodeChange('123456');
    fixture.componentInstance.onJoin();

    store.overrideSelector(selectCurrentTrainingSessionData, { code: '123456' } as never);
    store.refreshState();
    fixture.detectChanges();

    expect(dialogRef.close).toHaveBeenCalledWith({ sessionCode: '123456' });
  });

  it('ne se ferme pas sur une autre séance restée dans le store', () => {
    const { fixture, store, dialogRef } = setup();
    store.overrideSelector(selectCurrentTrainingSessionData, { code: '999999' } as never);
    store.refreshState();

    fixture.componentInstance.onSessionCodeChange('123456');
    fixture.componentInstance.onJoin();
    fixture.detectChanges();

    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('signale une séance introuvable', () => {
    const { fixture, store } = setup();
    fixture.componentInstance.onSessionCodeChange('123456');
    fixture.componentInstance.onJoin();

    store.overrideSelector(selectCurrentTrainingSessionError, 'Session introuvable');
    store.refreshState();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Séance introuvable');
  });
});
